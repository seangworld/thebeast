-- Corrective preflight for BA-103 member account editing.
--
-- The canonical helper originates in
-- 20260726000400_add_beast_admin_feature_flags.sql. Some existing environments
-- have the feature-flag tables without this function because the BeastAdmin
-- SQL packages were applied manually or incompletely. BA-103 reuses the helper
-- for member module-access timestamps, so ensure it exists before 01000 creates
-- that trigger.

create or replace function public.set_beast_admin_feature_flag_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Match the established BeastAdmin timestamptz convention. now() represents
  -- one transaction-stable instant and is stored by PostgreSQL as UTC.
  new.updated_at = now();
  return new;
end;
$$;
-- Heal a database where 01000 was executed statement-by-statement and stopped
-- after creating the table but before creating its trigger. On a clean chain,
-- 01000 creates the table and trigger after this preflight.
do $$
begin
  if to_regclass('public.beast_admin_member_module_access') is not null then
    execute 'drop trigger if exists set_beast_admin_member_module_access_updated_at
      on public.beast_admin_member_module_access';
    execute 'create trigger set_beast_admin_member_module_access_updated_at
      before update on public.beast_admin_member_module_access
      for each row
      execute function public.set_beast_admin_feature_flag_updated_at()';
  end if;
end;
$$;
