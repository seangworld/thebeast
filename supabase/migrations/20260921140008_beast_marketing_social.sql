begin;

-- All writes go through owner-authorized server routes. Tokens and OAuth state
-- have no browser/Data API grants, even for the owner.
create table public.beast_marketing_social_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('facebook_page','instagram','x')),
  account_id text not null,
  label text not null,
  credentials jsonb not null,
  expires_at timestamptz,
  disconnected_at timestamptz,
  connected_at timestamptz not null default now(),
  unique (owner_id, channel, account_id),
  unique (id, owner_id)
);
create table public.beast_marketing_social_oauth (
  state_hash text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('meta','x')),
  verifier text not null,
  expires_at timestamptz not null
);
create table public.beast_marketing_social_controls (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  paused boolean not null default true,
  x_paid_enabled boolean not null default false
);
create table public.beast_marketing_social_posts (
  id uuid primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('facebook_personal','facebook_page','instagram','x')),
  connection_id uuid,
  content jsonb not null check (jsonb_typeof(content) = 'object' and octet_length(content::text) < 20000),
  revision integer not null default 1 check (revision > 0),
  approved_revision integer,
  approved_at timestamptz,
  status text not null default 'draft' check (status in ('draft','scheduled','publishing','processing','published','unconfirmed','failed','cancelled','shared_manually')),
  scheduled_at timestamptz,
  provider_container_id text,
  provider_post_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  foreign key (connection_id, owner_id) references public.beast_marketing_social_connections(id, owner_id),
  check (status not in ('scheduled','publishing','processing','published') or (approved_revision is not null and approved_revision = revision and approved_at is not null and connection_id is not null and channel <> 'facebook_personal'))
);
create index social_posts_due on public.beast_marketing_social_posts (scheduled_at) where status in ('scheduled','processing');
create index social_posts_owner on public.beast_marketing_social_posts (owner_id, created_at desc);
create index social_oauth_expiry on public.beast_marketing_social_oauth (expires_at);
create index social_posts_connection on public.beast_marketing_social_posts (connection_id,owner_id);
alter table public.beast_marketing_social_connections enable row level security;
alter table public.beast_marketing_social_oauth enable row level security;
alter table public.beast_marketing_social_controls enable row level security;
alter table public.beast_marketing_social_posts enable row level security;
revoke all on public.beast_marketing_social_connections, public.beast_marketing_social_oauth, public.beast_marketing_social_controls, public.beast_marketing_social_posts from public, anon, authenticated;
grant all on public.beast_marketing_social_connections, public.beast_marketing_social_oauth, public.beast_marketing_social_controls, public.beast_marketing_social_posts to service_role;
grant select on public.beast_marketing_social_posts to authenticated;
create policy social_posts_owner_read on public.beast_marketing_social_posts for select to authenticated
  using (owner_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

-- This bucket holds only media explicitly uploaded for public social posts.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('beast-marketing-social','beast-marketing-social',true,52428800,array['image/jpeg','image/png','video/mp4']);
-- Signed, non-overwriting uploads issued only by the owner route. Bucket enforces MIME and size.
commit;
