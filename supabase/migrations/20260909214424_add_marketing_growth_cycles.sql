-- Separate, opt-in discovery and advisory measurement. No publishing authority.
create table public.beast_marketing_growth_controls (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
create table public.beast_marketing_growth_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  cycle_date date not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  report jsonb not null default '{}'::jsonb check (jsonb_typeof(report) = 'object'),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(owner_id, cycle_date)
);
alter table public.beast_marketing_growth_controls enable row level security;
alter table public.beast_marketing_growth_runs enable row level security;
create policy "Admin reads own growth control" on public.beast_marketing_growth_controls
for select to authenticated using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "Admin reads own growth runs" on public.beast_marketing_growth_runs
for select to authenticated using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
revoke all on public.beast_marketing_growth_controls, public.beast_marketing_growth_runs from anon, authenticated;
grant select on public.beast_marketing_growth_controls, public.beast_marketing_growth_runs to authenticated;
grant all on public.beast_marketing_growth_controls, public.beast_marketing_growth_runs to service_role;
