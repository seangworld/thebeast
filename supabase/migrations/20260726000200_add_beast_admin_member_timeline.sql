-- BA-104: owner-only member directory and cross-module journey timeline.
-- Timeline functions expose minimal journey metadata. They never return raw
-- conversation content, balances, payment amounts, or document contents.

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

  with base_events as (
    select
      profile.id as member_id,
      profile.created_at as occurred_at,
      'beastos'::text as module_id,
      'registration'::text as event_kind
    from public.profiles profile

    union all

    select
      conversation.owner_id,
      conversation.created_at,
      case
        when conversation.agent_id = 'beastmoney.money-coach' then 'money'
        when conversation.agent_id = 'beasteducation.guidance-counselor' then 'education'
        when conversation.agent_id = 'beasthealth.health-advisor' then 'health'
        else 'beastos'
      end,
      'activity'
    from public.agent_conversations conversation

    union all

    select lifecycle.owner_id, lifecycle.occurred_at, 'goals', 'activity'
    from public.beast_goal_lifecycle_events lifecycle
    where lifecycle.event_type = 'Completed'

    union all

    select session.user_id, session.completed_at, 'education', 'activity'
    from public.learning_sessions session
    where session.completed_at is not null

    union all

    select achievement.user_id, achievement.earned_at, 'education', 'activity'
    from public.learning_achievements achievement
    where achievement.earned = true
      and achievement.earned_at is not null

    union all

    select certificate.user_id, certificate.created_at, 'education', 'activity'
    from public.learning_certificates certificate

    union all

    select first_debt_payment.user_id, first_debt_payment.created_at, 'money', 'activity'
    from (
      select distinct on (payment.user_id)
        payment.user_id,
        payment.created_at
      from public.debt_payments payment
      order by payment.user_id, payment.created_at
    ) first_debt_payment

    union all

    select first_bill_payment.user_id, first_bill_payment.created_at, 'money', 'activity'
    from (
      select distinct on (payment.user_id)
        payment.user_id,
        payment.created_at
      from public.bill_payments payment
      order by payment.user_id, payment.created_at
    ) first_bill_payment

    union all

    select timeline.owner_id, timeline.created_at, 'money', 'activity'
    from public.retirement_timeline_runs timeline

    union all

    select
      document.owner_id,
      document.created_at,
      case
        when document.category = 'Health' then 'health'
        else 'documents'
      end,
      'activity'
    from public.beast_documents document
    where document.status <> 'Deleted'
  ),
  activity as (
    select
      event.member_id,
      max(event.occurred_at) as last_activity_at,
      count(*)::integer
        + (
          count(distinct event.module_id) filter (
            where event.event_kind = 'activity'
          )
        )::integer as event_count
    from base_events event
    group by event.member_id
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', profile.id,
        'displayName', coalesce(
          nullif(btrim(profile.preferred_name), ''),
          nullif(btrim(profile.display_name), ''),
          nullif(btrim(profile.full_name), ''),
          nullif(btrim(profile.username), ''),
          'Member'
        ),
        'email', auth_user.email,
        'role', profile.role,
        'registeredAt', profile.created_at,
        'lastActivityAt', coalesce(activity.last_activity_at, profile.created_at),
        'eventCount', coalesce(activity.event_count, 1)
      )
      order by coalesce(activity.last_activity_at, profile.created_at) desc, profile.id
    ),
    '[]'::jsonb
  )
  into result
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.id
  left join activity on activity.member_id = profile.id;

  return result;
end;
$$;

create or replace function public.get_beast_admin_member_timeline(
  selected_member_id uuid,
  event_limit integer default 200
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  safe_event_limit integer := greatest(25, least(coalesce(event_limit, 200), 500));
  member_record jsonb;
  result jsonb;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', profile.id,
    'displayName', coalesce(
      nullif(btrim(profile.preferred_name), ''),
      nullif(btrim(profile.display_name), ''),
      nullif(btrim(profile.full_name), ''),
      nullif(btrim(profile.username), ''),
      'Member'
    ),
    'email', auth_user.email,
    'role', profile.role,
    'registeredAt', profile.created_at
  )
  into member_record
  from public.profiles profile
  join auth.users auth_user on auth_user.id = profile.id
  where profile.id = selected_member_id;

  if member_record is null then
    raise exception 'Member timeline is not available'
      using errcode = 'P0002';
  end if;

  with base_events as (
    select
      'registration-' || profile.id::text as id,
      profile.created_at as occurred_at,
      'registration'::text as category,
      'beastos'::text as module_id,
      'Member registered'::text as title,
      'Beast account and owner-scoped profile created.'::text as detail
    from public.profiles profile
    where profile.id = selected_member_id

    union all

    select
      'conversation-' || conversation.id,
      conversation.created_at,
      'conversation',
      case
        when conversation.agent_id = 'beastmoney.money-coach' then 'money'
        when conversation.agent_id = 'beasteducation.guidance-counselor' then 'education'
        when conversation.agent_id = 'beasthealth.health-advisor' then 'health'
        else 'beastos'
      end,
      case
        when conversation.agent_id = 'beastmoney.money-coach' then 'Money Coach conversation started'
        when conversation.agent_id = 'beasteducation.guidance-counselor' then 'Guidance Counselor conversation started'
        when conversation.agent_id = 'beasthealth.health-advisor' then 'Health Advisor conversation started'
        else 'Beast professional conversation started'
      end,
      conversation.message_count::text || case
        when conversation.message_count = 1 then ' persisted message'
        else ' persisted messages'
      end
    from public.agent_conversations conversation
    where conversation.owner_id = selected_member_id

    union all

    select
      'goal-' || lifecycle.id::text,
      lifecycle.occurred_at,
      'goals',
      'goals',
      'Goal completed',
      lifecycle.title
    from public.beast_goal_lifecycle_events lifecycle
    where lifecycle.owner_id = selected_member_id
      and lifecycle.event_type = 'Completed'

    union all

    select
      'learning-session-' || session.id::text,
      session.completed_at,
      'learning',
      'education',
      'Learning session completed',
      coalesce(
        nullif(btrim(session.course_title), ''),
        nullif(btrim(session.title), ''),
        'Learning session'
      )
    from public.learning_sessions session
    where session.user_id = selected_member_id
      and session.completed_at is not null

    union all

    select
      'learning-achievement-' || achievement.id::text,
      achievement.earned_at,
      'learning',
      'education',
      'Learning achievement earned',
      achievement.title
    from public.learning_achievements achievement
    where achievement.user_id = selected_member_id
      and achievement.earned = true
      and achievement.earned_at is not null

    union all

    select
      'learning-certificate-' || certificate.id::text,
      certificate.created_at,
      'learning',
      'education',
      'Certificate earned',
      certificate.path_name
    from public.learning_certificates certificate
    where certificate.user_id = selected_member_id

    union all

    select
      'first-debt-payment-' || first_debt_payment.id::text,
      first_debt_payment.created_at,
      'money',
      'money',
      'First debt payment recorded',
      'The member recorded their first persisted debt payment.'
    from (
      select payment.id, payment.created_at
      from public.debt_payments payment
      where payment.user_id = selected_member_id
      order by payment.created_at
      limit 1
    ) first_debt_payment

    union all

    select
      'first-bill-payment-' || first_bill_payment.id::text,
      first_bill_payment.created_at,
      'money',
      'money',
      'First bill payment recorded',
      'The member recorded their first persisted bill payment.'
    from (
      select payment.id, payment.created_at
      from public.bill_payments payment
      where payment.user_id = selected_member_id
      order by payment.created_at
      limit 1
    ) first_bill_payment

    union all

    select
      'retirement-projection-' || timeline.id::text,
      timeline.created_at,
      'money',
      'money',
      'Retirement projection created',
      'A versioned retirement timeline was generated.'
    from public.retirement_timeline_runs timeline
    where timeline.owner_id = selected_member_id

    union all

    select
      'document-' || document.id::text,
      document.created_at,
      case when document.category = 'Health' then 'health' else 'documents' end,
      case when document.category = 'Health' then 'health' else 'documents' end,
      case
        when document.category = 'Health' then 'Health document uploaded'
        else 'Document uploaded'
      end,
      case
        when document.category = 'Health'
          then 'A document categorized as Health was added.'
        else document.category || ' document added.'
      end
    from public.beast_documents document
    where document.owner_id = selected_member_id
      and document.status <> 'Deleted'
  ),
  module_activation_events as (
    select
      'module-activation-' || event.module_id as id,
      min(event.occurred_at) as occurred_at,
      'module'::text as category,
      event.module_id,
      case event.module_id
        when 'money' then 'Money activity began'
        when 'education' then 'Education activity began'
        when 'health' then 'Health activity began'
        when 'goals' then 'Goals activity began'
        when 'documents' then 'Documents activity began'
        else 'BeastOS activity began'
      end as title,
      'First persisted activity in this Beast application.'::text as detail
    from base_events event
    where event.category <> 'registration'
    group by event.module_id
  ),
  all_events as (
    select * from base_events
    union all
    select * from module_activation_events
  ),
  totals as (
    select count(*)::integer as event_count
    from all_events
  ),
  limited_events as (
    select *
    from all_events
    order by occurred_at desc, id
    limit safe_event_limit
  ),
  event_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', event.id,
          'occurredAt', event.occurred_at,
          'category', event.category,
          'moduleId', event.module_id,
          'title', event.title,
          'detail', event.detail
        )
        order by event.occurred_at desc, event.id
      ),
      '[]'::jsonb
    ) as value
    from limited_events event
  )
  select jsonb_build_object(
    'member', member_record,
    'eventCount', totals.event_count,
    'hasMore', totals.event_count > safe_event_limit,
    'events', event_json.value,
    'coverage', jsonb_build_array(
      jsonb_build_object('category', 'registration', 'state', 'available', 'detail', 'Account profile creation.'),
      jsonb_build_object('category', 'module', 'state', 'derived', 'detail', 'First persisted activity, not an entitlement change.'),
      jsonb_build_object('category', 'conversation', 'state', 'available', 'detail', 'Conversation metadata only; message content excluded.'),
      jsonb_build_object('category', 'goals', 'state', 'available', 'detail', 'Completed BeastOS goal lifecycle events.'),
      jsonb_build_object('category', 'learning', 'state', 'available', 'detail', 'Completed sessions, achievements, and certificates.'),
      jsonb_build_object('category', 'money', 'state', 'partial', 'detail', 'First recorded payments and retirement projections; balances and amounts excluded.'),
      jsonb_build_object('category', 'health', 'state', 'partial', 'detail', 'Health-category document activity only; no clinical activity source connected.'),
      jsonb_build_object('category', 'documents', 'state', 'available', 'detail', 'Upload metadata only; document contents excluded.')
    )
  )
  into result
  from totals
  cross join event_json;

  return result;
end;
$$;

revoke all on function public.get_beast_admin_member_directory() from public;
revoke all on function public.get_beast_admin_member_timeline(uuid, integer) from public;

grant execute on function public.get_beast_admin_member_directory()
  to authenticated;
grant execute on function public.get_beast_admin_member_timeline(uuid, integer)
  to authenticated;
