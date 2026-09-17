-- Claim preparation stays separate from clinical facts and Health Advisor memory.
create table public.beast_veteran_claims (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(btrim(title)) between 1 and 160),
  claim_type text not null check (claim_type in ('new','increase','secondary','supplemental','review','unsure')),
  stage text not null default 'preparing' check (stage in ('preparing','gathering','submitted','exam','decision','review','closed')),
  next_action_date date,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 40000),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index beast_veteran_claims_owner_idx on public.beast_veteran_claims(owner_id, updated_at desc);
alter table public.beast_veteran_claims enable row level security;
revoke all on public.beast_veteran_claims from anon;
grant select, insert, update, delete on public.beast_veteran_claims to authenticated;
create policy "Members manage only their own veteran claims" on public.beast_veteran_claims
  for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
comment on table public.beast_veteran_claims is 'Member-entered claim preparation, not VA-synchronized status or verified clinical diagnoses.';
