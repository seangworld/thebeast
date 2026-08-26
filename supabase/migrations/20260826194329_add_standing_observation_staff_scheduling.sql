create table if not exists public.beast_admin_staff_schedules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  assignment_key text not null default 'orchestrator_3_standing_observation',
  enabled boolean not null default false,
  cadence text not null default 'daily',
  cron_expression text not null default '0 10 * * *',
  next_run_at timestamptz,
  last_run_at timestamptz,
  paused_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (owner_id, assignment_key),
  constraint beast_admin_staff_schedule_assignment_check check (assignment_key = 'orchestrator_3_standing_observation'),
  constraint beast_admin_staff_schedule_cadence_check check (cadence = 'daily')
);

create table if not exists public.beast_admin_staff_observation_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  schedule_id uuid references public.beast_admin_staff_schedules(id) on delete set null,
  trigger_type text not null,
  status text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  checked_sources jsonb not null default '[]'::jsonb,
  unavailable_sources jsonb not null default '[]'::jsonb,
  changes jsonb not null default '[]'::jsonb,
  suppressed_signals jsonb not null default '[]'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  confidence text not null default 'unknown',
  impact text not null default 'none',
  next_step text not null default 'No action.',
  evidence_digest text,
  finding_count integer not null default 0,
  investigation_count integer not null default 0,
  proposal_count integer not null default 0,
  retry_count integer not null default 0,
  error_category text,
  constraint beast_admin_staff_run_trigger_check check (trigger_type in ('schedule', 'owner_controlled_simulation')),
  constraint beast_admin_staff_run_status_check check (status in ('running', 'clean', 'findings', 'failed', 'duplicate_skipped')),
  constraint beast_admin_staff_run_counts_check check (finding_count >= 0 and investigation_count between 0 and 3 and proposal_count between 0 and 3 and retry_count between 0 and 4)
);

create index if not exists beast_admin_staff_runs_owner_started_idx
  on public.beast_admin_staff_observation_runs(owner_id, started_at desc);
create unique index if not exists beast_admin_staff_runs_owner_digest_idx
  on public.beast_admin_staff_observation_runs(owner_id, evidence_digest)
  where evidence_digest is not null and status in ('clean', 'findings');

alter table public.beast_admin_staff_schedules enable row level security;
alter table public.beast_admin_staff_observation_runs enable row level security;
revoke all on table public.beast_admin_staff_schedules from anon, authenticated;
revoke all on table public.beast_admin_staff_observation_runs from anon, authenticated;
grant select, insert, update on table public.beast_admin_staff_schedules to authenticated;
grant select on table public.beast_admin_staff_observation_runs to authenticated;

drop policy if exists "BeastAdmin owners manage staff schedules" on public.beast_admin_staff_schedules;
create policy "BeastAdmin owners manage staff schedules"
  on public.beast_admin_staff_schedules for all to authenticated
  using (auth.uid() = owner_id and public.is_profile_admin())
  with check (auth.uid() = owner_id and public.is_profile_admin());

drop policy if exists "BeastAdmin owners read staff observation runs" on public.beast_admin_staff_observation_runs;
create policy "BeastAdmin owners read staff observation runs"
  on public.beast_admin_staff_observation_runs for select to authenticated
  using (auth.uid() = owner_id and public.is_profile_admin());

comment on table public.beast_admin_staff_observation_runs is
  'Owner-only durable evidence for bounded read-only Orchestrator 3.0 observation cycles; never execution authority.';
