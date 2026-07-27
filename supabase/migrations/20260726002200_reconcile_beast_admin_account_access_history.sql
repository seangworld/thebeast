-- BA-134 / BA-ACC-101: forward-only account access reconciliation.
--
-- This file intentionally excludes the historical audit-action constraint
-- replacement. It creates missing access-control structures without deleting,
-- resetting, or rewriting existing authentication controls, events, or audits.

-- BA-109: owner-only account access history and session controls.
--
-- Supabase Auth remains authoritative for sign-in and session state. BeastOS
-- reads retained Auth audit evidence, never returns IP addresses or raw user
-- agents to the browser, and stores only owner security actions for 90 days.

create table if not exists public.beast_admin_member_auth_controls (
  member_id uuid primary key references auth.users(id) on delete cascade,
  fresh_sign_in_required_after timestamptz null,
  suspicious_activity_flagged boolean not null default false,
  suspicious_activity_flagged_at timestamptz null,
  suspicious_activity_flagged_by uuid null
    references auth.users(id) on delete restrict,
  suspicious_activity_reason text null,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint beast_admin_member_auth_controls_reason_check check (
    suspicious_activity_reason is null
    or char_length(btrim(suspicious_activity_reason)) between 1 and 500
  ),
  constraint beast_admin_member_auth_controls_flag_check check (
    (
      suspicious_activity_flagged
      and suspicious_activity_flagged_at is not null
      and suspicious_activity_flagged_by is not null
      and suspicious_activity_reason is not null
    )
    or (
      not suspicious_activity_flagged
      and suspicious_activity_flagged_at is null
      and suspicious_activity_flagged_by is null
      and suspicious_activity_reason is null
    )
  )
);

create table if not exists public.beast_admin_member_auth_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  member_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  reason text null,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null
    default (timezone('utc', now()) + interval '90 days'),
  constraint beast_admin_member_auth_events_action_check check (
    action in (
      'beastos_sessions_revoked',
      'fresh_sign_in_required',
      'suspicious_activity_flagged',
      'suspicious_activity_cleared'
    )
  ),
  constraint beast_admin_member_auth_events_reason_check check (
    reason is null or char_length(btrim(reason)) between 1 and 500
  ),
  constraint beast_admin_member_auth_events_retention_check check (
    expires_at > created_at
    and expires_at <= created_at + interval '90 days'
  )
);

create index if not exists beast_admin_member_auth_events_member_idx
  on public.beast_admin_member_auth_events (member_id, created_at desc);

create index if not exists beast_admin_member_auth_events_expiry_idx
  on public.beast_admin_member_auth_events (expires_at);

do $reconcile$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_beast_admin_member_auth_controls_updated_at'
      and tgrelid = 'public.beast_admin_member_auth_controls'::regclass
      and not tgisinternal
  ) then
    create trigger set_beast_admin_member_auth_controls_updated_at
      before update on public.beast_admin_member_auth_controls
      for each row
      execute function public.set_beast_admin_feature_flag_updated_at();
  end if;
end;
$reconcile$;

alter table public.beast_admin_member_auth_controls enable row level security;
alter table public.beast_admin_member_auth_events enable row level security;

do $reconcile$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'beast_admin_member_auth_controls'
      and policyname = 'Owners read member authentication controls'
  ) then
    create policy "Owners read member authentication controls"
      on public.beast_admin_member_auth_controls
      for select
      using (public.is_profile_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'beast_admin_member_auth_events'
      and policyname = 'Owners read retained member authentication events'
  ) then
    create policy "Owners read retained member authentication events"
      on public.beast_admin_member_auth_events
      for select
      using (
        public.is_profile_admin()
        and expires_at > timezone('utc', now())
      );
  end if;
end;
$reconcile$;

do $reconcile_function$
begin
  if to_regprocedure(
    'public.get_beast_admin_member_access_history(uuid,integer)'
  ) is null then
    execute $definition$
create function public.get_beast_admin_member_access_history(
  selected_member_id uuid,
  event_limit integer default 100
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $body$
declare
  result jsonb;
  selected_event_limit integer := least(greatest(event_limit, 1), 100);
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from auth.users auth_user
    where auth_user.id = selected_member_id
      and auth_user.deleted_at is null
  ) then
    raise exception 'The selected Auth account is not available'
      using errcode = 'P0002';
  end if;

  with provider_events as (
    select
      audit_event.id::text as id,
      coalesce(audit_event.payload::jsonb ->> 'action', 'unknown') as action,
      audit_event.created_at as occurred_at,
      coalesce(
        audit_event.payload::jsonb ->> 'user_agent',
        audit_event.payload::jsonb -> 'metadata' ->> 'user_agent',
        audit_event.payload::jsonb -> 'traits' ->> 'user_agent'
      ) as user_agent
    from auth.audit_log_entries audit_event
    where audit_event.created_at >=
      timezone('utc', now()) - interval '90 days'
      and coalesce(
        audit_event.payload::jsonb ->> 'actor_id',
        audit_event.payload::jsonb ->> 'user_id'
      ) = selected_member_id::text
      and coalesce(audit_event.payload::jsonb ->> 'action', '') in (
        'login',
        'logout',
        'token_revoked',
        'user_confirmation_requested',
        'user_modified',
        'user_recovery_requested',
        'user_updated_password'
      )
    order by audit_event.created_at desc
    limit selected_event_limit
  ),
  platform_events as (
    select
      combined_event.id,
      combined_event.action,
      combined_event.occurred_at,
      combined_event.reason
    from (
      select
        auth_event.id::text as id,
        auth_event.action,
        auth_event.created_at as occurred_at,
        auth_event.reason
      from public.beast_admin_member_auth_events auth_event
      where auth_event.member_id = selected_member_id
        and auth_event.expires_at > timezone('utc', now())

      union all

      select
        account_event.id::text as id,
        'authentication_email_changed' as action,
        account_event.created_at as occurred_at,
        null::text as reason
      from public.beast_admin_member_account_audit_events account_event
      where account_event.member_id = selected_member_id
        and account_event.created_at >=
          timezone('utc', now()) - interval '90 days'
        and account_event.action = 'account_updated'
        and account_event.changes
          -> 'authentication'
          -> 'email'
          ->> 'changed' = 'true'
    ) combined_event
    order by combined_event.occurred_at desc
    limit selected_event_limit
  )
  select jsonb_build_object(
    'memberId', auth_user.id,
    'lastSuccessfulSignInAt', auth_user.last_sign_in_at,
    'emailChangeSentAt', auth_user.email_change_sent_at,
    'retentionDays', 90,
    'providerAuditAvailable', true,
    'providerEvents', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', provider_event.id,
            'action', provider_event.action,
            'occurredAt', provider_event.occurred_at,
            'userAgent', provider_event.user_agent
          )
          order by provider_event.occurred_at desc
        )
        from provider_events provider_event
      ),
      '[]'::jsonb
    ),
    'platformEvents', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', platform_event.id,
            'action', platform_event.action,
            'occurredAt', platform_event.occurred_at,
            'reason', platform_event.reason
          )
          order by platform_event.occurred_at desc
        )
        from platform_events platform_event
      ),
      '[]'::jsonb
    ),
    'control', jsonb_build_object(
      'freshSignInRequiredAfter',
        auth_control.fresh_sign_in_required_after,
      'suspiciousActivityFlagged',
        coalesce(auth_control.suspicious_activity_flagged, false),
      'suspiciousActivityFlaggedAt',
        auth_control.suspicious_activity_flagged_at,
      'suspiciousActivityReason',
        auth_control.suspicious_activity_reason
    )
  )
  into result
  from auth.users auth_user
  left join public.beast_admin_member_auth_controls auth_control
    on auth_control.member_id = auth_user.id
  where auth_user.id = selected_member_id;

  return result;
end;
$body$
    $definition$;
  end if;
end;
$reconcile_function$;

do $reconcile_function$
begin
  if to_regprocedure(
    'public.is_current_beast_session_allowed()'
  ) is null then
    execute $definition$
create function public.is_current_beast_session_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $body$
  select coalesce(
    (
      select
        auth_control.fresh_sign_in_required_after is null
        or auth_user.last_sign_in_at >
          auth_control.fresh_sign_in_required_after
      from auth.users auth_user
      left join public.beast_admin_member_auth_controls auth_control
        on auth_control.member_id = auth_user.id
      where auth_user.id = auth.uid()
    ),
    false
  );
$body$
    $definition$;
  end if;
end;
$reconcile_function$;

do $reconcile_function$
begin
  if to_regprocedure(
    'public.apply_beast_admin_member_auth_control(uuid,uuid,text,text)'
  ) is null then
    execute $definition$
create function public.apply_beast_admin_member_auth_control(
  selected_actor_id uuid,
  selected_member_id uuid,
  selected_action text,
  selected_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $body$
declare
  action_at timestamptz := timezone('utc', now());
  audit_event_id uuid;
  auth_event_id uuid;
  prior_control public.beast_admin_member_auth_controls%rowtype;
  next_control public.beast_admin_member_auth_controls%rowtype;
  normalized_reason text := nullif(btrim(selected_reason), '');
begin
  if auth.role() <> 'service_role' then
    raise exception 'Server-only BeastAdmin authentication action required'
      using errcode = '42501';
  end if;

  if selected_actor_id is null
    or not exists (
      select 1
      from public.profiles actor_profile
      where actor_profile.id = selected_actor_id
        and actor_profile.role = 'admin'
    ) then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles member_profile
    join auth.users auth_user on auth_user.id = member_profile.id
    where member_profile.id = selected_member_id
      and member_profile.account_kind = 'member'
      and auth_user.deleted_at is null
  ) then
    raise exception 'Only managed member accounts support session controls'
      using errcode = 'P0002';
  end if;

  if selected_action not in (
    'revoke_sessions',
    'require_fresh_sign_in',
    'flag_suspicious',
    'clear_suspicious'
  ) then
    raise exception 'Authentication control action is invalid'
      using errcode = '22023';
  end if;

  if selected_action = 'flag_suspicious'
    and (
      normalized_reason is null
      or char_length(normalized_reason) > 500
    ) then
    raise exception 'A concise review reason is required'
      using errcode = '22023';
  end if;

  delete from public.beast_admin_member_auth_events
  where expires_at <= action_at;

  select *
  into prior_control
  from public.beast_admin_member_auth_controls
  where member_id = selected_member_id;

  insert into public.beast_admin_member_auth_controls (
    member_id,
    fresh_sign_in_required_after,
    suspicious_activity_flagged,
    suspicious_activity_flagged_at,
    suspicious_activity_flagged_by,
    suspicious_activity_reason
  )
  values (
    selected_member_id,
    case
      when selected_action in ('revoke_sessions', 'require_fresh_sign_in')
        then action_at
      else null
    end,
    selected_action = 'flag_suspicious',
    case when selected_action = 'flag_suspicious' then action_at else null end,
    case
      when selected_action = 'flag_suspicious' then selected_actor_id
      else null
    end,
    case when selected_action = 'flag_suspicious' then normalized_reason end
  )
  on conflict (member_id)
  do update set
    fresh_sign_in_required_after = case
      when selected_action in ('revoke_sessions', 'require_fresh_sign_in')
        then action_at
      else
        beast_admin_member_auth_controls.fresh_sign_in_required_after
    end,
    suspicious_activity_flagged = case
      when selected_action = 'flag_suspicious' then true
      when selected_action = 'clear_suspicious' then false
      else beast_admin_member_auth_controls.suspicious_activity_flagged
    end,
    suspicious_activity_flagged_at = case
      when selected_action = 'flag_suspicious' then action_at
      when selected_action = 'clear_suspicious' then null
      else beast_admin_member_auth_controls.suspicious_activity_flagged_at
    end,
    suspicious_activity_flagged_by = case
      when selected_action = 'flag_suspicious' then selected_actor_id
      when selected_action = 'clear_suspicious' then null
      else beast_admin_member_auth_controls.suspicious_activity_flagged_by
    end,
    suspicious_activity_reason = case
      when selected_action = 'flag_suspicious' then normalized_reason
      when selected_action = 'clear_suspicious' then null
      else beast_admin_member_auth_controls.suspicious_activity_reason
    end;

  select *
  into next_control
  from public.beast_admin_member_auth_controls
  where member_id = selected_member_id;

  insert into public.beast_admin_member_auth_events (
    actor_id,
    member_id,
    action,
    reason,
    created_at,
    expires_at
  )
  values (
    selected_actor_id,
    selected_member_id,
    case selected_action
      when 'revoke_sessions' then 'beastos_sessions_revoked'
      when 'require_fresh_sign_in' then 'fresh_sign_in_required'
      when 'flag_suspicious' then 'suspicious_activity_flagged'
      else 'suspicious_activity_cleared'
    end,
    case when selected_action = 'flag_suspicious' then normalized_reason end,
    action_at,
    action_at + interval '90 days'
  )
  returning id into auth_event_id;

  insert into public.beast_admin_member_account_audit_events (
    actor_id,
    member_id,
    action,
    changes
  )
  values (
    selected_actor_id,
    selected_member_id,
    case selected_action
      when 'revoke_sessions' then 'beastos_sessions_revoked'
      when 'require_fresh_sign_in' then 'fresh_sign_in_required'
      when 'flag_suspicious' then 'suspicious_activity_flagged'
      else 'suspicious_activity_cleared'
    end,
    jsonb_build_object(
      'occurredAt', action_at,
      'freshSignInRequiredAfter', case
        when selected_action in ('revoke_sessions', 'require_fresh_sign_in')
          then action_at
        else null
      end,
      'reason', case
        when selected_action = 'flag_suspicious' then normalized_reason
        else null
      end,
      'previousValue', jsonb_build_object(
        'freshSignInRequiredAfter',
          prior_control.fresh_sign_in_required_after,
        'suspiciousActivityFlagged',
          coalesce(prior_control.suspicious_activity_flagged, false),
        'suspiciousActivityReason',
          prior_control.suspicious_activity_reason
      ),
      'newValue', jsonb_build_object(
        'freshSignInRequiredAfter',
          next_control.fresh_sign_in_required_after,
        'suspiciousActivityFlagged',
          next_control.suspicious_activity_flagged,
        'suspiciousActivityReason',
          next_control.suspicious_activity_reason
      )
    )
  )
  returning id into audit_event_id;

  return jsonb_build_object(
    'eventId', auth_event_id,
    'auditEventId', audit_event_id,
    'action', selected_action,
    'occurredAt', action_at,
    'freshSignInRequiredAfter', case
      when selected_action in ('revoke_sessions', 'require_fresh_sign_in')
        then action_at
      else null
    end
  );
end;
$body$
    $definition$;
  end if;
end;
$reconcile_function$;

revoke all on function public.get_beast_admin_member_access_history(
  uuid,
  integer
) from public;
revoke all on function public.get_beast_admin_member_access_history(
  uuid,
  integer
) from anon;
revoke all on function public.is_current_beast_session_allowed()
  from public;
revoke all on function public.is_current_beast_session_allowed()
  from anon;
revoke all on function public.apply_beast_admin_member_auth_control(
  uuid,
  uuid,
  text,
  text
) from public;

grant execute on function public.get_beast_admin_member_access_history(
  uuid,
  integer
) to authenticated;
grant execute on function public.is_current_beast_session_allowed()
  to authenticated;
grant execute on function public.apply_beast_admin_member_auth_control(
  uuid,
  uuid,
  text,
  text
) to service_role;

notify pgrst, 'reload schema';
