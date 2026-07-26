-- BA-110: immutable owner-only account-management audit log.
--
-- The existing account audit table remains the single source of truth. This
-- migration adds explicit before/after/outcome fields, normalizes compound
-- account updates into searchable actions, rejects secret-bearing payloads,
-- and prevents every update or delete.

drop trigger if exists reject_beast_admin_account_audit_mutation
  on public.beast_admin_member_account_audit_events;

alter table public.beast_admin_member_account_audit_events
  add column if not exists previous_value jsonb not null default '{}'::jsonb,
  add column if not exists new_value jsonb not null default '{}'::jsonb,
  add column if not exists outcome text not null default 'succeeded',
  add column if not exists reason text null;

update public.beast_admin_member_account_audit_events audit_event
set
  previous_value = case
    when jsonb_typeof(audit_event.changes -> 'previousValue') = 'object'
      then audit_event.changes -> 'previousValue'
    when audit_event.action = 'account_updated' then jsonb_strip_nulls(
      jsonb_build_object(
        'displayName', audit_event.changes -> 'displayName' -> 'before',
        'role', audit_event.changes -> 'role' -> 'before',
        'email',
          audit_event.changes -> 'authentication' -> 'email' -> 'before',
        'accountStatus',
          audit_event.changes -> 'authentication'
            -> 'accountStatus' -> 'before',
        'moduleAccess',
          audit_event.changes -> 'authentication'
            -> 'moduleAccess' -> 'before',
        'betaFlagIds',
          audit_event.changes -> 'authentication'
            -> 'betaAssignments' -> 'before'
      )
    )
    else audit_event.previous_value
  end,
  new_value = case
    when jsonb_typeof(audit_event.changes -> 'newValue') = 'object'
      then audit_event.changes -> 'newValue'
    when audit_event.action = 'account_updated' then jsonb_strip_nulls(
      jsonb_build_object(
        'displayName', audit_event.changes -> 'displayName' -> 'after',
        'role', audit_event.changes -> 'role' -> 'after',
        'email',
          audit_event.changes -> 'authentication' -> 'email' -> 'after',
        'accountStatus',
          audit_event.changes -> 'authentication'
            -> 'accountStatus' -> 'after',
        'moduleAccess',
          coalesce(
            audit_event.changes -> 'authentication'
              -> 'moduleAccess' -> 'after',
            audit_event.changes -> 'moduleAccess'
          ),
        'betaFlagIds',
          coalesce(
            audit_event.changes -> 'authentication'
              -> 'betaAssignments' -> 'after',
            audit_event.changes -> 'betaFlagIds'
          )
      )
    )
    else audit_event.new_value
  end,
  reason = case
    when audit_event.reason is null
      and jsonb_typeof(audit_event.changes -> 'reason') = 'string'
      then nullif(btrim(audit_event.changes ->> 'reason'), '')
    else audit_event.reason
  end;

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
      'account_deletion_canceled'
    )
  );

alter table public.beast_admin_member_account_audit_events
  drop constraint if exists beast_admin_member_account_audit_outcome_check;
alter table public.beast_admin_member_account_audit_events
  add constraint beast_admin_member_account_audit_outcome_check check (
    outcome in ('succeeded', 'failed')
  );

alter table public.beast_admin_member_account_audit_events
  drop constraint if exists beast_admin_member_account_audit_previous_check;
alter table public.beast_admin_member_account_audit_events
  add constraint beast_admin_member_account_audit_previous_check check (
    jsonb_typeof(previous_value) = 'object'
  );

alter table public.beast_admin_member_account_audit_events
  drop constraint if exists beast_admin_member_account_audit_new_check;
alter table public.beast_admin_member_account_audit_events
  add constraint beast_admin_member_account_audit_new_check check (
    jsonb_typeof(new_value) = 'object'
  );

alter table public.beast_admin_member_account_audit_events
  drop constraint if exists beast_admin_member_account_audit_reason_check;
alter table public.beast_admin_member_account_audit_events
  add constraint beast_admin_member_account_audit_reason_check check (
    reason is null or char_length(btrim(reason)) between 1 and 500
  );

alter table public.beast_admin_member_account_audit_events
  drop constraint if exists
    beast_admin_member_account_audit_events_member_id_fkey;
alter table public.beast_admin_member_account_audit_events
  add constraint beast_admin_member_account_audit_events_member_id_fkey
  foreign key (member_id) references auth.users(id) on delete restrict;

create index if not exists beast_admin_account_audit_action_created_idx
  on public.beast_admin_member_account_audit_events
    (action, created_at desc);

create index if not exists beast_admin_account_audit_created_idx
  on public.beast_admin_member_account_audit_events (created_at desc);

create or replace function public.beast_admin_audit_json_has_secret(
  selected_value jsonb
)
returns boolean
language plpgsql
immutable
security invoker
set search_path = public
as $$
declare
  selected_key text;
  selected_text text;
  nested_value jsonb;
begin
  if selected_value is null then
    return false;
  end if;

  if jsonb_typeof(selected_value) = 'object' then
    for selected_key, nested_value in
      select key, value from jsonb_each(selected_value)
    loop
      if regexp_replace(lower(selected_key), '[^a-z0-9]', '', 'g')
        ~ '(password|token|secret|emailotp|otpcode|actionlink|confirmationlink)'
      then
        return true;
      end if;
      if public.beast_admin_audit_json_has_secret(nested_value) then
        return true;
      end if;
    end loop;
  elsif jsonb_typeof(selected_value) = 'array' then
    for nested_value in
      select value from jsonb_array_elements(selected_value)
    loop
      if public.beast_admin_audit_json_has_secret(nested_value) then
        return true;
      end if;
    end loop;
  elsif jsonb_typeof(selected_value) = 'string' then
    selected_text := selected_value #>> '{}';
    if selected_text ~* (
      '([?&](token|token_hash|code|otp|secret|password)=)'
      || '|((token|token_hash|otp|secret|password)[[:space:]]*[:=])'
      || '|(eyJ[a-zA-Z0-9_-]+[.]eyJ[a-zA-Z0-9_-]+[.][a-zA-Z0-9_-]+)'
    ) then
      return true;
    end if;
  end if;

  return false;
end;
$$;

create or replace function public.prepare_beast_admin_account_audit_event()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.previous_value = '{}'::jsonb
    and jsonb_typeof(new.changes -> 'previousValue') = 'object'
  then
    new.previous_value = new.changes -> 'previousValue';
  end if;

  if new.new_value = '{}'::jsonb
    and jsonb_typeof(new.changes -> 'newValue') = 'object'
  then
    new.new_value = new.changes -> 'newValue';
  end if;

  if new.reason is null
    and jsonb_typeof(new.changes -> 'reason') = 'string'
  then
    new.reason = nullif(btrim(new.changes ->> 'reason'), '');
  end if;

  if public.beast_admin_audit_json_has_secret(new.changes)
    or public.beast_admin_audit_json_has_secret(new.previous_value)
    or public.beast_admin_audit_json_has_secret(new.new_value)
  then
    raise exception
      'Account audit events cannot contain passwords, tokens, or link secrets'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_beast_admin_account_audit_event
  on public.beast_admin_member_account_audit_events;
create trigger prepare_beast_admin_account_audit_event
  before insert on public.beast_admin_member_account_audit_events
  for each row
  execute function public.prepare_beast_admin_account_audit_event();

create or replace function public.normalize_beast_admin_account_update_audit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  authentication_changes jsonb :=
    coalesce(new.changes -> 'authentication', '{}'::jsonb);
  email_change jsonb :=
    coalesce(authentication_changes -> 'email', '{}'::jsonb);
  status_change jsonb :=
    coalesce(authentication_changes -> 'accountStatus', '{}'::jsonb);
  module_change jsonb :=
    coalesce(authentication_changes -> 'moduleAccess', '{}'::jsonb);
  beta_change jsonb :=
    coalesce(authentication_changes -> 'betaAssignments', '{}'::jsonb);
  role_change jsonb :=
    coalesce(new.changes -> 'role', '{}'::jsonb);
begin
  if new.action <> 'account_updated' or new.outcome <> 'succeeded' then
    return new;
  end if;

  if coalesce((email_change ->> 'changed')::boolean, false) then
    insert into public.beast_admin_member_account_audit_events (
      actor_id,
      member_id,
      action,
      changes,
      previous_value,
      new_value,
      outcome
    )
    values (
      new.actor_id,
      new.member_id,
      'email_changed',
      jsonb_build_object('sourceEventId', new.id),
      jsonb_build_object('email', email_change -> 'before'),
      jsonb_build_object(
        'email', email_change -> 'after',
        'reverificationRequired',
          coalesce(email_change -> 'reverificationRequired', 'false'::jsonb)
      ),
      new.outcome
    );
  end if;

  if role_change -> 'before' is distinct from role_change -> 'after' then
    insert into public.beast_admin_member_account_audit_events (
      actor_id,
      member_id,
      action,
      changes,
      previous_value,
      new_value,
      outcome
    )
    values (
      new.actor_id,
      new.member_id,
      'role_changed',
      jsonb_build_object('sourceEventId', new.id),
      jsonb_build_object('role', role_change -> 'before'),
      jsonb_build_object('role', role_change -> 'after'),
      new.outcome
    );
  end if;

  if coalesce((status_change ->> 'changed')::boolean, false) then
    insert into public.beast_admin_member_account_audit_events (
      actor_id,
      member_id,
      action,
      changes,
      previous_value,
      new_value,
      outcome
    )
    values (
      new.actor_id,
      new.member_id,
      case
        when status_change ->> 'after' = 'suspended'
          then 'account_suspended'
        else 'account_restored'
      end,
      jsonb_build_object('sourceEventId', new.id),
      jsonb_build_object('accountStatus', status_change -> 'before'),
      jsonb_build_object('accountStatus', status_change -> 'after'),
      new.outcome
    );
  end if;

  if module_change -> 'before' is distinct from module_change -> 'after' then
    insert into public.beast_admin_member_account_audit_events (
      actor_id,
      member_id,
      action,
      changes,
      previous_value,
      new_value,
      outcome
    )
    values (
      new.actor_id,
      new.member_id,
      'module_access_changed',
      jsonb_build_object('sourceEventId', new.id),
      jsonb_build_object(
        'moduleAccess',
        coalesce(module_change -> 'before', '[]'::jsonb)
      ),
      jsonb_build_object(
        'moduleAccess',
        coalesce(module_change -> 'after', '[]'::jsonb)
      ),
      new.outcome
    );
  end if;

  if beta_change -> 'before' is distinct from beta_change -> 'after' then
    insert into public.beast_admin_member_account_audit_events (
      actor_id,
      member_id,
      action,
      changes,
      previous_value,
      new_value,
      outcome
    )
    values (
      new.actor_id,
      new.member_id,
      'beta_assignment_changed',
      jsonb_build_object('sourceEventId', new.id),
      jsonb_build_object(
        'betaFlagIds',
        coalesce(beta_change -> 'before', '[]'::jsonb)
      ),
      jsonb_build_object(
        'betaFlagIds',
        coalesce(beta_change -> 'after', '[]'::jsonb)
      ),
      new.outcome
    );
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_beast_admin_account_update_audit
  on public.beast_admin_member_account_audit_events;
create trigger normalize_beast_admin_account_update_audit
  after insert on public.beast_admin_member_account_audit_events
  for each row
  execute function public.normalize_beast_admin_account_update_audit();

create or replace function public.record_beast_admin_account_audit_event(
  selected_actor_id uuid,
  selected_member_id uuid,
  selected_action text,
  selected_previous_value jsonb,
  selected_new_value jsonb,
  selected_outcome text,
  selected_reason text default null,
  selected_changes jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_event_id uuid;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Server-only BeastAdmin audit action required'
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
    select 1 from auth.users where id = selected_member_id
  ) then
    raise exception 'The selected Auth account is not available'
      using errcode = 'P0002';
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
    selected_actor_id,
    selected_member_id,
    selected_action,
    coalesce(selected_changes, '{}'::jsonb),
    coalesce(selected_previous_value, '{}'::jsonb),
    coalesce(selected_new_value, '{}'::jsonb),
    selected_outcome,
    nullif(btrim(selected_reason), '')
  )
  returning id into audit_event_id;

  return audit_event_id;
end;
$$;

create or replace function public.get_beast_admin_account_audit_log(
  selected_member_id uuid default null,
  selected_action text default null,
  selected_date_from timestamptz default null,
  selected_date_to timestamptz default null,
  event_limit integer default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
  selected_event_limit integer := least(greatest(event_limit, 1), 250);
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  if selected_date_from is not null
    and selected_date_to is not null
    and selected_date_to <= selected_date_from
  then
    raise exception 'Audit date range is invalid'
      using errcode = '22023';
  end if;

  with visible_events as (
    select audit_event.*
    from public.beast_admin_member_account_audit_events audit_event
    where (
        selected_member_id is null
        or audit_event.member_id = selected_member_id
      )
      and (
        selected_action is null
        or audit_event.action = selected_action
      )
      and (
        selected_date_from is null
        or audit_event.created_at >= selected_date_from
      )
      and (
        selected_date_to is null
        or audit_event.created_at < selected_date_to
      )
      and (
        audit_event.action <> 'account_updated'
        or not exists (
          select 1
          from public.beast_admin_member_account_audit_events normalized
          where normalized.changes ->> 'sourceEventId' =
            audit_event.id::text
        )
      )
    order by audit_event.created_at desc, audit_event.id desc
    limit selected_event_limit
  )
  select jsonb_build_object(
    'events',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', visible_event.id,
          'actorId', visible_event.actor_id,
          'actorName', coalesce(
            nullif(btrim(actor_profile.display_name), ''),
            'Not provided'
          ),
          'memberId', visible_event.member_id,
          'memberName', coalesce(
            nullif(btrim(member_profile.display_name), ''),
            'Not provided'
          ),
          'action', visible_event.action,
          'occurredAt', visible_event.created_at,
          'previousValue', visible_event.previous_value,
          'newValue', visible_event.new_value,
          'outcome', visible_event.outcome,
          'reason', visible_event.reason
        )
        order by visible_event.created_at desc, visible_event.id desc
      ),
      '[]'::jsonb
    ),
    'eventCount', count(visible_event.id),
    'limit', selected_event_limit
  )
  into result
  from visible_events visible_event
  left join public.profiles actor_profile
    on actor_profile.id = visible_event.actor_id
  left join public.profiles member_profile
    on member_profile.id = visible_event.member_id;

  return result;
end;
$$;

create or replace function public.reject_beast_admin_account_audit_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'BeastAdmin account audit events are immutable'
    using errcode = '55000';
end;
$$;

drop trigger if exists reject_beast_admin_account_audit_mutation
  on public.beast_admin_member_account_audit_events;
create trigger reject_beast_admin_account_audit_mutation
  before update or delete on public.beast_admin_member_account_audit_events
  for each row
  execute function public.reject_beast_admin_account_audit_mutation();

revoke all on table public.beast_admin_member_account_audit_events
  from anon;
revoke all on table public.beast_admin_member_account_audit_events
  from authenticated;
grant select on table public.beast_admin_member_account_audit_events
  to authenticated;

revoke all on function public.beast_admin_audit_json_has_secret(jsonb)
  from public;
revoke all on function public.record_beast_admin_account_audit_event(
  uuid,
  uuid,
  text,
  jsonb,
  jsonb,
  text,
  text,
  jsonb
) from public;
revoke all on function public.get_beast_admin_account_audit_log(
  uuid,
  text,
  timestamptz,
  timestamptz,
  integer
) from public;
revoke all on function public.get_beast_admin_account_audit_log(
  uuid,
  text,
  timestamptz,
  timestamptz,
  integer
) from anon;

grant execute on function public.record_beast_admin_account_audit_event(
  uuid,
  uuid,
  text,
  jsonb,
  jsonb,
  text,
  text,
  jsonb
) to service_role;
grant execute on function public.beast_admin_audit_json_has_secret(jsonb)
  to service_role;
grant execute on function public.get_beast_admin_account_audit_log(
  uuid,
  text,
  timestamptz,
  timestamptz,
  integer
) to authenticated;
