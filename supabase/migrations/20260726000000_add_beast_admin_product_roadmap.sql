-- BA-102: durable, owner-scoped cross-product roadmap management.
-- Feature state and private owner notes are intentionally separate from the
-- public module/version registries and are never exposed to member roles.

create extension if not exists pgcrypto;

create table if not exists public.beast_admin_roadmap_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  title text not null,
  summary text not null default '',
  status text not null default 'planned',
  owner_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_admin_roadmap_product_check check (
    product_id in (
      'beastos',
      'money',
      'education',
      'health',
      'goals',
      'documents',
      'home',
      'fusion',
      'seangworld',
      'future'
    )
  ),
  constraint beast_admin_roadmap_status_check check (
    status in ('planned', 'in_progress', 'testing', 'released', 'archived')
  ),
  constraint beast_admin_roadmap_title_check check (
    char_length(btrim(title)) > 0
  )
);

create index if not exists beast_admin_roadmap_items_owner_updated_idx
  on public.beast_admin_roadmap_items (user_id, updated_at desc);

create index if not exists beast_admin_roadmap_items_owner_product_status_idx
  on public.beast_admin_roadmap_items (user_id, product_id, status);

create or replace function public.set_beast_admin_roadmap_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_beast_admin_roadmap_updated_at
  on public.beast_admin_roadmap_items;
create trigger set_beast_admin_roadmap_updated_at
  before update on public.beast_admin_roadmap_items
  for each row
  execute function public.set_beast_admin_roadmap_updated_at();

alter table public.beast_admin_roadmap_items enable row level security;

drop policy if exists "Owners can read their roadmap" on public.beast_admin_roadmap_items;
create policy "Owners can read their roadmap"
  on public.beast_admin_roadmap_items
  for select
  using (public.is_profile_admin() and auth.uid() = user_id);

drop policy if exists "Owners can create roadmap items" on public.beast_admin_roadmap_items;
create policy "Owners can create roadmap items"
  on public.beast_admin_roadmap_items
  for insert
  with check (public.is_profile_admin() and auth.uid() = user_id);

drop policy if exists "Owners can update their roadmap" on public.beast_admin_roadmap_items;
create policy "Owners can update their roadmap"
  on public.beast_admin_roadmap_items
  for update
  using (public.is_profile_admin() and auth.uid() = user_id)
  with check (public.is_profile_admin() and auth.uid() = user_id);

grant select, insert, update on public.beast_admin_roadmap_items to authenticated;
