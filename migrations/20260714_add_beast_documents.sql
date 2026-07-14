create table if not exists public.beast_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null,
  status text not null default 'Uploaded',
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  checksum text,
  source_module text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_documents_category_check check (
    category in (
      'Money',
      'Learning',
      'Identity',
      'Household',
      'Tax',
      'Legal',
      'Health',
      'Home',
      'Vehicle',
      'Other'
    )
  ),
  constraint beast_documents_status_check check (
    status in ('Uploaded', 'Ready', 'Archived', 'Deleted')
  ),
  constraint beast_documents_size_check check (size_bytes >= 0)
);

alter table public.beast_documents enable row level security;

create policy "Users manage own BeastOS documents"
on public.beast_documents
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
