-- BA-CMD-001A: immutable BeastFusion canonical projection read model.
-- Existing BeastAdmin roadmap and release rows are preserved and classified;
-- they are not canonical governance truth.

create extension if not exists pgcrypto;

create table if not exists public.beastfusion_command_snapshots (
  id uuid primary key default gen_random_uuid(),
  projection_id text not null unique,
  projection_version text not null,
  payload_hash text not null unique,
  canonical_input_digest text not null,
  source_commit text not null,
  generated_at timestamptz not null,
  published_at timestamptz not null default now(),
  payload jsonb not null,
  constraint beastfusion_command_projection_id_check check (projection_id ~ '^bfcp_[0-9a-f]{16}$'),
  constraint beastfusion_command_projection_version_check check (projection_version = '1.0.0'),
  constraint beastfusion_command_payload_hash_check check (payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  constraint beastfusion_command_input_digest_check check (canonical_input_digest ~ '^sha256:[0-9a-f]{64}$'),
  constraint beastfusion_command_source_commit_check check (source_commit ~ '^[0-9a-f]{40}$' and source_commit <> repeat('0', 40)),
  constraint beastfusion_command_payload_size_check check (octet_length(payload::text) <= 1048576),
  constraint beastfusion_command_payload_object_check check (jsonb_typeof(payload) = 'object')
);

create index if not exists beastfusion_command_snapshots_generated_idx
  on public.beastfusion_command_snapshots (generated_at desc, published_at desc);
create index if not exists beastfusion_command_snapshots_source_idx
  on public.beastfusion_command_snapshots (source_commit, canonical_input_digest);

create table if not exists public.beastfusion_command_current (
  singleton boolean primary key default true check (singleton),
  snapshot_id uuid not null references public.beastfusion_command_snapshots(id) on delete restrict,
  advanced_at timestamptz not null default now()
);

create or replace function public.prevent_beastfusion_command_snapshot_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'Canonical BeastFusion snapshots are immutable';
end;
$$;

drop trigger if exists protect_beastfusion_command_snapshots on public.beastfusion_command_snapshots;
create trigger protect_beastfusion_command_snapshots
  before update or delete on public.beastfusion_command_snapshots
  for each row execute function public.prevent_beastfusion_command_snapshot_mutation();

alter table public.beastfusion_command_snapshots enable row level security;
alter table public.beastfusion_command_current enable row level security;
revoke all on public.beastfusion_command_snapshots from anon, authenticated;
revoke all on public.beastfusion_command_current from anon, authenticated;
grant all on public.beastfusion_command_snapshots to service_role;
grant all on public.beastfusion_command_current to service_role;

create or replace function public.publish_beastfusion_command_snapshot(
  selected_projection_id text,
  selected_projection_version text,
  selected_payload_hash text,
  selected_canonical_input_digest text,
  selected_source_commit text,
  selected_generated_at timestamptz,
  selected_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_snapshot public.beastfusion_command_snapshots%rowtype;
  current_snapshot public.beastfusion_command_snapshots%rowtype;
  accepted_snapshot_id uuid;
begin
  if selected_projection_version <> '1.0.0'
    or selected_projection_id !~ '^bfcp_[0-9a-f]{16}$'
    or selected_payload_hash !~ '^sha256:[0-9a-f]{64}$'
    or selected_canonical_input_digest !~ '^sha256:[0-9a-f]{64}$'
    or selected_source_commit !~ '^[0-9a-f]{40}$'
    or selected_source_commit = repeat('0', 40)
    or selected_generated_at < now() - interval '24 hours'
    or selected_generated_at > now() + interval '5 minutes'
    or jsonb_typeof(selected_payload) <> 'object'
    or octet_length(selected_payload::text) > 1048576
    or selected_payload ->> '$schema' <> 'beastfusion-command-center-projection.schema.json'
    or selected_payload ->> 'projectionVersion' <> selected_projection_version
    or selected_payload ->> 'projectionId' <> selected_projection_id
    or selected_payload #>> '{source,commit}' <> selected_source_commit
    or selected_payload #>> '{source,canonicalInputDigest}' <> selected_canonical_input_digest
    or (selected_payload #>> '{classification,audience}') <> 'beastadmin_owner_only'
    or (selected_payload #>> '{classification,containsMemberData}')::boolean is distinct from false
    or (selected_payload #>> '{classification,containsSecrets}')::boolean is distinct from false
    or (selected_payload #>> '{classification,containsRawPrompts}')::boolean is distinct from false
  then
    raise exception 'Projection contract validation failed';
  end if;

  select * into existing_snapshot
  from public.beastfusion_command_snapshots
  where projection_id = selected_projection_id or payload_hash = selected_payload_hash
  limit 1;

  select snapshot.* into current_snapshot
  from public.beastfusion_command_current pointer
  join public.beastfusion_command_snapshots snapshot on snapshot.id = pointer.snapshot_id
  where pointer.singleton = true;

  if existing_snapshot.id is not null then
    if existing_snapshot.projection_id <> selected_projection_id
      or existing_snapshot.payload_hash <> selected_payload_hash
      or existing_snapshot.canonical_input_digest <> selected_canonical_input_digest
      or existing_snapshot.source_commit <> selected_source_commit
    then
      raise exception 'Projection identity conflicts with immutable history';
    end if;
    return jsonb_build_object(
      'status', case when current_snapshot.id = existing_snapshot.id then 'Already Current' else 'Already Accepted' end,
      'snapshotId', existing_snapshot.id,
      'projectionId', existing_snapshot.projection_id
    );
  end if;

  if current_snapshot.id is not null and selected_generated_at <= current_snapshot.generated_at then
    raise exception 'Stale or downgrade projection rejected';
  end if;

  insert into public.beastfusion_command_snapshots (
    projection_id, projection_version, payload_hash, canonical_input_digest,
    source_commit, generated_at, payload
  ) values (
    selected_projection_id, selected_projection_version, selected_payload_hash,
    selected_canonical_input_digest, selected_source_commit,
    selected_generated_at, selected_payload
  ) returning id into accepted_snapshot_id;

  insert into public.beastfusion_command_current (singleton, snapshot_id, advanced_at)
  values (true, accepted_snapshot_id, now())
  on conflict (singleton) do update
    set snapshot_id = excluded.snapshot_id,
        advanced_at = excluded.advanced_at;

  return jsonb_build_object('status', 'Accepted', 'snapshotId', accepted_snapshot_id, 'projectionId', selected_projection_id);
end;
$$;

revoke all on function public.publish_beastfusion_command_snapshot(text, text, text, text, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function public.publish_beastfusion_command_snapshot(text, text, text, text, text, timestamptz, jsonb) to service_role;

create or replace function public.get_beastfusion_command_current()
returns jsonb
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  selected jsonb;
begin
  if auth.uid() is null or not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required';
  end if;
  select jsonb_build_object(
    'projection_id', snapshot.projection_id,
    'projection_version', snapshot.projection_version,
    'payload_hash', snapshot.payload_hash,
    'canonical_input_digest', snapshot.canonical_input_digest,
    'source_commit', snapshot.source_commit,
    'generated_at', snapshot.generated_at,
    'published_at', snapshot.published_at,
    'payload', snapshot.payload
  ) into selected
  from public.beastfusion_command_current pointer
  join public.beastfusion_command_snapshots snapshot on snapshot.id = pointer.snapshot_id
  where pointer.singleton = true;
  return selected;
end;
$$;

revoke all on function public.get_beastfusion_command_current() from public, anon;
grant execute on function public.get_beastfusion_command_current() to authenticated;

alter table public.beast_admin_roadmap_items
  add column if not exists governance_classification text;
update public.beast_admin_roadmap_items
set governance_classification = case when source_type = 'beast_hunter' then 'intake' else 'legacy' end
where governance_classification is null;
alter table public.beast_admin_roadmap_items
  alter column governance_classification set default 'intake',
  alter column governance_classification set not null;
alter table public.beast_admin_roadmap_items
  drop constraint if exists beast_admin_roadmap_governance_classification_check;
alter table public.beast_admin_roadmap_items
  add constraint beast_admin_roadmap_governance_classification_check check (
    governance_classification in ('canonical_projection', 'legacy', 'intake', 'annotation', 'archive', 'placeholder', 'derived')
  );

alter table public.beast_admin_release_records
  add column if not exists governance_classification text;
update public.beast_admin_release_records
set governance_classification = 'legacy'
where governance_classification is null;
alter table public.beast_admin_release_records
  alter column governance_classification set default 'annotation',
  alter column governance_classification set not null;
alter table public.beast_admin_release_records
  drop constraint if exists beast_admin_release_governance_classification_check;
alter table public.beast_admin_release_records
  add constraint beast_admin_release_governance_classification_check check (
    governance_classification in ('canonical_projection', 'legacy', 'intake', 'annotation', 'archive', 'placeholder', 'derived')
  );

alter table public.beast_admin_roadmap_items
  drop constraint if exists beast_admin_roadmap_execution_status_check;
alter table public.beast_admin_roadmap_items
  drop constraint if exists beast_admin_roadmap_items_execution_status_check;
alter table public.beast_admin_roadmap_items
  add constraint beast_admin_roadmap_execution_status_check check (
    execution_status in ('not_queued', 'candidate_intake', 'ready', 'in_progress', 'ticketed', 'completed', 'blocked')
  );
