-- BA-134 / BA-AUTH-101: forward-only reconciliation for Auth email status.
--
-- The historical 01100 migration is unsafe to replay because it narrows the
-- immutable account-audit action constraint. This migration intentionally does
-- not alter any audit table, constraint, function, trigger, policy, or row.
-- It creates the current email-status RPC only when absent and reconciles only
-- the minimum execution privileges required by the application.

do $reconcile$
begin
  if to_regprocedure(
    'public.get_beast_admin_member_email_statuses()'
  ) is null then
    execute $definition$
      create function public.get_beast_admin_member_email_statuses()
      returns jsonb
      language plpgsql
      stable
      security definer
      set search_path = public
      as $body$
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
              'emailChangeSentAt', auth_user.email_change_sent_at,
              'verifiedAt', auth_user.email_confirmed_at,
              'lastVerificationEmailSentAt',
                verification_history.last_sent_at
            )
            order by auth_user.created_at desc, auth_user.id
          ),
          '[]'::jsonb
        )
        into result
        from auth.users auth_user
        left join lateral (
          select max(audit_event.created_at) as last_sent_at
          from public.beast_admin_member_account_audit_events audit_event
          where audit_event.member_id = auth_user.id
            and audit_event.action = 'email_verification_resent'
            and audit_event.outcome = 'succeeded'
        ) verification_history on true;

        return result;
      end;
      $body$
    $definition$;
  end if;
end;
$reconcile$;

revoke all on function public.get_beast_admin_member_email_statuses()
  from public;
revoke all on function public.get_beast_admin_member_email_statuses()
  from anon;
grant execute on function public.get_beast_admin_member_email_statuses()
  to authenticated;

notify pgrst, 'reload schema';
