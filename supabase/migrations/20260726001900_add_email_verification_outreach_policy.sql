-- BA-130: owner-only verification outreach, transparent access policy, and
-- immutable verification history.
--
-- This migration does not restrict any member feature. Verification-required
-- rules must be explicitly approved and enabled in persisted policy before an
-- exception can be created. Supabase Auth remains authoritative for email and
-- verification state.

create table if not exists public.beast_email_verification_policy_rules (
  policy_key text primary key,
  feature_label text not null,
  feature_class text not null,
  restriction_enabled boolean not null default false,
  exception_allowed boolean not null default false,
  approved_at timestamptz null,
  approved_by uuid null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint beast_email_verification_policy_key_check check (
    policy_key ~ '^[a-z][a-z0-9._-]{2,99}$'
  ),
  constraint beast_email_verification_policy_label_check check (
    char_length(btrim(feature_label)) between 1 and 120
  ),
  constraint beast_email_verification_policy_class_check check (
    feature_class in (
      'essential',
      'allowed_before_verification',
      'verification_required'
    )
  ),
  constraint beast_email_verification_policy_approval_check check (
    (
      restriction_enabled = false
      and exception_allowed = false
    )
    or (
      feature_class = 'verification_required'
      and approved_at is not null
      and approved_by is not null
    )
  )
);

create table if not exists public.beast_email_verification_exceptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references auth.users(id) on delete restrict,
  policy_key text not null references
    public.beast_email_verification_policy_rules(policy_key)
    on delete restrict,
  reason text not null,
  expires_at timestamptz not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz null,
  revoked_by uuid null references auth.users(id) on delete restrict,
  constraint beast_email_verification_exception_reason_check check (
    char_length(btrim(reason)) between 1 and 500
  ),
  constraint beast_email_verification_exception_expiry_check check (
    expires_at > created_at
  ),
  constraint beast_email_verification_exception_revocation_check check (
    (revoked_at is null and revoked_by is null)
    or (revoked_at is not null and revoked_by is not null)
  )
);

create unique index if not exists
  beast_email_verification_active_exception_idx
  on public.beast_email_verification_exceptions(member_id, policy_key)
  where revoked_at is null;

create index if not exists beast_email_verification_exception_member_idx
  on public.beast_email_verification_exceptions(member_id, created_at desc);

alter table public.beast_email_verification_policy_rules
  enable row level security;
alter table public.beast_email_verification_exceptions
  enable row level security;

drop policy if exists beast_email_verification_policy_owner_read
  on public.beast_email_verification_policy_rules;
create policy beast_email_verification_policy_owner_read
  on public.beast_email_verification_policy_rules
  for select
  to authenticated
  using (public.is_profile_admin());

drop policy if exists beast_email_verification_exception_owner_read
  on public.beast_email_verification_exceptions;
create policy beast_email_verification_exception_owner_read
  on public.beast_email_verification_exceptions
  for select
  to authenticated
  using (public.is_profile_admin());

revoke all on table public.beast_email_verification_policy_rules
  from anon, authenticated;
revoke all on table public.beast_email_verification_exceptions
  from anon, authenticated;
grant select on table public.beast_email_verification_policy_rules
  to authenticated;
grant select on table public.beast_email_verification_exceptions
  to authenticated;

alter table public.beast_admin_member_account_audit_events
  drop constraint if exists beast_admin_member_account_audit_action_check;
alter table public.beast_admin_member_account_audit_events
  add constraint beast_admin_member_account_audit_action_check check (
    action in (
      'account_updated',
      'email_verification_resent',
      'invitation_sent',
      'invitation_resent',
      'invitation_revoked',
      'invitation_accepted',
      'email_changed',
      'role_changed',
      'account_suspended',
      'account_restored',
      'module_access_changed',
      'beta_assignment_changed',
      'password_reset_triggered',
      'beastos_sessions_revoked',
      'fresh_sign_in_required',
      'suspicious_activity_flagged',
      'suspicious_activity_cleared',
      'account_deletion_requested',
      'account_deletion_canceled',
      'admin_account_message_sent',
      'email_verification_reminder_sent',
      'email_verification_policy_exception_added',
      'email_verification_policy_exception_removed',
      'email_became_verified'
    )
  );

create or replace function public.get_beast_admin_member_email_statuses()
returns jsonb
language plpgsql
stable
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
        'emailChangeSentAt', auth_user.email_change_sent_at,
        'verifiedAt', auth_user.email_confirmed_at,
        'lastVerificationEmailSentAt', verification_history.last_sent_at
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
$$;

create or replace function public.send_beast_admin_verification_reminder(
  selected_member_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  result jsonb;
  reminder_subject constant text := 'Verify your Beast account email';
  reminder_body constant text :=
    'Your Beast account email has not been verified yet. Please use the verification link sent to your login email. Verification helps protect your account and may be required before certain account features become available.';
begin
  if actor_id is null or not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from auth.users auth_user
    join public.profiles profile on profile.id = auth_user.id
    where auth_user.id = selected_member_id
      and auth_user.email is not null
      and auth_user.email_confirmed_at is null
      and auth_user.deleted_at is null
      and profile.role <> 'admin'
      and profile.account_kind = 'member'
  ) then
    raise exception
      'Verification reminders require an unverified individual Beast member'
      using errcode = '22023';
  end if;

  result := public.send_beast_admin_message(
    selected_member_id,
    reminder_subject || E'\n\n' || reminder_body,
    'account',
    null,
    null
  );

  insert into public.beast_admin_member_account_audit_events (
    actor_id,
    member_id,
    action,
    changes,
    previous_value,
    new_value,
    outcome,
    reason
  )
  values (
    actor_id,
    selected_member_id,
    'email_verification_reminder_sent',
    jsonb_build_object(
      'template', 'beast.account.email-verification-reminder.v1'
    ),
    '{}'::jsonb,
    jsonb_build_object('subject', reminder_subject),
    'succeeded',
    'Private reminder sent; message body excluded from audit.'
  );

  return result;
end;
$$;

create or replace function public.set_beast_admin_email_verification_exception(
  selected_member_id uuid,
  selected_policy_key text,
  selected_expires_at timestamptz,
  selected_reason text,
  selected_remove boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  selected_rule public.beast_email_verification_policy_rules%rowtype;
  selected_exception public.beast_email_verification_exceptions%rowtype;
begin
  if actor_id is null or not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  select *
  into selected_rule
  from public.beast_email_verification_policy_rules policy_rule
  where policy_rule.policy_key = selected_policy_key
    and policy_rule.feature_class = 'verification_required'
    and policy_rule.restriction_enabled = true
    and policy_rule.exception_allowed = true
    and policy_rule.approved_at is not null
    and policy_rule.approved_by is not null;

  if not found then
    raise exception
      'No owner-approved verification exception policy exists for this feature'
      using errcode = '42501';
  end if;

  if selected_remove then
    update public.beast_email_verification_exceptions
    set
      revoked_at = timezone('utc', now()),
      revoked_by = actor_id
    where member_id = selected_member_id
      and policy_key = selected_policy_key
      and revoked_at is null
    returning * into selected_exception;

    if not found then
      raise exception 'No active verification exception exists'
        using errcode = '22023';
    end if;
  else
    if selected_expires_at is null
      or selected_expires_at <= timezone('utc', now())
      or selected_expires_at > timezone('utc', now()) + interval '90 days'
      or char_length(btrim(coalesce(selected_reason, ''))) not between 1 and 500
    then
      raise exception 'Verification exception details are invalid'
        using errcode = '22023';
    end if;

    insert into public.beast_email_verification_exceptions (
      member_id,
      policy_key,
      reason,
      expires_at,
      created_by
    )
    values (
      selected_member_id,
      selected_policy_key,
      btrim(selected_reason),
      selected_expires_at,
      actor_id
    )
    returning * into selected_exception;
  end if;

  insert into public.beast_admin_member_account_audit_events (
    actor_id,
    member_id,
    action,
    changes,
    previous_value,
    new_value,
    outcome,
    reason
  )
  values (
    actor_id,
    selected_member_id,
    case
      when selected_remove
        then 'email_verification_policy_exception_removed'
      else 'email_verification_policy_exception_added'
    end,
    jsonb_build_object('policyKey', selected_policy_key),
    case
      when selected_remove then jsonb_build_object(
        'expiresAt', selected_exception.expires_at
      )
      else '{}'::jsonb
    end,
    case
      when selected_remove then '{}'::jsonb
      else jsonb_build_object(
        'expiresAt', selected_exception.expires_at
      )
    end,
    'succeeded',
    case
      when selected_remove then 'Owner removed a temporary exception.'
      else btrim(selected_reason)
    end
  );

  return jsonb_build_object(
    'id', selected_exception.id,
    'memberId', selected_exception.member_id,
    'policyKey', selected_exception.policy_key,
    'expiresAt', selected_exception.expires_at,
    'revokedAt', selected_exception.revoked_at
  );
end;
$$;

create or replace function public.record_beast_email_became_verified()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null
    and new.email_confirmed_at is not null
  then
    insert into public.beast_admin_member_account_audit_events (
      actor_id,
      member_id,
      action,
      changes,
      previous_value,
      new_value,
      outcome,
      reason
    )
    values (
      new.id,
      new.id,
      'email_became_verified',
      jsonb_build_object('source', 'supabase_auth'),
      jsonb_build_object('verified', false),
      jsonb_build_object(
        'verified', true,
        'verifiedAt', new.email_confirmed_at
      ),
      'succeeded',
      'Supabase Auth confirmed the login email.'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists record_beast_email_became_verified on auth.users;
create trigger record_beast_email_became_verified
  after update of email_confirmed_at on auth.users
  for each row
  execute function public.record_beast_email_became_verified();

revoke all on function public.send_beast_admin_verification_reminder(uuid)
  from public, anon;
revoke all on function
  public.set_beast_admin_email_verification_exception(
    uuid,
    text,
    timestamptz,
    text,
    boolean
  )
  from public, anon;
revoke all on function public.record_beast_email_became_verified()
  from public;

grant execute on function public.get_beast_admin_member_email_statuses()
  to authenticated;
grant execute on function public.send_beast_admin_verification_reminder(uuid)
  to authenticated;
grant execute on function
  public.set_beast_admin_email_verification_exception(
    uuid,
    text,
    timestamptz,
    text,
    boolean
  )
  to authenticated;

notify pgrst, 'reload schema';
