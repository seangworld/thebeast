begin;

-- Generic private preparation metadata only. No identities, seeds, schedules or grants to publish.
create table public.beast_marketing_agency_workstreams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  presenter_profile_id uuid not null,
  campaign_id uuid not null unique,
  video_series_id uuid unique,
  mode text not null default 'review_only' check (mode = 'review_only'),
  created_at timestamptz not null default now(),
  unique (id, presenter_profile_id, campaign_id, owner_id),
  foreign key (presenter_profile_id, owner_id) references public.beast_marketing_presenter_profiles(id, owner_id) on delete restrict,
  foreign key (campaign_id, owner_id) references public.beast_marketing_campaigns(id, owner_id) on delete restrict,
  foreign key (video_series_id, owner_id) references public.beast_marketing_video_series(id, owner_id) on delete restrict
);
alter table public.beast_marketing_agency_workstreams enable row level security;
create policy "Agency workstreams are private to their admin owner" on public.beast_marketing_agency_workstreams
for select to authenticated using (owner_id = (select auth.uid()) and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
revoke all on public.beast_marketing_agency_workstreams from public, anon, authenticated, service_role;
grant select on public.beast_marketing_agency_workstreams to authenticated, service_role;

alter table public.beast_marketing_agency_bindings
  add constraint beast_marketing_agency_binding_plan_identity unique (owner_id, presenter_profile_id, channel, connection_id);
alter table public.beast_marketing_distribution_plans
  add column agency_workstream_id uuid,
  add column agency_presenter_profile_id uuid,
  add column agency_channel text,
  add column agency_connection_id uuid,
  add constraint beast_marketing_agency_plan_identity check (
    (agency_workstream_id is null and agency_presenter_profile_id is null and agency_channel is null and agency_connection_id is null)
    or (agency_workstream_id is not null and agency_presenter_profile_id is not null and agency_channel in ('instagram', 'facebook_page', 'x'))
  ),
  add constraint beast_marketing_agency_plan_workstream foreign key (agency_workstream_id, agency_presenter_profile_id, campaign_id, owner_id)
    references public.beast_marketing_agency_workstreams(id, presenter_profile_id, campaign_id, owner_id) on delete restrict,
  add constraint beast_marketing_agency_plan_account foreign key (owner_id, agency_presenter_profile_id, agency_channel, agency_connection_id)
    references public.beast_marketing_agency_bindings(owner_id, presenter_profile_id, channel, connection_id) on delete restrict;
-- A canonical calendar slot for an exact creative revision has one stable row, including retries.
create unique index beast_marketing_agency_plan_retry_identity on public.beast_marketing_distribution_plans
  (agency_workstream_id, variant_id, variant_revision, variant_revision_hash, agency_channel, planned_for)
  where agency_workstream_id is not null;

create function public.link_beast_marketing_agency_workstream(selected_presenter_id uuid, selected_campaign_id uuid, selected_series_id uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  existing public.beast_marketing_agency_workstreams%rowtype;
begin
  if actor is null or not exists (select 1 from public.profiles where id = actor and role = 'admin') then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  -- Serialize link retries for this owner; all relationships remain immutable after creation.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('agency-workstream:' || actor::text, 0));
  select * into existing from public.beast_marketing_agency_workstreams where campaign_id = selected_campaign_id;
  if found then
    if existing.owner_id <> actor or existing.presenter_profile_id <> selected_presenter_id or existing.video_series_id is distinct from selected_series_id then
      raise exception 'Campaign already belongs to a different private workstream';
    end if;
    return to_jsonb(existing);
  end if;
  perform 1 from public.beast_marketing_presenter_profiles
    where id = selected_presenter_id and owner_id = actor and presenter_type = 'future_character' and active = false for update;
  if not found then raise exception 'An inactive owned character is required'; end if;
  perform 1 from public.beast_marketing_campaigns where id = selected_campaign_id and owner_id = actor and status = 'draft' for update;
  if not found then raise exception 'An owned preparation campaign is required'; end if;
  if exists (select 1 from public.beast_marketing_ad_variants where campaign_id = selected_campaign_id)
    or exists (select 1 from public.beast_marketing_distribution_plans where campaign_id = selected_campaign_id)
    or exists (select 1 from public.beast_marketing_assets where campaign_id = selected_campaign_id)
    or exists (select 1 from public.beast_marketing_outcomes where campaign_id = selected_campaign_id)
    or exists (select 1 from public.beast_marketing_recommendations where campaign_id = selected_campaign_id)
    or exists (select 1 from public.beast_marketing_decisions where entity_id = selected_campaign_id and entity_type = 'campaign')
    or exists (select 1 from public.beast_marketing_social_posts where lower(content->>'campaignId') = selected_campaign_id::text)
    or exists (select 1 from public.beast_marketing_growth_runs where owner_id = actor and status = 'running')
    or exists (select 1 from public.beast_marketing_video_jobs where presenter_profile_id = selected_presenter_id) then
    raise exception 'Use an unused draft campaign and character without video jobs while the growth cycle is idle';
  end if;
  if selected_series_id is not null then
    perform 1 from public.beast_marketing_video_series where id = selected_series_id and owner_id = actor and enabled = false and jsonb_typeof(settings) = 'object' for update;
    if not found then raise exception 'An owned disabled series is required'; end if;
    if exists (select 1 from public.beast_marketing_video_jobs where series_id = selected_series_id)
      or exists (select 1 from public.beast_marketing_agency_workstreams where video_series_id = selected_series_id) then
      raise exception 'Use an empty unassigned series';
    end if;
    update public.beast_marketing_video_series
      set settings = settings || jsonb_build_object('publishingEnabled', false, 'approvalMode', 'owner_approval'), updated_at = now()
      where id = selected_series_id and owner_id = actor;
  end if;
  insert into public.beast_marketing_agency_workstreams (owner_id, presenter_profile_id, campaign_id, video_series_id)
    values (actor, selected_presenter_id, selected_campaign_id, selected_series_id) returning * into existing;
  -- Creative must be created after immutable talent linkage, so a stale pre-link
  -- review cannot accidentally authorize the newly associated character.
  return to_jsonb(existing);
end;
$$;

create function public.guard_beast_marketing_agency_plan()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  stream public.beast_marketing_agency_workstreams%rowtype;
  creative public.beast_marketing_ad_variants%rowtype;
  expected_placement text;
begin
  if tg_op = 'UPDATE' and old.agency_workstream_id is not null and row(new.agency_workstream_id, new.campaign_id, new.owner_id)
    is distinct from row(old.agency_workstream_id, old.campaign_id, old.owner_id) then
    raise exception 'Private plan cannot move out of its workstream';
  end if;
  perform 1 from public.beast_marketing_campaigns where id = new.campaign_id for share;
  select * into stream from public.beast_marketing_agency_workstreams where campaign_id = new.campaign_id;
  if not found then
    if new.agency_workstream_id is not null then raise exception 'Private workstream does not match campaign'; end if;
    return new;
  end if;
  if row(new.agency_workstream_id, new.agency_presenter_profile_id, new.owner_id)
    is distinct from row(stream.id, stream.presenter_profile_id, stream.owner_id) then
    raise exception 'Private plan must match its owner and character';
  end if;
  if tg_op = 'UPDATE' and row(new.owner_id, new.campaign_id, new.variant_id, new.variant_revision, new.variant_revision_hash,
    new.agency_workstream_id, new.agency_presenter_profile_id, new.agency_channel, new.agency_connection_id, new.planned_for, new.timezone, new.owner_notes)
    is distinct from row(old.owner_id, old.campaign_id, old.variant_id, old.variant_revision, old.variant_revision_hash,
    old.agency_workstream_id, old.agency_presenter_profile_id, old.agency_channel, old.agency_connection_id, old.planned_for, old.timezone, old.owner_notes) then
    raise exception 'Private planning identity is immutable; create a new reviewed slot';
  end if;
  if new.status not in ('draft', 'ready', 'cancelled') or new.handoff_payload is not null or new.exported_at is not null then
    raise exception 'Private planning cannot export or publish';
  end if;
  -- Same row lock as the approval RPC/revision trigger closes approval-versus-queue races.
  select * into creative from public.beast_marketing_ad_variants
    where id = new.variant_id and owner_id = stream.owner_id and campaign_id = stream.campaign_id for update;
  if not found then raise exception 'Creative does not belong to the private workstream'; end if;
  expected_placement := case new.agency_channel when 'instagram' then 'instagram_story_reel' when 'facebook_page' then 'meta_feed' when 'x' then 'x_post' else null end;
  if expected_placement is null then raise exception 'Supported private planning channel required'; end if;
  if new.status = 'ready' and (creative.status <> 'approved' or creative.revision <> new.variant_revision
    or creative.revision_hash <> new.variant_revision_hash or creative.approved_revision is distinct from creative.revision
    or creative.approved_revision_hash is distinct from creative.revision_hash) then
    raise exception 'Exact current creative approval required';
  end if;
  if new.status = 'ready' and (creative.placement_profile_id <> expected_placement or new.platform <> creative.platform or new.placement <> creative.placement
    or creative.media_type <> 'none' or creative.media_url is not null) then
    raise exception 'This preparation slice accepts matching media-less creative only';
  end if;
  if new.status = 'ready' and new.agency_connection_id is not null and not exists (
    select 1 from public.beast_marketing_agency_bindings b join public.beast_marketing_social_connections c
      on c.id = b.connection_id and c.owner_id = b.owner_id and c.channel = b.channel
    where b.owner_id = stream.owner_id and b.presenter_profile_id = stream.presenter_profile_id
      and b.channel = new.agency_channel and b.connection_id = new.agency_connection_id
      and c.disconnected_at is null and c.connected_at <= now() and (c.expires_at is null or c.expires_at > now()) and length(trim(c.account_id)) > 0
  ) then raise exception 'An available account bound to this exact character and channel is required'; end if;
  return new;
end;
$$;
create trigger guard_beast_marketing_agency_plan before insert or update on public.beast_marketing_distribution_plans
for each row execute function public.guard_beast_marketing_agency_plan();

create function public.queue_beast_marketing_agency_plan(
  selected_workstream_id uuid, selected_presenter_id uuid, selected_variant_id uuid,
  selected_revision integer, selected_revision_hash text, selected_channel text,
  selected_planned_for timestamptz, selected_timezone text, selected_owner_notes text default '', selected_connection_id uuid default null
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  stream public.beast_marketing_agency_workstreams%rowtype;
  creative public.beast_marketing_ad_variants%rowtype;
  planned public.beast_marketing_distribution_plans%rowtype;
begin
  if actor is null or not exists (select 1 from public.profiles where id = actor and role = 'admin') then
    raise exception 'Owner access required' using errcode = '42501';
  end if;
  if selected_revision is null or selected_revision < 1 or selected_revision_hash is null or selected_revision_hash !~ '^fnv1a32:[0-9a-f]{8}$'
    or selected_channel is null or selected_channel not in ('instagram', 'facebook_page', 'x')
    or selected_planned_for is null or not isfinite(selected_planned_for)
    or selected_timezone is null or length(selected_timezone) not between 1 and 100
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = selected_timezone)
    or selected_owner_notes is null or length(selected_owner_notes) > 2000 then
    raise exception 'Valid exact revision and planning slot required';
  end if;
  select * into stream from public.beast_marketing_agency_workstreams
    where id = selected_workstream_id and owner_id = actor and presenter_profile_id = selected_presenter_id for share;
  if not found then raise exception 'Owned character workstream required'; end if;
  select * into creative from public.beast_marketing_ad_variants
    where id = selected_variant_id and campaign_id = stream.campaign_id and owner_id = actor for update;
  if not found or creative.status <> 'approved' or creative.revision <> selected_revision or creative.revision_hash <> selected_revision_hash
    or creative.approved_revision is distinct from selected_revision or creative.approved_revision_hash is distinct from selected_revision_hash then
    raise exception 'Exact current creative approval required';
  end if;
  insert into public.beast_marketing_distribution_plans (
    owner_id, campaign_id, variant_id, variant_revision, variant_revision_hash, platform, placement, planned_for, timezone, status, owner_notes,
    agency_workstream_id, agency_presenter_profile_id, agency_channel, agency_connection_id
  ) values (actor, stream.campaign_id, creative.id, selected_revision, selected_revision_hash, creative.platform, creative.placement,
    selected_planned_for, selected_timezone, 'ready', selected_owner_notes, stream.id, stream.presenter_profile_id, selected_channel, selected_connection_id)
  on conflict (agency_workstream_id, variant_id, variant_revision, variant_revision_hash, agency_channel, planned_for)
    where agency_workstream_id is not null do nothing returning * into planned;
  if not found then
    select * into planned from public.beast_marketing_distribution_plans
      where agency_workstream_id = stream.id and owner_id = actor and variant_id = creative.id and variant_revision = selected_revision
        and variant_revision_hash = selected_revision_hash and agency_channel = selected_channel and planned_for = selected_planned_for;
    if not found or planned.timezone <> selected_timezone or planned.owner_notes <> selected_owner_notes
      or planned.agency_connection_id is distinct from selected_connection_id then raise exception 'Retry payload differs from existing private slot'; end if;
  end if;
  -- Retries return the same row, including cancelled/draft states; never reactivate a slot.
  return to_jsonb(planned);
end;
$$;

create function public.guard_beast_marketing_agency_bound_resources()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'beast_marketing_growth_runs' then
    if new.status = 'running' then
      perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('agency-workstream:' || new.owner_id::text, 0));
    end if;
  elsif tg_table_name = 'beast_marketing_agency_workstreams' then
    if row(new.id, new.owner_id, new.presenter_profile_id, new.campaign_id, new.video_series_id, new.mode)
      is distinct from row(old.id, old.owner_id, old.presenter_profile_id, old.campaign_id, old.video_series_id, old.mode) then
      raise exception 'Private workstream links are immutable';
    end if;
  elsif tg_table_name = 'beast_marketing_presenter_profiles' then
    if exists (select 1 from public.beast_marketing_agency_workstreams where presenter_profile_id = old.id)
      and (new.active or new.presenter_type <> 'future_character' or new.owner_id <> old.owner_id) then raise exception 'Private planning characters must remain inactive'; end if;
  elsif tg_table_name = 'beast_marketing_video_series' then
    if exists (select 1 from public.beast_marketing_agency_workstreams where video_series_id = old.id)
      and (new.enabled or new.owner_id <> old.owner_id or new.settings->>'publishingEnabled' is distinct from 'false'
        or new.settings->>'approvalMode' is distinct from 'owner_approval') then raise exception 'Private planning series must remain disabled with owner review'; end if;
  elsif tg_table_name = 'beast_marketing_video_jobs' then
    -- Acquire the same parent locks before checking links, including inserts racing linkage.
    perform 1 from public.beast_marketing_presenter_profiles where id = new.presenter_profile_id for share;
    perform 1 from public.beast_marketing_video_series where id = new.series_id for share;
    if exists (select 1 from public.beast_marketing_agency_workstreams where video_series_id = new.series_id or presenter_profile_id = new.presenter_profile_id) then
      raise exception 'Video generation and scheduling are outside private planning';
    end if;
  elsif tg_table_name = 'beast_marketing_campaigns' then
    if exists (select 1 from public.beast_marketing_agency_workstreams where campaign_id = old.id)
      and (new.owner_id <> old.owner_id or new.status in ('scheduled', 'active')) then raise exception 'Private planning campaigns cannot activate'; end if;
  elsif tg_table_name in ('beast_marketing_assets', 'beast_marketing_recommendations', 'beast_marketing_outcomes') then
    perform 1 from public.beast_marketing_campaigns where id = new.campaign_id for share;
    if exists (select 1 from public.beast_marketing_agency_workstreams where campaign_id = new.campaign_id) then
      raise exception 'Legacy campaign work is outside private planning';
    end if;
  elsif tg_table_name = 'beast_marketing_social_posts' then
    perform 1 from public.beast_marketing_campaigns where id::text = lower(new.content->>'campaignId') for share;
    if exists (select 1 from public.beast_marketing_agency_workstreams where campaign_id::text = lower(new.content->>'campaignId')) then
      raise exception 'Social posts are outside private planning';
    end if;
  elsif tg_table_name = 'beast_marketing_ad_variants' then
    perform 1 from public.beast_marketing_campaigns where id in (old.campaign_id, new.campaign_id) order by id for share;
    if tg_op = 'INSERT' and exists (select 1 from public.beast_marketing_agency_workstreams where campaign_id = new.campaign_id)
      and (new.status <> 'draft' or new.approved_revision is not null or new.approved_revision_hash is not null) then
      raise exception 'New private creative must start unapproved';
    end if;
    if tg_op = 'UPDATE' and row(new.campaign_id, new.owner_id) is distinct from row(old.campaign_id, old.owner_id)
      and exists (select 1 from public.beast_marketing_agency_workstreams where campaign_id in (old.campaign_id, new.campaign_id)) then
      raise exception 'Creative cannot move across a private talent boundary';
    end if;
  end if;
  return new;
end;
$$;
create trigger guard_agency_growth_claim before insert or update on public.beast_marketing_growth_runs for each row execute function public.guard_beast_marketing_agency_bound_resources();
create trigger guard_agency_workstream before update on public.beast_marketing_agency_workstreams for each row execute function public.guard_beast_marketing_agency_bound_resources();
create trigger guard_agency_asset before insert or update on public.beast_marketing_assets for each row execute function public.guard_beast_marketing_agency_bound_resources();
create trigger guard_agency_assessment before insert or update on public.beast_marketing_recommendations for each row execute function public.guard_beast_marketing_agency_bound_resources();
create trigger guard_agency_outcome before insert or update on public.beast_marketing_outcomes for each row execute function public.guard_beast_marketing_agency_bound_resources();
create trigger guard_agency_profile before update on public.beast_marketing_presenter_profiles for each row execute function public.guard_beast_marketing_agency_bound_resources();
create trigger guard_agency_series before update on public.beast_marketing_video_series for each row execute function public.guard_beast_marketing_agency_bound_resources();
create trigger guard_agency_video_job before insert or update on public.beast_marketing_video_jobs for each row execute function public.guard_beast_marketing_agency_bound_resources();
create trigger guard_agency_social_post before insert or update on public.beast_marketing_social_posts for each row execute function public.guard_beast_marketing_agency_bound_resources();
create trigger guard_agency_campaign before update on public.beast_marketing_campaigns for each row execute function public.guard_beast_marketing_agency_bound_resources();
create trigger guard_agency_variant before insert or update on public.beast_marketing_ad_variants for each row execute function public.guard_beast_marketing_agency_bound_resources();

create function public.invalidate_beast_marketing_agency_plans()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.beast_marketing_distribution_plans set status = 'draft', handoff_payload = null, exported_at = null
    where variant_id = new.id and owner_id = new.owner_id and agency_workstream_id is not null and status = 'ready'
      and (new.status <> 'approved' or variant_revision <> new.revision or variant_revision_hash <> new.revision_hash
        or new.approved_revision is distinct from new.revision or new.approved_revision_hash is distinct from new.revision_hash);
  return new;
end;
$$;
create trigger invalidate_agency_plans after update on public.beast_marketing_ad_variants for each row execute function public.invalidate_beast_marketing_agency_plans();

revoke all on function public.link_beast_marketing_agency_workstream(uuid, uuid, uuid), public.queue_beast_marketing_agency_plan(uuid, uuid, uuid, integer, text, text, timestamptz, text, text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.link_beast_marketing_agency_workstream(uuid, uuid, uuid), public.queue_beast_marketing_agency_plan(uuid, uuid, uuid, integer, text, text, timestamptz, text, text, uuid) to authenticated;
revoke all on function public.guard_beast_marketing_agency_plan(), public.guard_beast_marketing_agency_bound_resources(), public.invalidate_beast_marketing_agency_plans() from public, anon, authenticated, service_role;

commit;
