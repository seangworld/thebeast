begin;

alter table public.beast_hunter_hunts
  add column if not exists name text,
  add column if not exists archived_at timestamptz;

alter table public.beast_hunter_hunts drop constraint if exists beast_hunter_hunts_status_check;
alter table public.beast_hunter_hunts add constraint beast_hunter_hunts_status_check
  check (status in ('draft', 'queued', 'researching', 'completed', 'failed', 'cancelled', 'archived'));

alter table public.beast_hunter_opportunities
  add column if not exists validation jsonb,
  add column if not exists build_brief jsonb,
  add column if not exists trend_status text not null default 'unknown'
    check (trend_status in ('unknown', 'rising', 'stable', 'falling', 'saturated', 'expired')),
  add column if not exists last_monitored_at timestamptz;

create table if not exists public.beast_hunter_opportunity_snapshots (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.beast_hunter_opportunities(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  total_score integer not null check (total_score between 0 and 100),
  scores jsonb not null default '{}'::jsonb,
  trend_status text not null check (trend_status in ('unknown', 'rising', 'stable', 'falling', 'saturated', 'expired')),
  summary text not null default '',
  evidence jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists beast_hunter_snapshots_opportunity_created_idx
  on public.beast_hunter_opportunity_snapshots (opportunity_id, created_at desc);

alter table public.beast_hunter_opportunity_snapshots enable row level security;

create policy "BeastHunter snapshots are owner only" on public.beast_hunter_opportunity_snapshots
  for all using (
    owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ) with check (
    owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

commit;
