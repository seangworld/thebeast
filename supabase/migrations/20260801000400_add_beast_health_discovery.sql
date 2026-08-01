-- BH-201: persist progressive BeastHealth onboarding workflow state only.
-- Confirmed health answers remain in owner-scoped beast_health_records.
create table if not exists public.beast_health_discovery (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  last_topic text null,
  skipped_topics text[] not null default '{}'::text[],
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_health_discovery_last_topic_check check (
    last_topic is null or last_topic = any (array[
      'health-symptoms-needed',
      'health-conditions-needed',
      'health-medications-needed',
      'health-allergies-needed',
      'health-procedures-needed',
      'health-primary-care-needed',
      'health-specialists-needed',
      'health-insurance-needed',
      'health-emergency-contacts',
      'health-family-history-needed',
      'health-lifestyle-needed',
      'health-goals-needed',
      'health-appointments-needed',
      'health-vaccination-status-needed'
    ]::text[])
  ),
  constraint beast_health_discovery_skipped_topics_check check (
    skipped_topics <@ array[
      'health-symptoms-needed',
      'health-conditions-needed',
      'health-medications-needed',
      'health-allergies-needed',
      'health-procedures-needed',
      'health-primary-care-needed',
      'health-specialists-needed',
      'health-insurance-needed',
      'health-emergency-contacts',
      'health-family-history-needed',
      'health-lifestyle-needed',
      'health-goals-needed',
      'health-appointments-needed',
      'health-vaccination-status-needed'
    ]::text[]
  )
);

alter table public.beast_health_discovery enable row level security;

create or replace function public.set_beast_health_discovery_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_beast_health_discovery_updated_at on public.beast_health_discovery;
create trigger set_beast_health_discovery_updated_at
  before update on public.beast_health_discovery
  for each row
  execute function public.set_beast_health_discovery_updated_at();

drop policy if exists "Owners manage their BeastHealth discovery" on public.beast_health_discovery;
create policy "Owners manage their BeastHealth discovery"
  on public.beast_health_discovery
  for all
  to authenticated
  using (
    auth.uid() = owner_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  )
  with check (
    auth.uid() = owner_id
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

comment on table public.beast_health_discovery is
  'Owner-only BeastHealth onboarding workflow state. Contains topic identifiers only; health answers remain in beast_health_records.';
comment on column public.beast_health_discovery.last_topic is
  'Non-clinical topic identifier used to resume guided discovery.';
comment on column public.beast_health_discovery.skipped_topics is
  'Non-clinical topic identifiers deferred by the owner; skipped topics are not counted as complete.';
