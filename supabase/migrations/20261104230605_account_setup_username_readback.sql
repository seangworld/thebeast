-- Additive self-read only. Existing registry, usernames, IDs and profile handles stay unchanged.
-- Apply only after local/DEV acceptance and separate production migration approval.
create function public.beast_auth_current_username() returns text
language sql stable security definer set search_path = '' as $$
  select username from beast_identity.usernames
  where user_id = (select auth.uid()) and (select auth.uid()) is not null;
$$;
revoke all on function public.beast_auth_current_username() from public, anon;
grant execute on function public.beast_auth_current_username() to authenticated;
