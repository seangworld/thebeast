-- BeastMoney institutional connections V1: read-only, member-triggered balance monitoring.
-- Provider credentials/tokens are deliberately NOT stored in these public/member-readable tables.

create table if not exists public.money_institution_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null,
  provider_connection_ref text not null,
  institution_name text not null,
  status text not null default 'active' check (status in ('pending','active','reauthorization-required','disconnected','error')),
  consented_scopes text[] not null default array['accounts','balances']::text[],
  consent_granted_at timestamptz not null default now(),
  consent_revoked_at timestamptz,
  last_successful_refresh_at timestamptz,
  last_refresh_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, provider_id, provider_connection_ref)
);

create table if not exists public.money_connected_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.money_institution_connections(id) on delete cascade,
  provider_account_ref text not null,
  name text not null,
  account_type text not null check (account_type in ('checking','savings','credit','loan','investment','other')),
  currency text not null default 'USD',
  status text not null default 'active' check (status in ('pending','active','reauthorization-required','disconnected','error')),
  linked_record_type text check (linked_record_type in ('debt','funding_source','retirement','other')),
  linked_record_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, connection_id, provider_account_ref)
);

create table if not exists public.money_balance_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  connected_account_id uuid not null references public.money_connected_accounts(id) on delete cascade,
  current_balance numeric not null,
  available_balance numeric,
  credit_limit numeric,
  currency text not null default 'USD',
  provider_observed_at timestamptz,
  retrieved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists money_connected_accounts_owner_idx on public.money_connected_accounts(owner_id);
create index if not exists money_balance_snapshots_account_retrieved_idx on public.money_balance_snapshots(connected_account_id, retrieved_at desc);

alter table public.money_institution_connections enable row level security;
alter table public.money_connected_accounts enable row level security;
alter table public.money_balance_snapshots enable row level security;

create policy "money institution connections owner read" on public.money_institution_connections for select using (auth.uid() = owner_id);
create policy "money institution connections owner insert" on public.money_institution_connections for insert with check (auth.uid() = owner_id);
create policy "money institution connections owner update" on public.money_institution_connections for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "money institution connections owner delete" on public.money_institution_connections for delete using (auth.uid() = owner_id);

create policy "money connected accounts owner read" on public.money_connected_accounts for select using (auth.uid() = owner_id);
create policy "money connected accounts owner insert" on public.money_connected_accounts for insert with check (auth.uid() = owner_id);
create policy "money connected accounts owner update" on public.money_connected_accounts for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "money connected accounts owner delete" on public.money_connected_accounts for delete using (auth.uid() = owner_id);

create policy "money balance snapshots owner read" on public.money_balance_snapshots for select using (auth.uid() = owner_id);
create policy "money balance snapshots owner insert" on public.money_balance_snapshots for insert with check (auth.uid() = owner_id);
create policy "money balance snapshots owner delete" on public.money_balance_snapshots for delete using (auth.uid() = owner_id);
