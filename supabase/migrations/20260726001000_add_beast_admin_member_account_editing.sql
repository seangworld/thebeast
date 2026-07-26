-- BA-103: owner-only member account editing.
--
-- Auth email and suspension remain Supabase Auth responsibilities and are
-- mutated only by the server-side Auth Admin API. This migration owns the
-- transactional public-profile, module-access, beta-assignment, and audit
-- portion of an account edit.

alter table public.profiles
  add column if not exists account_kind text not null default 'member';

alter table public.profiles
  drop constraint if exists profiles_account_kind_check;

alter table public.profiles
  add constraint profiles_account_kind_check check (
    account_kind in ('member', 'system', 'demo')
  );

update public.profiles profile
set account_kind = case
  when auth_user.raw_app_meta_data ->> 'account_kind' = 'system'
    or auth_user.raw_app_meta_data ->> 'account_type' = 'system'
    or auth_user.raw_app_meta_data ->> 'is_system' = 'true' then 'system'
  when auth_user.raw_app_meta_data ->> 'account_kind' = 'demo'
    or auth_user.raw_app_meta_data ->> 'account_type' = 'demo'
    or auth_user.raw_app_meta_data ->> 'is_demo' = 'true' then 'demo'
  else profile.account_kind
end
from auth.users auth_user
where auth_user.id = profile.id;

create or replace function public.prevent_profile_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if not public.is_profile_admin() then
    if new.role is distinct from old.role then
      raise exception 'Only admins can change profile roles';
    end if;

    if new.stripe_customer_id is distinct from old.stripe_customer_id then
      raise exception 'Only admins can change Stripe customer IDs';
    end if;

    if new.account_kind is distinct from old.account_kind then
      raise exception 'Only admins can classify protected accounts';
    end if;
  end if;

  return new;
end;
$$;

create table if not exists public.beast_admin_member_module_access (
  member_id uuid not null references auth.users(id) on delete cascade,
  module_id text not null,
  enabled boolean not null,
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id, module_id),
  constraint beast_admin_member_module_access_module_check check (
    module_id in ('money', 'learning')
  )
);

create index if not exists beast_admin_member_module_access_updated_by_idx
  on public.beast_admin_member_module_access (updated_by, updated_at desc);

drop trigger if exists set_beast_admin_member_module_access_updated_at
  on public.beast_admin_member_module_access;
create trigger set_beast_admin_member_module_access_updated_at
  before update on public.beast_admin_member_module_access
  for each row
  execute function public.set_beast_admin_feature_flag_updated_at();

create table if not exists public.beast_admin_member_account_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete restrict,
  member_id uuid not null references auth.users(id) on delete cascade,
  action text not null default 'account_updated',
  changes jsonb not null,
  created_at timestamptz not null default now(),
  constraint beast_admin_member_account_audit_action_check check (
    action in ('account_updated')
  ),
  constraint beast_admin_member_account_audit_changes_check check (
    jsonb_typeof(changes) = 'object'
  )
);

create index if not exists beast_admin_member_account_audit_member_idx
  on public.beast_admin_member_account_audit_events (member_id, created_at desc);

alter table public.beast_admin_member_module_access enable row level security;
alter table public.beast_admin_member_account_audit_events enable row level security;

drop policy if exists "Members read own module access"
  on public.beast_admin_member_module_access;
create policy "Members read own module access"
  on public.beast_admin_member_module_access
  for select
  using (auth.uid() = member_id);

drop policy if exists "Owners read all member module access"
  on public.beast_admin_member_module_access;
create policy "Owners read all member module access"
  on public.beast_admin_member_module_access
  for select
  using (public.is_profile_admin());

drop policy if exists "Owners read member account audit events"
  on public.beast_admin_member_account_audit_events;
create policy "Owners read member account audit events"
  on public.beast_admin_member_account_audit_events
  for select
  using (public.is_profile_admin());

create or replace function public.get_beast_admin_member_directory()
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

  with activity_events as (
    select
      conversation.owner_id as member_id,
      conversation.created_at as occurred_at,
      case
        when conversation.agent_id = 'beastmoney.money-coach' then 'money'
        when conversation.agent_id = 'beasteducation.guidance-counselor' then 'education'
        when conversation.agent_id = 'beasthealth.health-advisor' then 'health'
        else 'beastos'
      end as module_id
    from public.agent_conversations conversation

    union all

    select lifecycle.owner_id, lifecycle.occurred_at, 'goals'
    from public.beast_goal_lifecycle_events lifecycle
    where lifecycle.event_type = 'Completed'

    union all

    select session.user_id, session.completed_at, 'education'
    from public.learning_sessions session
    where session.completed_at is not null

    union all

    select achievement.user_id, achievement.earned_at, 'education'
    from public.learning_achievements achievement
    where achievement.earned = true
      and achievement.earned_at is not null

    union all

    select certificate.user_id, certificate.created_at, 'education'
    from public.learning_certificates certificate

    union all

    select first_debt_payment.user_id, first_debt_payment.created_at, 'money'
    from (
      select distinct on (payment.user_id)
        payment.user_id,
        payment.created_at
      from public.debt_payments payment
      order by payment.user_id, payment.created_at
    ) first_debt_payment

    union all

    select first_bill_payment.user_id, first_bill_payment.created_at, 'money'
    from (
      select distinct on (payment.user_id)
        payment.user_id,
        payment.created_at
      from public.bill_payments payment
      order by payment.user_id, payment.created_at
    ) first_bill_payment

    union all

    select timeline.owner_id, timeline.created_at, 'money'
    from public.retirement_timeline_runs timeline

    union all

    select
      document.owner_id,
      document.created_at,
      case
        when document.category = 'Health' then 'health'
        else 'documents'
      end
    from public.beast_documents document
    where document.status <> 'Deleted'
  ),
  activity as (
    select
      event.member_id,
      max(event.occurred_at) as last_activity_at,
      count(*)::integer
        + count(distinct event.module_id)::integer as event_count
    from activity_events event
    group by event.member_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', auth_user.id,
        'displayName', coalesce(
          nullif(btrim(profile.display_name), ''),
          nullif(btrim(profile.preferred_name), ''),
          nullif(btrim(profile.full_name), ''),
          nullif(btrim(profile.username), '')
        ),
        'email', auth_user.email,
        'emailVerificationStatus', case
          when auth_user.email is null then 'not_provided'
          when auth_user.email_confirmed_at is not null then 'verified'
          else 'unverified'
        end,
        'accountStatus', case
          when auth_user.deleted_at is not null then 'deleted'
          when auth_user.banned_until is not null
            and auth_user.banned_until > now() then 'suspended'
          when auth_user.invited_at is not null
            and auth_user.last_sign_in_at is null then 'invited'
          else 'active'
        end,
        'accountKind', case
          when profile.id is null then 'unmanaged'
          when auth_user.raw_app_meta_data ->> 'account_kind' in ('system', 'demo')
            then auth_user.raw_app_meta_data ->> 'account_kind'
          when auth_user.raw_app_meta_data ->> 'account_type' in ('system', 'demo')
            then auth_user.raw_app_meta_data ->> 'account_type'
          when auth_user.raw_app_meta_data ->> 'is_system' = 'true' then 'system'
          when auth_user.raw_app_meta_data ->> 'is_demo' = 'true' then 'demo'
          else profile.account_kind
        end,
        'role', profile.role,
        'householdRole', null,
        'moduleAccessOverrides', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'moduleId', module_access.module_id,
                'enabled', module_access.enabled
              )
              order by module_access.module_id
            )
            from public.beast_admin_member_module_access module_access
            where module_access.member_id = auth_user.id
          ),
          '[]'::jsonb
        ),
        'betaAssignments', coalesce(
          (
            select jsonb_agg(
              jsonb_build_object(
                'id', effective_assignment.id,
                'flagKey', flag.flag_key,
                'name', flag.name,
                'stage', effective_assignment.stage,
                'sourceScope', effective_assignment.scope_type
              )
              order by flag.name, flag.flag_key
            )
            from public.beast_admin_feature_flags flag
            cross join lateral (
              select assignment.id, assignment.stage, assignment.scope_type
              from public.beast_admin_feature_flag_assignments assignment
              where assignment.flag_id = flag.id
                and assignment.owner_id = auth.uid()
                and (
                  (
                    assignment.scope_type = 'member'
                    and assignment.member_id = auth_user.id
                  )
                  or (
                    assignment.scope_type = 'role'
                    and assignment.role_name = profile.role
                  )
                )
              order by case assignment.scope_type
                when 'member' then 1
                else 2
              end
              limit 1
            ) effective_assignment
            where flag.owner_id = auth.uid()
              and effective_assignment.stage in ('internal_testing', 'beta')
          ),
          '[]'::jsonb
        ),
        'createdAt', auth_user.created_at,
        'profileCreatedAt', profile.created_at,
        'lastSignInAt', auth_user.last_sign_in_at,
        'lastActivityAt', activity.last_activity_at,
        'eventCount', coalesce(activity.event_count, 0)
      )
      order by
        coalesce(
          activity.last_activity_at,
          auth_user.last_sign_in_at,
          auth_user.created_at
        ) desc,
        auth_user.id
    ),
    '[]'::jsonb
  )
  into result
  from auth.users auth_user
  left join public.profiles profile on profile.id = auth_user.id
  left join activity on activity.member_id = auth_user.id;

  return result;
end;
$$;

create or replace function public.update_beast_admin_member_account(
  selected_member_id uuid,
  selected_display_name text,
  selected_role text,
  selected_account_status text,
  selected_module_ids text[],
  selected_beta_flag_ids uuid[],
  auth_change_summary jsonb,
  selected_actor_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := selected_actor_id;
  current_profile public.profiles%rowtype;
  audit_event_id uuid;
  valid_flag_count integer;
  admin_count integer;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Server-only BeastAdmin account action required'
      using errcode = '42501';
  end if;

  if actor_id is null
    or not exists (
      select 1
      from public.profiles actor_profile
      where actor_profile.id = actor_id
        and actor_profile.role = 'admin'
    ) then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  select *
  into current_profile
  from public.profiles
  where id = selected_member_id
  for update;

  if not found then
    raise exception 'Member profile is required before editing'
      using errcode = 'P0002';
  end if;

  if current_profile.account_kind <> 'member' then
    raise exception 'Protected accounts cannot be edited'
      using errcode = '42501';
  end if;

  if selected_role not in ('user', 'beta', 'admin') then
    raise exception 'Member role is invalid'
      using errcode = '22023';
  end if;

  if selected_account_status not in ('active', 'invited', 'suspended') then
    raise exception 'Account status is invalid'
      using errcode = '22023';
  end if;

  if selected_display_name is not null
    and length(btrim(selected_display_name)) > 100 then
    raise exception 'Display name is invalid'
      using errcode = '22023';
  end if;

  if auth_change_summary is null
    or jsonb_typeof(auth_change_summary) <> 'object' then
    raise exception 'Authentication change summary is invalid'
      using errcode = '22023';
  end if;

  if coalesce(cardinality(selected_module_ids), 0) <>
      coalesce((select count(distinct module_id) from unnest(selected_module_ids) module_id), 0)
    or not coalesce(selected_module_ids, '{}'::text[]) <@ array['money', 'learning']::text[] then
    raise exception 'Module access selection is invalid'
      using errcode = '22023';
  end if;

  select count(*)
  into valid_flag_count
  from public.beast_admin_feature_flags flag
  where flag.owner_id = actor_id
    and flag.id = any(coalesce(selected_beta_flag_ids, '{}'::uuid[]));

  if valid_flag_count <> coalesce(cardinality(selected_beta_flag_ids), 0)
    or valid_flag_count <> coalesce(
      (
        select count(distinct flag_id)
        from unnest(selected_beta_flag_ids) flag_id
      ),
      0
    ) then
    raise exception 'Beta assignment selection is invalid'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.beast_admin_feature_flag_assignments assignment
    where assignment.owner_id = actor_id
      and assignment.scope_type = 'member'
      and assignment.member_id = selected_member_id
      and assignment.flag_id = any(
        coalesce(selected_beta_flag_ids, '{}'::uuid[])
      )
      and assignment.stage <> 'beta'
  ) then
    raise exception 'Non-Beta member overrides must be managed in Feature Flags'
      using errcode = '22023';
  end if;

  perform 1
  from public.profiles
  where role = 'admin'
  for update;

  select count(*)
  into admin_count
  from public.profiles owner_profile
  join auth.users owner_auth on owner_auth.id = owner_profile.id
  where owner_profile.role = 'admin'
    and owner_profile.id <> selected_member_id
    and owner_auth.deleted_at is null
    and (
      owner_auth.banned_until is null
      or owner_auth.banned_until <= now()
    );

  if current_profile.role = 'admin'
    and admin_count = 0
    and (
      selected_role <> 'admin'
      or selected_account_status = 'suspended'
    ) then
    raise exception 'The final Beast owner cannot be demoted or suspended'
      using errcode = '23514';
  end if;

  update public.profiles
  set
    display_name = nullif(btrim(selected_display_name), ''),
    role = selected_role
  where id = selected_member_id;

  delete from public.beast_admin_member_module_access
  where member_id = selected_member_id;

  insert into public.beast_admin_member_module_access (
    member_id,
    module_id,
    enabled,
    updated_by
  )
  select
    selected_member_id,
    module_id,
    module_id = any(coalesce(selected_module_ids, '{}'::text[])),
    actor_id
  from unnest(array['money', 'learning']::text[]) module_id;

  delete from public.beast_admin_feature_flag_assignments assignment
  using public.beast_admin_feature_flags flag
  where assignment.flag_id = flag.id
    and flag.owner_id = actor_id
    and assignment.owner_id = actor_id
    and assignment.scope_type = 'member'
    and assignment.member_id = selected_member_id
    and assignment.stage = 'beta'
    and not (
      assignment.flag_id = any(
        coalesce(selected_beta_flag_ids, '{}'::uuid[])
      )
    );

  insert into public.beast_admin_feature_flag_assignments (
    flag_id,
    owner_id,
    scope_type,
    stage,
    member_id
  )
  select
    flag.id,
    actor_id,
    'member',
    'beta',
    selected_member_id
  from public.beast_admin_feature_flags flag
  where flag.owner_id = actor_id
    and flag.id = any(coalesce(selected_beta_flag_ids, '{}'::uuid[]))
  on conflict (flag_id, member_id)
    where scope_type = 'member'
  do update set
    owner_id = excluded.owner_id,
    stage = excluded.stage,
    module_id = null,
    role_name = null,
    updated_at = now();

  insert into public.beast_admin_member_account_audit_events (
    actor_id,
    member_id,
    changes
  )
  values (
    actor_id,
    selected_member_id,
    jsonb_build_object(
      'displayName', jsonb_build_object(
        'before', current_profile.display_name,
        'after', nullif(btrim(selected_display_name), '')
      ),
      'role', jsonb_build_object(
        'before', current_profile.role,
        'after', selected_role
      ),
      'accountStatus', selected_account_status,
      'moduleAccess', coalesce(to_jsonb(selected_module_ids), '[]'::jsonb),
      'betaFlagIds', coalesce(to_jsonb(selected_beta_flag_ids), '[]'::jsonb),
      'authentication', coalesce(auth_change_summary, '{}'::jsonb)
    )
  )
  returning id into audit_event_id;

  return jsonb_build_object(
    'auditEventId', audit_event_id,
    'updatedAt', now()
  );
end;
$$;

revoke all on function public.get_beast_admin_member_directory() from public;
revoke all on function public.update_beast_admin_member_account(
  uuid,
  text,
  text,
  text,
  text[],
  uuid[],
  jsonb,
  uuid
) from public;

grant execute on function public.get_beast_admin_member_directory()
  to authenticated;
grant execute on function public.update_beast_admin_member_account(
  uuid,
  text,
  text,
  text,
  text[],
  uuid[],
  jsonb,
  uuid
) to service_role;
