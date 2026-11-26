-- Proposed only. Obtain owner approval before applying to Production.
-- BeastGuide uses the same verified account and username without requiring age.
begin;
create function public.beastguide_account_setup_complete() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from beast_identity.usernames n
    join auth.users u on u.id = n.user_id
    join public.profiles p on p.id = n.user_id
    where n.user_id = (select auth.uid())
      and u.email_confirmed_at is not null
      and coalesce(nullif(btrim(p.preferred_name), ''), nullif(btrim(p.display_name), ''), nullif(btrim(p.full_name), '')) is not null
  );
$$;
revoke all on function public.beastguide_account_setup_complete() from public, anon;
grant execute on function public.beastguide_account_setup_complete() to authenticated;
commit;
