-- SEC-002: restore the server-only execution boundary for privileged
-- BeastAdmin RPCs. These functions are invoked through the service-role
-- server client and must never be callable through the public Data API roles.

revoke execute on function public.get_beast_admin_auth_user_id_by_email(text)
  from anon, authenticated;
revoke execute on function public.accept_beast_admin_member_invitation(uuid)
  from anon, authenticated;
revoke execute on function public.apply_beast_admin_member_auth_control(
  uuid, uuid, text, text
) from anon, authenticated;
revoke execute on function public.create_beast_admin_member_invitation(
  uuid, uuid, text, text, text, uuid, text, text[], uuid[], text,
  timestamptz, timestamptz
) from anon, authenticated;
revoke execute on function public.record_beast_admin_account_audit_event(
  uuid, uuid, text, jsonb, jsonb, text, text, jsonb
) from anon, authenticated;
revoke execute on function public.record_beast_admin_invitation_action(
  uuid, uuid, text, timestamptz, timestamptz
) from anon, authenticated;
revoke execute on function public.update_beast_admin_member_account(
  uuid, text, text, text, text[], uuid[], jsonb, uuid
) from anon, authenticated;

grant execute on function public.get_beast_admin_auth_user_id_by_email(text)
  to service_role;
grant execute on function public.accept_beast_admin_member_invitation(uuid)
  to service_role;
grant execute on function public.apply_beast_admin_member_auth_control(
  uuid, uuid, text, text
) to service_role;
grant execute on function public.create_beast_admin_member_invitation(
  uuid, uuid, text, text, text, uuid, text, text[], uuid[], text,
  timestamptz, timestamptz
) to service_role;
grant execute on function public.record_beast_admin_account_audit_event(
  uuid, uuid, text, jsonb, jsonb, text, text, jsonb
) to service_role;
grant execute on function public.record_beast_admin_invitation_action(
  uuid, uuid, text, timestamptz, timestamptz
) to service_role;
grant execute on function public.update_beast_admin_member_account(
  uuid, text, text, text, text[], uuid[], jsonb, uuid
) to service_role;

notify pgrst, 'reload schema';
