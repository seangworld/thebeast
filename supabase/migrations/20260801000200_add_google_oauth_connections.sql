-- BA-ADS-202: owner-scoped encrypted Google OAuth connections.
create table if not exists public.google_oauth_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  scopes text[] not null default '{}',
  refresh_token_ciphertext text not null,
  refresh_token_iv text not null,
  refresh_token_tag text not null,
  provider_account_id text,
  account_display_name text,
  publisher_id text,
  connected_at timestamptz not null default now(),
  last_sync_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (owner_id, provider),
  constraint google_oauth_connections_provider_check check (
    provider in ('adsense', 'analytics', 'search_console', 'drive', 'calendar', 'gmail')
  )
);

alter table public.google_oauth_connections enable row level security;

create policy "Owners can manage their Google OAuth connections"
  on public.google_oauth_connections
  for all
  using (
    auth.uid() = owner_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    auth.uid() = owner_id
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

comment on table public.google_oauth_connections is
  'Server-only encrypted refresh-token records for owner-approved Google integrations.';
comment on column public.google_oauth_connections.refresh_token_ciphertext is
  'AES-256-GCM ciphertext. Tokens must never be returned to browser clients.';
