create table if not exists public.beast_home_studio_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  project jsonb not null check (jsonb_typeof(project) = 'object'),
  plan jsonb check (plan is null or jsonb_typeof(plan) = 'object'),
  source_photo_count smallint not null default 0 check (source_photo_count between 0 and 4),
  schema_version smallint not null default 1 check (schema_version = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index if not exists beast_home_studio_projects_owner_updated_idx
  on public.beast_home_studio_projects (owner_id, updated_at desc);

alter table public.beast_home_studio_projects enable row level security;

revoke all on table public.beast_home_studio_projects from anon;
grant select, insert, update, delete on table public.beast_home_studio_projects to authenticated;

create policy "Members read their Home Studio projects"
  on public.beast_home_studio_projects for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "Members create their Home Studio projects"
  on public.beast_home_studio_projects for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Members update their Home Studio projects"
  on public.beast_home_studio_projects for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Members delete their Home Studio projects"
  on public.beast_home_studio_projects for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

create or replace function public.set_beast_home_studio_project_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_beast_home_studio_project_updated_at() from public;

create trigger set_beast_home_studio_project_updated_at
before update on public.beast_home_studio_projects
for each row execute function public.set_beast_home_studio_project_updated_at();
