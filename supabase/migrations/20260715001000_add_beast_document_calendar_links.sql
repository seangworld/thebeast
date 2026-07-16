create table if not exists public.beast_document_calendar_links (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null,
  calendar_item_id text,
  title text not null,
  summary text,
  status text not null default 'Active',
  reference_date date not null,
  start_time timestamptz,
  end_time timestamptz,
  source_module text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_document_calendar_links_document_owner_fk
    foreign key (document_id, owner_id)
    references public.beast_documents (id, owner_id)
    on delete cascade,
  constraint beast_document_calendar_links_status_check check (
    status in ('Active', 'Archived')
  ),
  constraint beast_document_calendar_links_title_check check (
    length(trim(title)) > 0
  ),
  constraint beast_document_calendar_links_time_check check (
    start_time is null
    or end_time is null
    or end_time >= start_time
  )
);

create index if not exists beast_document_calendar_links_owner_document_idx
on public.beast_document_calendar_links (owner_id, document_id, status);

create index if not exists beast_document_calendar_links_owner_date_idx
on public.beast_document_calendar_links (owner_id, reference_date, status);

create unique index if not exists beast_document_calendar_links_item_unique_idx
on public.beast_document_calendar_links (owner_id, document_id, calendar_item_id)
where calendar_item_id is not null and status = 'Active';

alter table public.beast_document_calendar_links enable row level security;

drop policy if exists "Users manage own BeastOS document calendar links"
on public.beast_document_calendar_links;

create policy "Users manage own BeastOS document calendar links"
on public.beast_document_calendar_links for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
