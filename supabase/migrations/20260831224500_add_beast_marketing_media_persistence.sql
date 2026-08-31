create table public.beast_marketing_video_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null,
  attempt_number integer not null check (attempt_number between 1 and 20),
  operation text not null check (operation in ('narration','visuals','composition')),
  provider_id text,
  provider_request_id text,
  idempotency_key text not null,
  status text not null default 'planned' check (status in ('planned','submitted','succeeded','failed','cancelled')),
  retryable boolean not null default false,
  error_category text,
  evidence jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (job_id, owner_id) references public.beast_marketing_video_jobs(id, owner_id) on delete cascade,
  unique (owner_id, idempotency_key),
  unique (id, owner_id)
);

create table public.beast_marketing_video_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null,
  attempt_id uuid,
  role text not null check (role in ('narration','visual','product_capture','caption','music','final_video')),
  storage_path text not null,
  mime_type text not null,
  source_type text not null check (source_type in ('generated','first_party','licensed')),
  provider_id text,
  provider_asset_id text,
  license_reference text,
  content_hash text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  duration_ms integer check (duration_ms is null or duration_ms > 0),
  status text not null default 'available' check (status in ('available','quarantined','superseded')),
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (job_id, owner_id) references public.beast_marketing_video_jobs(id, owner_id) on delete cascade,
  foreign key (attempt_id, owner_id) references public.beast_marketing_video_attempts(id, owner_id) on delete restrict,
  check (storage_path like owner_id::text || '/%'),
  check (char_length(content_hash) between 8 and 200),
  unique (owner_id, storage_path),
  unique (id, owner_id)
);

create index beast_marketing_video_attempts_job_idx on public.beast_marketing_video_attempts(owner_id, job_id, created_at desc);
create index beast_marketing_video_assets_job_idx on public.beast_marketing_video_assets(owner_id, job_id, created_at desc);

alter table public.beast_marketing_video_attempts enable row level security;
alter table public.beast_marketing_video_assets enable row level security;

create policy "BeastMarketing video attempts are owner readable" on public.beast_marketing_video_attempts for select to authenticated using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
create policy "BeastMarketing video attempts are owner insertable" on public.beast_marketing_video_attempts for insert to authenticated with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
create policy "BeastMarketing video attempts are owner updateable" on public.beast_marketing_video_attempts for update to authenticated using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')) with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
create policy "BeastMarketing video assets are owner readable" on public.beast_marketing_video_assets for select to authenticated using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
create policy "BeastMarketing video assets are owner insertable" on public.beast_marketing_video_assets for insert to authenticated with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
create policy "BeastMarketing video assets are owner updateable" on public.beast_marketing_video_assets for update to authenticated using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')) with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));

revoke all on table public.beast_marketing_video_attempts, public.beast_marketing_video_assets from public, anon, authenticated;
grant select, insert, update on table public.beast_marketing_video_attempts, public.beast_marketing_video_assets to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('beast-marketing-media', 'beast-marketing-media', false, 500000000, array['video/mp4','audio/mpeg','audio/wav','image/jpeg','image/png','image/webp','text/vtt','application/json'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "Owner reads BeastMarketing media" on storage.objects for select to authenticated using (
  bucket_id = 'beast-marketing-media' and auth.uid()::text = (storage.foldername(name))[1]
  and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);
create policy "Owner uploads BeastMarketing media" on storage.objects for insert to authenticated with check (
  bucket_id = 'beast-marketing-media' and auth.uid()::text = (storage.foldername(name))[1]
  and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);
create policy "Owner updates BeastMarketing media" on storage.objects for update to authenticated using (
  bucket_id = 'beast-marketing-media' and auth.uid()::text = (storage.foldername(name))[1]
  and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
) with check (
  bucket_id = 'beast-marketing-media' and auth.uid()::text = (storage.foldername(name))[1]
  and exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
);
