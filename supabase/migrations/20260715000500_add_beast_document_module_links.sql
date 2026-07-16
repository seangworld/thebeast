create unique index if not exists beast_documents_id_owner_id_unique_idx
on public.beast_documents (id, owner_id);

create table if not exists public.beast_document_module_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null,
  source_module text not null,
  module_record_id text,
  title text not null,
  summary text,
  status text not null default 'Active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_document_module_links_document_owner_fk foreign key (document_id, owner_id)
    references public.beast_documents (id, owner_id) on delete cascade,
  constraint beast_document_module_links_status_check check (
    status in ('Active', 'Archived')
  )
);

create index if not exists beast_document_module_links_owner_document_idx
on public.beast_document_module_links (owner_id, document_id, created_at desc);

create index if not exists beast_document_module_links_owner_module_idx
on public.beast_document_module_links (owner_id, source_module, status);

alter table public.beast_document_module_links enable row level security;

drop policy if exists "Users manage own BeastOS document module links"
on public.beast_document_module_links;

create policy "Users manage own BeastOS document module links"
on public.beast_document_module_links for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
