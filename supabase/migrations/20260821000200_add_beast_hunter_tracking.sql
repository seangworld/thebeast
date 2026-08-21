begin;

alter table public.beast_hunter_opportunities
  add column if not exists tracking_status text not null default 'new'
  check (tracking_status in ('new', 'watch', 'validate', 'build', 'rejected', 'archived'));

create index if not exists beast_hunter_opportunities_owner_tracking_idx
  on public.beast_hunter_opportunities (owner_id, tracking_status, updated_at desc);

commit;
