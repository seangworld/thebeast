create table if not exists public.retirement_timeline_runs (
  id uuid primary key default gen_random_uuid(), scenario_id uuid not null references public.retirement_scenarios(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade, calculation_version text not null,
  scenario_snapshot jsonb not null, timeline jsonb, reproducibility_key text not null, created_at timestamptz not null default now()
);
create table if not exists public.retirement_report_exports (
  id uuid primary key default gen_random_uuid(), scenario_id uuid not null references public.retirement_scenarios(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade, format text not null check (format in ('print', 'pdf', 'csv', 'json')),
  scenario_snapshot jsonb not null, calculation_version text not null, created_at timestamptz not null default now()
);
alter table public.retirement_timeline_runs enable row level security;
alter table public.retirement_report_exports enable row level security;
create policy "owners manage retirement timeline runs" on public.retirement_timeline_runs for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners manage retirement report exports" on public.retirement_report_exports for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
