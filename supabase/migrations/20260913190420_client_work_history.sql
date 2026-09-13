-- Metadata-only owner history. Client source and deliverable contents are never stored here.
create table public.seangworld_client_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null check (char_length(trim(client_name)) between 1 and 120),
  project_name text not null check (char_length(trim(project_name)) between 1 and 120),
  job_type text not null check (job_type in ('code_audit', 'client_delivery')),
  status text not null default 'completed' check (status in ('completed', 'archived')),
  audit_profile text check (audit_profile is null or audit_profile in ('full', 'security', 'launch', 'quality')),
  attention_level text check (attention_level is null or attention_level in ('urgent', 'high', 'moderate', 'low')),
  files_count integer not null default 0 check (files_count between 0 and 2000),
  findings_count integer not null default 0 check (findings_count between 0 and 10000),
  critical_count integer not null default 0 check (critical_count between 0 and 10000),
  high_count integer not null default 0 check (high_count between 0 and 10000),
  medium_count integer not null default 0 check (medium_count between 0 and 10000),
  input_bytes integer not null default 0 check (input_bytes between 0 and 50000000),
  artifact_name text not null check (char_length(trim(artifact_name)) between 1 and 180),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  check ((status = 'archived' and archived_at is not null) or (status = 'completed' and archived_at is null))
);

create index seangworld_client_jobs_owner_created_idx on public.seangworld_client_jobs(owner_id, created_at desc);
alter table public.seangworld_client_jobs enable row level security;
revoke all on public.seangworld_client_jobs from public, anon, authenticated;
grant select, insert, update on public.seangworld_client_jobs to authenticated;
create policy "HQ owner reads client job metadata" on public.seangworld_client_jobs for select to authenticated
using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "HQ owner inserts client job metadata" on public.seangworld_client_jobs for insert to authenticated
with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "HQ owner updates client job metadata" on public.seangworld_client_jobs for update to authenticated
using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'))
with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
