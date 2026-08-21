begin;

alter table public.beast_hunter_opportunities
  add column if not exists roadmap_item_id uuid references public.beast_admin_roadmap_items(id) on delete set null;

alter table public.beast_admin_roadmap_items
  add column if not exists source_type text,
  add column if not exists source_id uuid,
  add column if not exists execution_status text not null default 'not_queued'
    check (execution_status in ('not_queued', 'ready', 'in_progress', 'completed', 'blocked')),
  add column if not exists execution_payload jsonb,
  add column if not exists is_next_build boolean not null default false,
  add column if not exists github_issue_number integer,
  add column if not exists github_issue_url text,
  add column if not exists queued_at timestamptz;

create unique index if not exists beast_admin_one_next_build_per_owner_idx
  on public.beast_admin_roadmap_items (user_id)
  where is_next_build;

create unique index if not exists beast_admin_roadmap_source_idx
  on public.beast_admin_roadmap_items (user_id, source_type, source_id)
  where source_type is not null and source_id is not null;

create index if not exists beast_hunter_opportunities_roadmap_idx
  on public.beast_hunter_opportunities (roadmap_item_id)
  where roadmap_item_id is not null;

commit;
