-- Additive self-read only. Existing registry, usernames, IDs and profile handles stay unchanged.
-- Apply only after local/DEV acceptance and separate production migration approval.
create function public.beast_auth_current_username() returns text
language sql stable security definer set search_path = '' as $$
  select username from beast_identity.usernames
  where user_id = (select auth.uid()) and (select auth.uid()) is not null;
$$;
revoke all on function public.beast_auth_current_username() from public, anon;
grant execute on function public.beast_auth_current_username() to authenticated;

-- Shared application contract: no caller-selected identity and no new identity store.
create function public.beast_auth_account_setup_complete() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from beast_identity.usernames n
    join auth.users u on u.id = n.user_id
    join public.profiles p on p.id = n.user_id
    where n.user_id = (select auth.uid())
      and u.email_confirmed_at is not null
      and coalesce(nullif(btrim(p.preferred_name), ''), nullif(btrim(p.display_name), ''), nullif(btrim(p.full_name), '')) is not null
      and p.birthday is not null
  );
$$;
revoke all on function public.beast_auth_account_setup_complete() from public, anon;
grant execute on function public.beast_auth_account_setup_complete() to authenticated;
