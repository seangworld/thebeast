-- Forward-only canonical reconciliation for Beast runtime schema.
--
-- cache_settings was an early migration artifact and is not referenced by the
-- current application. user_settings is legacy production data and must remain
-- untouched. cash_settings and debt_settings may use user_id as their primary
-- key in production; do not rewrite those primary keys.

drop table if exists public.cache_settings;

do $$
begin
  if to_regclass('public.cash_settings') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'cash_settings'
        and column_name = 'user_id'
    )
    and not exists (
      select 1
      from pg_index i
      join pg_class t on t.oid = i.indrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'cash_settings'
        and i.indisunique
        and (
          select array_agg(a.attname order by k.ordinality)
          from unnest(i.indkey) with ordinality as k(attnum, ordinality)
          join pg_attribute a
            on a.attrelid = t.oid
           and a.attnum = k.attnum
        ) = array['user_id'::name]
    )
  then
    create unique index cash_settings_user_id_unique_idx
      on public.cash_settings (user_id);
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.debt_settings') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'debt_settings'
        and column_name = 'user_id'
    )
    and not exists (
      select 1
      from pg_index i
      join pg_class t on t.oid = i.indrelid
      join pg_namespace n on n.oid = t.relnamespace
      where n.nspname = 'public'
        and t.relname = 'debt_settings'
        and i.indisunique
        and (
          select array_agg(a.attname order by k.ordinality)
          from unnest(i.indkey) with ordinality as k(attnum, ordinality)
          join pg_attribute a
            on a.attrelid = t.oid
           and a.attnum = k.attnum
        ) = array['user_id'::name]
    )
  then
    create unique index debt_settings_user_id_unique_idx
      on public.debt_settings (user_id);
  end if;
end;
$$;
