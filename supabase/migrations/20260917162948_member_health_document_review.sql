-- Member-owned document review, with atomic approval and non-destructive reconciliation.
drop policy if exists "Owners manage own health document extractions" on public.beast_health_document_extractions;
create policy "Owners manage own health document extractions" on public.beast_health_document_extractions for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id and exists (select 1 from public.beast_documents d where d.id = document_id and d.owner_id = (select auth.uid()) and d.category = 'Health'));
drop policy if exists "Owners manage own health document extraction items" on public.beast_health_document_extraction_items;
create policy "Owners manage own health document extraction items" on public.beast_health_document_extraction_items for all to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id and exists (select 1 from public.beast_health_document_extractions e where e.id = extraction_id and e.owner_id = (select auth.uid())));
revoke all on public.beast_health_document_extractions, public.beast_health_document_extraction_items from anon;
grant select,insert,update,delete on public.beast_health_document_extractions,public.beast_health_document_extraction_items to authenticated;

create or replace function public.review_beast_health_document_item(
  requested_item_id uuid, record_title text, record_status text, assertion_type text,
  target_record_id uuid default null, expected_updated_at timestamptz default null, event_date date default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare
  proposed public.beast_health_document_extraction_items%rowtype;
  extraction public.beast_health_document_extractions%rowtype;
  source_document public.beast_documents%rowtype;
  existing public.beast_health_records%rowtype;
  target_kind text;
  saved_id uuid;
  incoming jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if record_title is null or length(btrim(record_title)) not between 1 and 160 then raise exception 'Confirm an individual record name'; end if;
  if record_status is null or record_status not in ('active','historical','planned') then raise exception 'Confirm current or historical status'; end if;
  if assertion_type is null or assertion_type not in ('documented','claimed','member_reported','uncertain') then raise exception 'Confirm evidence type'; end if;
  -- Serialize approvals for an owner, preventing concurrent exact-name duplicate creations.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 204));
  select * into proposed from public.beast_health_document_extraction_items
    where id=requested_item_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Proposal not found'; end if;
  if proposed.status='approved' and proposed.approved_record_id is not null then return proposed.approved_record_id; end if;
  if proposed.status <> 'pending' then raise exception 'Only pending items can be approved'; end if;
  select * into extraction from public.beast_health_document_extractions where id=proposed.extraction_id and owner_id=auth.uid() and status='ready';
  if not found then raise exception 'Ready extraction not found'; end if;
  select * into source_document from public.beast_documents where id=extraction.document_id and owner_id=auth.uid() and category='Health' and status not in ('Archived','Deleted');
  if not found then raise exception 'Source document unavailable'; end if;
  target_kind := case proposed.category when 'diagnosis' then 'condition' when 'condition' then 'condition'
    when 'medication' then 'medication' when 'procedure' then 'procedure' when 'provider' then 'provider'
    when 'appointment' then 'appointment' when 'lab_value' then 'vital' when 'vaccination' then 'procedure'
    when 'facility' then 'provider' else 'profile' end;
  if proposed.category='vaccination' and event_date > current_date and record_status='historical' then raise exception 'A received vaccination date cannot be in the future'; end if;
  incoming := jsonb_build_object('context',proposed.value,'extraction_category',proposed.category,
    'extraction_id',extraction.id,'extraction_item_id',proposed.id,'beast_document_id',source_document.id,
    'source_excerpt',proposed.source_excerpt,'assertion_type',assertion_type,'owner_approved',true);
  if proposed.category='vaccination' then
    incoming := incoming || jsonb_build_object('subtype','vaccination','vaccinationName',btrim(record_title),'receivedOn',case when record_status='historical' then event_date else null end,'administrationStatus',case when record_status='historical' then 'received' when record_status='planned' then 'planned' else 'unknown' end);
  end if;
  if target_record_id is not null then
    select * into existing from public.beast_health_records where id=target_record_id and owner_id=auth.uid() and record_type=target_kind and status <> 'archived' for update;
    if not found then raise exception 'Matching record not found'; end if;
    if expected_updated_at is null or existing.updated_at <> expected_updated_at then raise exception 'Record changed; reload before reviewing'; end if;
    -- Keep existing information. Append this document as additional, explicitly typed evidence.
    update public.beast_health_records set
      details = incoming || coalesce((select jsonb_object_agg(key,value) from jsonb_each(existing.details) where value <> 'null'::jsonb and value <> '""'::jsonb),'{}'::jsonb) || jsonb_build_object(
        'document_context',proposed.value,'document_assertion_type',assertion_type,
        'document_source_excerpt',proposed.source_excerpt,
        'document_evidence_ids',concat_ws(',',nullif(existing.details->>'document_evidence_ids',''),source_document.id::text)),
      occurred_on=coalesce(existing.occurred_on,event_date),
      source=coalesce(nullif(existing.source,''),source_document.title),updated_at=clock_timestamp()
      where id=existing.id and owner_id=auth.uid() returning id into saved_id;
  else
    if exists(select 1 from public.beast_health_records where owner_id=auth.uid() and record_type=target_kind and status <> 'archived' and lower(btrim(title))=lower(btrim(record_title))) then
      raise exception 'A record with this name exists. Reload and attach this evidence to it.';
    end if;
    insert into public.beast_health_records(owner_id,record_type,title,status,occurred_on,source,details,notes)
      values(auth.uid(),target_kind,btrim(record_title),record_status,event_date,source_document.title,incoming,'Member reviewed document evidence; assertion type is recorded separately.') returning id into saved_id;
  end if;
  update public.beast_health_document_extraction_items set status='approved',approved_record_id=saved_id,reviewed_at=now() where id=proposed.id and owner_id=auth.uid();
  return saved_id;
end; $$;
revoke all on function public.review_beast_health_document_item(uuid,text,text,text,uuid,timestamptz,date) from public,anon;
grant execute on function public.review_beast_health_document_item(uuid,text,text,text,uuid,timestamptz,date) to authenticated;
-- Stale clients must use the new review contract instead of silently making every medication active.
create or replace function public.approve_beast_health_document_extraction_item(requested_item_id uuid)
returns uuid language plpgsql security invoker set search_path=public as $$
begin raise exception 'Refresh BeastHealth to review the record name, status and evidence type before approving.'; end; $$;
