-- BeastHealth 3.0.0-beta1 owner-only health record foundation.
-- Additive only. This migration does not activate Health Advisor, create
-- recommendations, or connect health records to execution.

create table if not exists public.beast_health_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check (record_type in (
    'profile', 'condition', 'medication', 'procedure', 'vital', 'document',
    'lifestyle', 'family_history', 'provider'
  )),
  title text not null check (length(trim(title)) between 1 and 200),
  status text not null default 'active' check (status in (
    'active', 'historical', 'resolved', 'planned', 'archived'
  )),
  occurred_on date,
  source text check (source is null or length(source) <= 300),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  notes text check (notes is null or length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists beast_health_records_owner_type_date_idx
  on public.beast_health_records (
    owner_id,
    record_type,
    occurred_on desc nulls last,
    created_at desc
  );

create index if not exists beast_health_records_owner_status_updated_idx
  on public.beast_health_records (owner_id, status, updated_at desc);

alter table public.beast_health_records enable row level security;

drop policy if exists "Owners read own BeastHealth records"
  on public.beast_health_records;
create policy "Owners read own BeastHealth records"
  on public.beast_health_records
  for select
  using (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Owners create own BeastHealth records"
  on public.beast_health_records;
create policy "Owners create own BeastHealth records"
  on public.beast_health_records
  for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Owners update own BeastHealth records"
  on public.beast_health_records;
create policy "Owners update own BeastHealth records"
  on public.beast_health_records
  for update
  using (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  )
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Owners delete own BeastHealth records"
  on public.beast_health_records;
create policy "Owners delete own BeastHealth records"
  on public.beast_health_records
  for delete
  using (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

create or replace function public.set_beast_health_record_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_beast_health_record_updated_at
  on public.beast_health_records;
create trigger set_beast_health_record_updated_at
before update on public.beast_health_records
for each row
execute function public.set_beast_health_record_updated_at();
