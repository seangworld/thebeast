-- BA-102: authoritative owner-only member directory.
--
-- Supabase Auth remains authoritative for login email, email confirmation,
-- account state, account creation, and sign-in timestamps. Public profiles
-- remain authoritative for display identity and the Beast access role.
-- Household role is intentionally null until a persisted household-member
-- relationship exists. Beta assignments are effective owner-managed feature
-- flag assignments; module access continues to be resolved by the application
-- module registry from the returned profile role.

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
          nullif(btrim(profile.preferred_name), ''),
          nullif(btrim(profile.display_name), ''),
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
        'role', profile.role,
        'householdRole', null,
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

revoke all on function public.get_beast_admin_member_directory() from public;
grant execute on function public.get_beast_admin_member_directory()
  to authenticated;
