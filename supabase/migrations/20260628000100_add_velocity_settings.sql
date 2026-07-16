-- Durable per-user Velocity Planner settings.
-- Stores the primary credit source and guardrails that were previously browser-only.

create table if not exists public.velocity_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  velocity_source_type text not null default 'heloc',
  credit_limit numeric,
  current_balance numeric,
  source_apr numeric,
  max_utilization_percent numeric not null default 66,
  recovery_months integer not null default 6,
  emergency_reserve_amount numeric,
  allow_super_velocity boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint velocity_settings_source_type_check
    check (velocity_source_type in ('heloc', 'ploc', 'credit_card', 'other'))
);

create or replace function public.set_velocity_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_velocity_settings_updated_at on public.velocity_settings;
create trigger set_velocity_settings_updated_at
  before update on public.velocity_settings
  for each row
  execute function public.set_velocity_settings_updated_at();

alter table public.velocity_settings enable row level security;

drop policy if exists "Users can read their own velocity settings" on public.velocity_settings;
create policy "Users can read their own velocity settings"
  on public.velocity_settings
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own velocity settings" on public.velocity_settings;
create policy "Users can insert their own velocity settings"
  on public.velocity_settings
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own velocity settings" on public.velocity_settings;
create policy "Users can update their own velocity settings"
  on public.velocity_settings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own velocity settings" on public.velocity_settings;
create policy "Users can delete their own velocity settings"
  on public.velocity_settings
  for delete
  using (auth.uid() = user_id);
