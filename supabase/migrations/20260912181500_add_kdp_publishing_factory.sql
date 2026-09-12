-- KDP-001 owner-only publishing factory queue. No Amazon submission authority.
create table if not exists public.kdp_publications (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  audience text not null check (char_length(audience) between 1 and 500),
  topic text not null check (char_length(topic) between 1 and 500),
  formats text[] not null default array['ebook']::text[] check (formats <@ array['ebook','paperback','hardcover']::text[] and cardinality(formats) > 0),
  state text not null default 'idea' check (state in ('idea','scored','brief_approved','drafting','quality_review','package_ready','owner_approved','submitted','published','measured','rejected','blocked')),
  opportunity_inputs jsonb not null default '{}'::jsonb,
  opportunity_score integer check (opportunity_score between 0 and 100),
  pricing jsonb not null default '{}'::jsonb,
  package_evidence jsonb not null default '{}'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  owner_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kdp_publications_owner_updated_idx on public.kdp_publications(owner_id, updated_at desc);
alter table public.kdp_publications enable row level security;
grant select, insert, update on public.kdp_publications to authenticated;

create policy "KDP publications are owner readable" on public.kdp_publications for select to authenticated using (
  (select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);
create policy "KDP publications are owner insertable" on public.kdp_publications for insert to authenticated with check (
  (select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);
create policy "KDP publications are owner updateable" on public.kdp_publications for update to authenticated using (
  (select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
) with check (
  (select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);
