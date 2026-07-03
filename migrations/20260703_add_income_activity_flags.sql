-- Adds explicit activity flags for recurring income sources.
-- Existing income rows remain active by default.

alter table public.income_events
  add column if not exists is_active boolean not null default true,
  add column if not exists is_archived boolean not null default false;
