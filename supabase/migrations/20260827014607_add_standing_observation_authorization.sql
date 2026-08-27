alter table public.beast_admin_staff_schedules
  add column if not exists scope_key text not null default 'orchestrator_3_bounded_observation_v1',
  add column if not exists permitted_sources jsonb not null default '["beastfusion_canonical_projection", "github_repository_evidence", "vercel_deployment_evidence"]'::jsonb;

alter table public.beast_admin_staff_schedules
  add constraint beast_admin_staff_schedule_scope_check
    check (scope_key = 'orchestrator_3_bounded_observation_v1'),
  add constraint beast_admin_staff_schedule_sources_check
    check (permitted_sources = '["beastfusion_canonical_projection", "github_repository_evidence", "vercel_deployment_evidence"]'::jsonb);

create table public.beast_admin_standing_authorizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  authorization_key text not null default 'orchestrator_3_standing_observation',
  origin_package_id text not null default 'BF-AGT-011',
  owner_authorized boolean not null default true,
  authorized_at timestamptz not null default now(),
  scope_key text not null default 'orchestrator_3_bounded_observation_v1',
  permitted_sources jsonb not null default '["beastfusion_canonical_projection", "github_repository_evidence", "vercel_deployment_evidence"]'::jsonb,
  revoked_at timestamptz,
  revocation_reason text,
  unique (owner_id, authorization_key),
  constraint beast_admin_standing_authorization_key_check check (authorization_key = 'orchestrator_3_standing_observation'),
  constraint beast_admin_standing_origin_check check (origin_package_id = 'BF-AGT-011'),
  constraint beast_admin_standing_owner_authorized_check check (owner_authorized),
  constraint beast_admin_standing_scope_check check (scope_key = 'orchestrator_3_bounded_observation_v1'),
  constraint beast_admin_standing_sources_check check (permitted_sources = '["beastfusion_canonical_projection", "github_repository_evidence", "vercel_deployment_evidence"]'::jsonb),
  constraint beast_admin_standing_revocation_check check ((revoked_at is null and revocation_reason is null) or (revoked_at is not null and nullif(btrim(revocation_reason), '') is not null))
);

insert into public.beast_admin_standing_authorizations (owner_id)
select owner_id
from public.beast_admin_staff_schedules
where assignment_key = 'orchestrator_3_standing_observation'
on conflict (owner_id, authorization_key) do nothing;

alter table public.beast_admin_standing_authorizations enable row level security;
revoke all on table public.beast_admin_standing_authorizations from anon, authenticated;
grant select on table public.beast_admin_standing_authorizations to authenticated;

create policy "BeastAdmin owners read standing authorizations"
  on public.beast_admin_standing_authorizations for select to authenticated
  using ((select auth.uid()) = owner_id and public.is_profile_admin());

revoke insert, update, delete on table public.beast_admin_staff_schedules from authenticated;
grant update (enabled, next_run_at, last_run_at, paused_at, updated_at)
  on table public.beast_admin_staff_schedules to authenticated;

comment on table public.beast_admin_standing_authorizations is
  'Persisted, revocable owner authorization for the fixed BF-AGT-011 standing observation scope. This authority cannot execute proposals, build, release, spend, or expand scope.';
