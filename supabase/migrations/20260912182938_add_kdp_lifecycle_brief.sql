-- KDP-002 structured brief and lifecycle handoff. Amazon submission remains owner-only.
alter table public.kdp_publications
  add column if not exists brief jsonb not null default '{}'::jsonb;

alter table public.kdp_publications drop constraint if exists kdp_publications_state_check;
alter table public.kdp_publications add constraint kdp_publications_state_check check (
  state in ('idea','scored','brief_ready','brief_approved','drafting','quality_review','package_ready','owner_approved','submitted','published','measured','rejected','blocked')
);
