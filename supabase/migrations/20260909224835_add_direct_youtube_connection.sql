create table public.beast_marketing_youtube_connections (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  channel_id text not null check (channel_id ~ '^UC[A-Za-z0-9_-]{22}$'),
  channel_title text not null,
  channel_handle text not null,
  scopes text[] not null,
  refresh_token_ciphertext text not null,
  refresh_token_iv text not null,
  refresh_token_tag text not null,
  connected_at timestamptz not null default now()
);
create table public.beast_marketing_youtube_uploads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  asset_id uuid not null,
  channel_id text not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  metadata jsonb not null check (jsonb_typeof(metadata) = 'object'),
  status text not null check (status in ('started','uploaded_private','unconfirmed')),
  video_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (owner_id,asset_id),
  foreign key (asset_id,owner_id) references public.beast_marketing_video_assets(id,owner_id) on delete restrict
);
alter table public.beast_marketing_youtube_connections enable row level security;
alter table public.beast_marketing_youtube_uploads enable row level security;
revoke all on public.beast_marketing_youtube_connections, public.beast_marketing_youtube_uploads from public,anon,authenticated;
grant all on public.beast_marketing_youtube_connections, public.beast_marketing_youtube_uploads to service_role;
-- Only server routes may read even encrypted credentials. Safe status is returned by the owner endpoint.
