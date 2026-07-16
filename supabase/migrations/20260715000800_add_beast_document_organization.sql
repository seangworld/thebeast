create table if not exists public.beast_document_folders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  parent_folder_id uuid,
  name text not null,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_document_folders_name_check check (length(trim(name)) > 0)
);

create unique index if not exists beast_document_folders_id_owner_id_unique_idx
on public.beast_document_folders (id, owner_id);

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'beast_document_folders'
      and constraint_name = 'beast_document_folders_parent_owner_fk'
  ) then
    alter table public.beast_document_folders
      add constraint beast_document_folders_parent_owner_fk
      foreign key (parent_folder_id, owner_id)
      references public.beast_document_folders (id, owner_id)
      on delete set null;
  end if;
end $$;

create unique index if not exists beast_document_folders_owner_parent_name_unique_idx
on public.beast_document_folders (owner_id, coalesce(parent_folder_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));

create index if not exists beast_document_folders_owner_parent_idx
on public.beast_document_folders (owner_id, parent_folder_id, sort_order, name);

alter table public.beast_document_folders enable row level security;

drop policy if exists "Users manage own BeastOS document folders"
on public.beast_document_folders;

create policy "Users manage own BeastOS document folders"
on public.beast_document_folders for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

alter table public.beast_documents
  add column if not exists description text,
  add column if not exists tags text[] not null default '{}',
  add column if not exists folder_id uuid,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'beast_documents'
      and constraint_name = 'beast_documents_folder_owner_fk'
  ) then
    alter table public.beast_documents
      add constraint beast_documents_folder_owner_fk
      foreign key (folder_id, owner_id)
      references public.beast_document_folders (id, owner_id)
      on delete set null;
  end if;
end $$;

create index if not exists beast_documents_owner_folder_idx
on public.beast_documents (owner_id, folder_id, created_at desc);

create index if not exists beast_documents_owner_category_status_idx
on public.beast_documents (owner_id, category, status, created_at desc);

create index if not exists beast_documents_tags_gin_idx
on public.beast_documents using gin (tags);

create table if not exists public.beast_document_collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'Active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_document_collections_name_check check (length(trim(name)) > 0),
  constraint beast_document_collections_status_check check (
    status in ('Active', 'Archived')
  )
);

create unique index if not exists beast_document_collections_id_owner_id_unique_idx
on public.beast_document_collections (id, owner_id);

create unique index if not exists beast_document_collections_owner_name_unique_idx
on public.beast_document_collections (owner_id, lower(name));

create index if not exists beast_document_collections_owner_status_idx
on public.beast_document_collections (owner_id, status, sort_order, name);

alter table public.beast_document_collections enable row level security;

drop policy if exists "Users manage own BeastOS document collections"
on public.beast_document_collections;

create policy "Users manage own BeastOS document collections"
on public.beast_document_collections for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create table if not exists public.beast_document_collection_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  collection_id uuid not null,
  document_id uuid not null,
  status text not null default 'Active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_document_collection_items_status_check check (
    status in ('Active', 'Archived')
  ),
  constraint beast_document_collection_items_collection_owner_fk
    foreign key (collection_id, owner_id)
    references public.beast_document_collections (id, owner_id)
    on delete cascade,
  constraint beast_document_collection_items_document_owner_fk
    foreign key (document_id, owner_id)
    references public.beast_documents (id, owner_id)
    on delete cascade
);

create unique index if not exists beast_document_collection_items_unique_idx
on public.beast_document_collection_items (owner_id, collection_id, document_id);

create index if not exists beast_document_collection_items_owner_document_idx
on public.beast_document_collection_items (owner_id, document_id, status);

create index if not exists beast_document_collection_items_owner_collection_idx
on public.beast_document_collection_items (owner_id, collection_id, status, sort_order);

alter table public.beast_document_collection_items enable row level security;

drop policy if exists "Users manage own BeastOS document collection items"
on public.beast_document_collection_items;

create policy "Users manage own BeastOS document collection items"
on public.beast_document_collection_items for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
