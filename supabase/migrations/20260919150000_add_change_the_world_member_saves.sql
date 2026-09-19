create table if not exists public.change_the_world_saves (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  scenario_id text not null check (scenario_id in ('chesapeake-2026', 'harbor-point')),
  title text not null check (char_length(title) between 1 and 120),
  state jsonb not null check (jsonb_typeof(state) = 'object' and octet_length(state::text) <= 1048576),
  schema_version integer not null check (schema_version > 0),
  product_version text not null check (product_version ~ '^[0-9]+\\.[0-9]+\\.[0-9]+'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, scenario_id)
);

alter table public.change_the_world_saves enable row level security;

revoke all on table public.change_the_world_saves from public, anon, authenticated;
grant select, insert, update, delete on table public.change_the_world_saves to authenticated;

drop policy if exists "members_read_own_change_the_world_saves" on public.change_the_world_saves;
create policy "members_read_own_change_the_world_saves"
on public.change_the_world_saves
for select
to authenticated
using ((select auth.uid()) = owner_id);

drop policy if exists "members_create_own_change_the_world_saves" on public.change_the_world_saves;
create policy "members_create_own_change_the_world_saves"
on public.change_the_world_saves
for insert
to authenticated
with check ((select auth.uid()) = owner_id);

drop policy if exists "members_update_own_change_the_world_saves" on public.change_the_world_saves;
create policy "members_update_own_change_the_world_saves"
on public.change_the_world_saves
for update
to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

drop policy if exists "members_delete_own_change_the_world_saves" on public.change_the_world_saves;
create policy "members_delete_own_change_the_world_saves"
on public.change_the_world_saves
for delete
to authenticated
using ((select auth.uid()) = owner_id);

comment on table public.change_the_world_saves is
  'Owner-only, explicit cloud saves for Change the World public testing.';
