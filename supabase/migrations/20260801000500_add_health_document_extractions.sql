-- BH-204: owner-reviewed, idempotent medical document extraction.
-- Extraction proposals are not BeastHealth records until the owner explicitly approves them.

create table if not exists public.beast_health_document_extractions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.beast_documents(id) on delete cascade,
  content_fingerprint text not null check (content_fingerprint ~ '^[a-f0-9]{64}$'),
  extraction_version text not null,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  summary text check (summary is null or length(summary) <= 1000),
  error_message text check (error_message is null or length(error_message) <= 500),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (owner_id, document_id, content_fingerprint, extraction_version)
);

create index if not exists beast_health_document_extractions_owner_document_idx
  on public.beast_health_document_extractions (owner_id, document_id, created_at desc);

create table if not exists public.beast_health_document_extraction_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  extraction_id uuid not null references public.beast_health_document_extractions(id) on delete cascade,
  category text not null check (category in (
    'diagnosis', 'condition', 'medication', 'procedure', 'provider',
    'appointment', 'lab_value', 'allergy', 'vaccination', 'instruction',
    'date', 'facility'
  )),
  label text not null check (length(trim(label)) between 1 and 200),
  value text not null check (length(trim(value)) between 1 and 2000),
  occurred_on date,
  source_excerpt text check (source_excerpt is null or length(source_excerpt) <= 1000),
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_record_id uuid references public.beast_health_records(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists beast_health_document_extraction_items_review_idx
  on public.beast_health_document_extraction_items (owner_id, extraction_id, status, created_at);

alter table public.beast_health_document_extractions enable row level security;
alter table public.beast_health_document_extraction_items enable row level security;

drop policy if exists "Owners manage own health document extractions"
  on public.beast_health_document_extractions;
create policy "Owners manage own health document extractions"
  on public.beast_health_document_extractions
  for all to authenticated
  using (
    auth.uid() = owner_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    auth.uid() = owner_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Owners manage own health document extraction items"
  on public.beast_health_document_extraction_items;
create policy "Owners manage own health document extraction items"
  on public.beast_health_document_extraction_items
  for all to authenticated
  using (
    auth.uid() = owner_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    auth.uid() = owner_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create or replace function public.approve_beast_health_document_extraction_item(
  requested_item_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  proposed public.beast_health_document_extraction_items%rowtype;
  extraction public.beast_health_document_extractions%rowtype;
  source_document public.beast_documents%rowtype;
  document_record_id uuid;
  health_record_id uuid;
  target_kind text;
  existing_related_ids text;
  related_provider_id uuid;
  related_condition_id uuid;
begin
  select * into proposed
  from public.beast_health_document_extraction_items
  where id = requested_item_id and owner_id = auth.uid()
  for update;

  if not found then raise exception 'Extraction proposal not found'; end if;
  if proposed.status = 'approved' and proposed.approved_record_id is not null then
    return proposed.approved_record_id;
  end if;
  if proposed.status <> 'pending' then raise exception 'Only pending proposals can be approved'; end if;

  select * into extraction from public.beast_health_document_extractions
  where id = proposed.extraction_id and owner_id = auth.uid() and status = 'ready';
  if not found then raise exception 'Ready extraction not found'; end if;

  select * into source_document from public.beast_documents
  where id = extraction.document_id and owner_id = auth.uid() and category = 'Health';
  if not found then raise exception 'Health document not found'; end if;

  select id into document_record_id from public.beast_health_records
  where owner_id = auth.uid()
    and record_type = 'document'
    and details ->> 'beast_document_id' = source_document.id::text
  order by created_at asc limit 1;

  if document_record_id is null then
    insert into public.beast_health_records (
      owner_id, record_type, title, status, source, details, notes
    ) values (
      auth.uid(), 'document', source_document.title, 'active',
      source_document.file_name,
      jsonb_build_object(
        'beast_document_id', source_document.id,
        'storage_path', source_document.storage_path,
        'extraction_id', extraction.id,
        'owner_approved', true
      ),
      'Owner-approved source document reference.'
    ) returning id into document_record_id;
  end if;

  target_kind := case proposed.category
    when 'diagnosis' then 'condition' when 'condition' then 'condition'
    when 'medication' then 'medication' when 'procedure' then 'procedure'
    when 'provider' then 'provider' when 'appointment' then 'appointment'
    when 'lab_value' then 'vital' when 'vaccination' then 'procedure'
    when 'facility' then 'provider' else 'profile' end;

  select
    string_agg(items.approved_record_id::text, ',' order by items.created_at),
    (max(items.approved_record_id::text) filter (where records.record_type = 'provider'))::uuid,
    (max(items.approved_record_id::text) filter (where records.record_type = 'condition'))::uuid
  into existing_related_ids, related_provider_id, related_condition_id
  from public.beast_health_document_extraction_items items
  left join public.beast_health_records records on records.id = items.approved_record_id
  where items.extraction_id = extraction.id
    and items.owner_id = auth.uid()
    and items.status = 'approved';

  insert into public.beast_health_records (
    owner_id, record_type, title, status, occurred_on, source, details, notes
  ) values (
    auth.uid(), target_kind, proposed.label,
    case when target_kind = 'appointment' and proposed.occurred_on >= current_date
      then 'planned' else 'active' end,
    proposed.occurred_on,
    source_document.title,
    jsonb_build_object(
      'context', proposed.value,
      'extraction_category', proposed.category,
      'extraction_id', extraction.id,
      'extraction_item_id', proposed.id,
      'linked_document_id', document_record_id,
      'document_id', document_record_id,
      'beast_document_id', source_document.id,
      'related_record_ids', existing_related_ids,
      'provider_id', related_provider_id,
      'condition_id', related_condition_id,
      'source_excerpt', proposed.source_excerpt,
      'confidence', proposed.confidence,
      'owner_approved', true
    ),
    'Created only after owner approval of a document extraction proposal.'
  ) returning id into health_record_id;

  update public.beast_health_records records
  set details = records.details
    || jsonb_build_object(
      'related_record_ids', concat_ws(',', nullif(records.details ->> 'related_record_ids', ''), health_record_id::text)
    )
    || case when target_kind = 'provider'
      then jsonb_build_object('provider_id', health_record_id) else '{}'::jsonb end
    || case when target_kind = 'condition'
      then jsonb_build_object('condition_id', health_record_id) else '{}'::jsonb end
  where records.owner_id = auth.uid()
    and records.id in (
      select approved_record_id
      from public.beast_health_document_extraction_items
      where extraction_id = extraction.id
        and owner_id = auth.uid()
        and status = 'approved'
        and approved_record_id is not null
    );

  update public.beast_health_document_extraction_items
  set status = 'approved', approved_record_id = health_record_id, reviewed_at = now()
  where id = proposed.id and owner_id = auth.uid();

  return health_record_id;
end;
$$;

revoke all on function public.approve_beast_health_document_extraction_item(uuid)
  from public, anon;
grant execute on function public.approve_beast_health_document_extraction_item(uuid)
  to authenticated;

comment on table public.beast_health_document_extractions is
  'Owner-only remembered extraction runs. A content fingerprint and extraction version prevent duplicate processing.';
comment on table public.beast_health_document_extraction_items is
  'Review proposals only. Rows do not become permanent BeastHealth records without explicit owner approval.';
comment on function public.approve_beast_health_document_extraction_item(uuid) is
  'Atomically creates linked BeastHealth document and structured records from one owner-approved proposal.';
