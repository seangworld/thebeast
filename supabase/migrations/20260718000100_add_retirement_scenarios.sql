create table if not exists public.retirement_scenarios (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Retirement plan', assumptions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.retirement_income_sources (
  id uuid primary key default gen_random_uuid(), scenario_id uuid not null references public.retirement_scenarios(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade, label text not null, amount numeric,
  source_kind text not null, value_source text not null, source_date date, confidence text not null default 'unknown', assumptions jsonb not null default '[]'::jsonb, limitations text
);
alter table public.retirement_scenarios enable row level security;
alter table public.retirement_income_sources enable row level security;
create policy "owners manage retirement scenarios" on public.retirement_scenarios for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "owners manage retirement income sources" on public.retirement_income_sources for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
