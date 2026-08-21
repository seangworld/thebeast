begin;

create table if not exists public.beast_hunter_hunts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'queued', 'researching', 'completed', 'failed', 'archived')),
  query text not null default '',
  criteria jsonb not null default '{}'::jsonb,
  result_limit integer not null default 25 check (result_limit in (10, 25, 50, 100)),
  strictness text not null default 'flexible' check (strictness in ('strict', 'flexible')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beast_hunter_opportunities (
  id uuid primary key default gen_random_uuid(),
  hunt_id uuid not null references public.beast_hunter_hunts(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  summary text not null default '',
  hunt_type text not null,
  market text not null,
  discovered_at timestamptz not null,
  attributes jsonb not null default '{}'::jsonb,
  scores jsonb not null default '{}'::jsonb,
  total_score integer not null check (total_score between 0 and 100),
  rank integer check (rank > 0 and rank <= 100),
  filter_notes text[] not null default '{}',
  recommendation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hunt_id, rank)
);

create table if not exists public.beast_hunter_evidence (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.beast_hunter_opportunities(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  source_url text not null,
  source_type text not null default 'web',
  observed_at timestamptz not null,
  excerpt text,
  created_at timestamptz not null default now()
);

create index if not exists beast_hunter_hunts_owner_created_idx on public.beast_hunter_hunts (owner_id, created_at desc);
create index if not exists beast_hunter_opportunities_hunt_rank_idx on public.beast_hunter_opportunities (hunt_id, rank);
create index if not exists beast_hunter_evidence_opportunity_idx on public.beast_hunter_evidence (opportunity_id);

alter table public.beast_hunter_hunts enable row level security;
alter table public.beast_hunter_opportunities enable row level security;
alter table public.beast_hunter_evidence enable row level security;

create policy "BeastHunter hunts are owner only" on public.beast_hunter_hunts
  for all using (
    owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ) with check (
    owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "BeastHunter opportunities are owner only" on public.beast_hunter_opportunities
  for all using (
    owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ) with check (
    owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "BeastHunter evidence is owner only" on public.beast_hunter_evidence
  for all using (
    owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ) with check (
    owner_id = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

commit;
