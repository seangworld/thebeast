-- KDP-003 owner-scoped chapter drafting with attributable source notes.
create table if not exists public.kdp_chapters (
  id uuid primary key default gen_random_uuid(),
  publication_id uuid not null references public.kdp_publications(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  chapter_number integer not null check (chapter_number between 1 and 100),
  title text not null check (char_length(title) between 1 and 180),
  status text not null default 'planned' check (status in ('planned','generating','review_ready','approved','blocked')),
  draft_text text not null default '',
  word_count integer not null default 0 check (word_count >= 0),
  source_notes jsonb not null default '[]'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  provider_model text,
  generated_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (publication_id, chapter_number)
);

create index if not exists kdp_chapters_publication_order_idx on public.kdp_chapters(publication_id, chapter_number);
alter table public.kdp_chapters enable row level security;
grant select, insert, update on public.kdp_chapters to authenticated;

create policy "KDP chapters are owner readable" on public.kdp_chapters for select to authenticated using (
  (select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);
create policy "KDP chapters are owner insertable" on public.kdp_chapters for insert to authenticated with check (
  (select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);
create policy "KDP chapters are owner updateable" on public.kdp_chapters for update to authenticated using (
  (select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
) with check (
  (select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
);
