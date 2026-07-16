-- Adds optional identity and context fields for the shared BeastOS profile.
-- These are nullable so existing users continue working without backfill.

alter table public.profiles
  add column if not exists preferred_name text null,
  add column if not exists display_name text null,
  add column if not exists full_name text null,
  add column if not exists username text null,
  add column if not exists birthday date null,
  add column if not exists location text null,
  add column if not exists timezone text null,
  add column if not exists household_context text null,
  add column if not exists bio text null;
