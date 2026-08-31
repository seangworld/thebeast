create table public.beast_marketing_video_series (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160), description text not null default '', enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id, owner_id)
);

create table public.beast_marketing_video_controls (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  pause_all_publishing boolean not null default true,
  external_publishing_authorized boolean not null default false,
  automatic_publishing_authorized boolean not null default false,
  youtube_authorized boolean not null default false,
  updated_at timestamptz not null default now(),
  check (not automatic_publishing_authorized or external_publishing_authorized),
  check (not external_publishing_authorized or youtube_authorized)
);

create table public.beast_marketing_presenter_profiles (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null, presenter_type text not null check (presenter_type in ('faceless','future_owner_likeness','future_character')),
  visual_identity jsonb not null default '{}'::jsonb, voice_identity jsonb not null default '{}'::jsonb,
  presentation_rules jsonb not null default '{}'::jsonb, allowed_topics text[] not null default '{}', disclosure_rules text[] not null default '{}',
  provenance jsonb not null default '{}'::jsonb, active boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (id, owner_id)
);

create table public.beast_marketing_video_jobs (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid not null, presenter_profile_id uuid, state text not null default 'idea', revision integer not null default 1,
  idempotency_key text not null, topic jsonb not null default '{}'::jsonb, script jsonb not null default '{}'::jsonb,
  production jsonb not null default '{}'::jsonb, metadata jsonb not null default '{}'::jsonb, destination jsonb not null default '{}'::jsonb,
  quality jsonb not null default '{}'::jsonb, provenance jsonb not null default '{}'::jsonb, retry_count integer not null default 0,
  last_error text, scheduled_for timestamptz, published_identity jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (series_id, owner_id) references public.beast_marketing_video_series(id, owner_id) on delete cascade,
  foreign key (presenter_profile_id, owner_id) references public.beast_marketing_presenter_profiles(id, owner_id) on delete restrict,
  unique (owner_id, idempotency_key), unique (id, owner_id), check (retry_count between 0 and 20),
  check (state in ('idea','selected','scripted','generating','ready','scheduled','published','measuring','completed','scale','modify','stop','failed','skipped'))
);

create index beast_marketing_video_jobs_owner_state_idx on public.beast_marketing_video_jobs(owner_id, state, updated_at desc);
alter table public.beast_marketing_video_series enable row level security;
alter table public.beast_marketing_video_controls enable row level security;
alter table public.beast_marketing_presenter_profiles enable row level security;
alter table public.beast_marketing_video_jobs enable row level security;

create policy "BeastMarketing video series are owner only" on public.beast_marketing_video_series for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "BeastMarketing video controls are owner only" on public.beast_marketing_video_controls for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "BeastMarketing presenter profiles are owner only" on public.beast_marketing_presenter_profiles for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "BeastMarketing video jobs are owner only" on public.beast_marketing_video_jobs for all to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

revoke all on table public.beast_marketing_video_series, public.beast_marketing_video_controls, public.beast_marketing_presenter_profiles, public.beast_marketing_video_jobs from public, anon, authenticated;
grant select, insert, update, delete on table public.beast_marketing_video_series, public.beast_marketing_video_controls, public.beast_marketing_presenter_profiles, public.beast_marketing_video_jobs to authenticated;
