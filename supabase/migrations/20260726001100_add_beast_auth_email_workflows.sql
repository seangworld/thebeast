-- BA-107: authoritative email verification and pending-change visibility.
--
-- Supabase Auth remains the source of truth. This owner-checked projection
-- exposes only the fields BeastAdmin needs and never exposes tokens, identities,
-- phone numbers, or provider metadata.

create or replace function public.get_beast_admin_member_email_statuses()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', auth_user.id,
        'currentEmail', auth_user.email,
        'emailVerificationStatus', case
          when auth_user.email is null then 'not_provided'
          when auth_user.email_confirmed_at is not null then 'verified'
          else 'unverified'
        end,
        'pendingEmail', nullif(btrim(auth_user.email_change), ''),
        'emailChangeSentAt', auth_user.email_change_sent_at
      )
      order by auth_user.created_at desc, auth_user.id
    ),
    '[]'::jsonb
  )
  into result
  from auth.users auth_user;

  return result;
end;
$$;

revoke all on function public.get_beast_admin_member_email_statuses()
  from public;
revoke all on function public.get_beast_admin_member_email_statuses()
  from anon;
grant execute on function public.get_beast_admin_member_email_statuses()
  to authenticated;

alter table public.beast_admin_member_account_audit_events
  drop constraint if exists beast_admin_member_account_audit_action_check;

alter table public.beast_admin_member_account_audit_events
  add constraint beast_admin_member_account_audit_action_check check (
    action in ('account_updated', 'email_verification_resent')
  );
