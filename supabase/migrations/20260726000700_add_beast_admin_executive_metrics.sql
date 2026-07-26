-- BA-110: owner-only, privacy-preserving Beast ecosystem growth metrics.
-- Activity is derived from meaningful persisted product records. The function
-- does not claim to measure logins, page views, revenue, or unpersisted actions.

create or replace function public.get_beast_admin_executive_metrics(
  window_days integer default 30
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  safe_window_days integer := greatest(7, least(coalesce(window_days, 30), 365));
  window_start timestamptz := now() - make_interval(days => safe_window_days);
  previous_window_start timestamptz :=
    now() - make_interval(days => safe_window_days * 2);
  result jsonb;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  with activity_events as (
    select
      profile.id as owner_id,
      profile.created_at as occurred_at,
      'beastos'::text as module_id,
      'member_registration'::text as feature_id
    from public.profiles profile

    union all

    select
      conversation.owner_id,
      conversation.created_at,
      case
        when conversation.agent_id like 'beastmoney.%' then 'money'
        when conversation.agent_id like 'beasteducation.%' then 'education'
        when conversation.agent_id like 'beasthealth.%' then 'health'
        when conversation.agent_id like 'beasthome.%' then 'home'
        when conversation.agent_id like 'beastgoals.%' then 'goals'
        else 'beastos'
      end,
      'professional_conversation'
    from public.agent_conversations conversation

    union all

    select
      message.owner_id,
      message.created_at,
      case
        when conversation.agent_id like 'beastmoney.%' then 'money'
        when conversation.agent_id like 'beasteducation.%' then 'education'
        when conversation.agent_id like 'beasthealth.%' then 'health'
        when conversation.agent_id like 'beasthome.%' then 'home'
        when conversation.agent_id like 'beastgoals.%' then 'goals'
        else 'beastos'
      end,
      'professional_message'
    from public.agent_conversation_messages message
    join public.agent_conversations conversation
      on conversation.id = message.conversation_id
    where message.sender ->> 'kind' = 'user'

    union all

    select goal.owner_id, goal.created_at, 'goals', 'goal_created'
    from public.beast_goals goal

    union all

    select lifecycle.owner_id, lifecycle.occurred_at, 'goals', 'goal_progress'
    from public.beast_goal_lifecycle_events lifecycle

    union all

    select document.owner_id, document.created_at, 'documents', 'document_uploaded'
    from public.beast_documents document
    where document.status <> 'Deleted'

    union all

    select debt.user_id, debt.created_at, 'money', 'financial_record'
    from public.debts debt

    union all

    select bill.user_id, bill.created_at, 'money', 'financial_record'
    from public.bill_events bill

    union all

    select income.user_id, income.created_at, 'money', 'financial_record'
    from public.income_events income

    union all

    select payment.user_id, payment.created_at, 'money', 'payment_recorded'
    from public.bill_payments payment

    union all

    select payment.user_id, payment.created_at, 'money', 'payment_recorded'
    from public.debt_payments payment

    union all

    select profile.owner_id, profile.created_at, 'education', 'education_profile'
    from public.education_profiles profile

    union all

    select course.user_id, course.created_at, 'education', 'learning_course'
    from public.learning_courses course

    union all

    select session.user_id, session.completed_at, 'education', 'learning_session'
    from public.learning_sessions session
    where session.completed_at is not null
  ),
  member_totals as (
    select
      count(*)::integer as total,
      count(*) filter (
        where profile.created_at >= window_start
      )::integer as current_new,
      count(*) filter (
        where profile.created_at >= previous_window_start
          and profile.created_at < window_start
      )::integer as previous_new
    from public.profiles profile
  ),
  activity_totals as (
    select
      count(distinct event.owner_id) filter (
        where event.occurred_at >= now() - interval '1 day'
      )::integer as daily_active,
      count(distinct event.owner_id) filter (
        where event.occurred_at >= now() - interval '7 days'
      )::integer as weekly_active,
      count(distinct event.owner_id) filter (
        where event.occurred_at >= window_start
      )::integer as tracked_members,
      count(*) filter (
        where event.occurred_at >= window_start
      )::integer as tracked_events
    from activity_events event
  ),
  previous_week_members as (
    select distinct event.owner_id
    from activity_events event
    where event.occurred_at >= now() - interval '14 days'
      and event.occurred_at < now() - interval '7 days'
  ),
  current_week_members as (
    select distinct event.owner_id
    from activity_events event
    where event.occurred_at >= now() - interval '7 days'
  ),
  retention as (
    select
      count(*)::integer as eligible_members,
      count(*) filter (
        where current_member.owner_id is not null
      )::integer as retained_members
    from previous_week_members previous_member
    left join current_week_members current_member
      on current_member.owner_id = previous_member.owner_id
  ),
  conversation_totals as (
    select
      count(*) filter (
        where conversation.created_at >= window_start
      )::integer as current_count,
      count(*) filter (
        where conversation.created_at >= previous_window_start
          and conversation.created_at < window_start
      )::integer as previous_count,
      coalesce(sum(conversation.message_count) filter (
        where conversation.created_at >= window_start
      ), 0)::integer as message_count
    from public.agent_conversations conversation
  ),
  module_catalog(module_id, module_label, sort_order) as (
    values
      ('beastos'::text, 'BeastOS'::text, 1),
      ('money', 'BeastMoney', 2),
      ('education', 'BeastEducation', 3),
      ('goals', 'Goals', 4),
      ('documents', 'Documents', 5),
      ('health', 'BeastHealth', 6),
      ('home', 'BeastHome', 7)
  ),
  module_rows as (
    select
      catalog.module_id,
      catalog.module_label,
      count(distinct event.owner_id)::integer as member_count,
      catalog.sort_order
    from module_catalog catalog
    left join activity_events event
      on event.module_id = catalog.module_id
    group by catalog.module_id, catalog.module_label, catalog.sort_order
  ),
  module_adoption as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'moduleId', module.module_id,
          'moduleLabel', module.module_label,
          'memberCount', module.member_count,
          'adoptionRate',
            case
              when member_totals.total = 0 then null
              else module.member_count::numeric / member_totals.total
            end
        )
        order by module.sort_order
      ),
      '[]'::jsonb
    ) as value
    from module_rows module
    cross join member_totals
  ),
  professional_rows as (
    select
      conversation.agent_id,
      count(*)::integer as conversation_count,
      count(distinct conversation.owner_id)::integer as member_count
    from public.agent_conversations conversation
    where conversation.created_at >= window_start
    group by conversation.agent_id
  ),
  professional_usage as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'agentId', professional.agent_id,
          'conversationCount', professional.conversation_count,
          'memberCount', professional.member_count
        )
        order by
          professional.conversation_count desc,
          professional.agent_id
      ),
      '[]'::jsonb
    ) as value
    from professional_rows professional
  ),
  feature_catalog(feature_id, feature_label, sort_order) as (
    values
      ('professional_conversation'::text, 'Conversations started'::text, 1),
      ('professional_message', 'Messages sent to professionals', 2),
      ('financial_record', 'Financial records added', 3),
      ('payment_recorded', 'Payments recorded', 4),
      ('learning_course', 'Courses started', 5),
      ('learning_session', 'Learning sessions completed', 6),
      ('goal_created', 'Goals created', 7),
      ('goal_progress', 'Goal progress updates', 8),
      ('document_uploaded', 'Documents uploaded', 9),
      ('education_profile', 'Education discovery profiles started', 10)
  ),
  feature_rows as (
    select
      catalog.feature_id,
      catalog.feature_label,
      count(event.feature_id)::integer as usage_count,
      count(distinct event.owner_id)::integer as member_count,
      catalog.sort_order
    from feature_catalog catalog
    left join activity_events event
      on event.feature_id = catalog.feature_id
      and event.occurred_at >= window_start
    group by catalog.feature_id, catalog.feature_label, catalog.sort_order
  ),
  feature_usage as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'featureId', feature.feature_id,
          'featureLabel', feature.feature_label,
          'usageCount', feature.usage_count,
          'memberCount', feature.member_count
        )
        order by
          feature.usage_count desc,
          feature.sort_order
      ),
      '[]'::jsonb
    ) as value
    from feature_rows feature
  ),
  daily_rows as (
    select
      event.occurred_at::date as activity_date,
      count(distinct event.owner_id)::integer as active_members,
      count(*)::integer as event_count
    from activity_events event
    where event.occurred_at >= window_start
    group by event.occurred_at::date
  ),
  daily_activity as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'date', daily.activity_date,
          'activeMemberCount', daily.active_members,
          'eventCount', daily.event_count
        )
        order by daily.activity_date
      ),
      '[]'::jsonb
    ) as value
    from daily_rows daily
  )
  select jsonb_build_object(
    'windowDays', safe_window_days,
    'generatedAt', now(),
    'members', jsonb_build_object(
      'total', member_totals.total,
      'newInWindow', member_totals.current_new,
      'newInPreviousWindow', member_totals.previous_new
    ),
    'activity', jsonb_build_object(
      'dailyActiveUsers', activity_totals.daily_active,
      'weeklyActiveUsers', activity_totals.weekly_active,
      'trackedMemberCount', activity_totals.tracked_members,
      'trackedEventCount', activity_totals.tracked_events,
      'retentionEligibleMembers', retention.eligible_members,
      'retainedMembers', retention.retained_members,
      'retentionRate',
        case
          when retention.eligible_members = 0 then null
          else retention.retained_members::numeric / retention.eligible_members
        end
    ),
    'conversations', jsonb_build_object(
      'count', conversation_totals.current_count,
      'previousCount', conversation_totals.previous_count,
      'messageCount', conversation_totals.message_count
    ),
    'moduleAdoption', module_adoption.value,
    'professionalUsage', professional_usage.value,
    'featureUsage', feature_usage.value,
    'dailyActivity', daily_activity.value,
    'revenue', jsonb_build_object(
      'status', 'not_connected',
      'monthlyRecurringRevenue', null,
      'annualRecurringRevenue', null,
      'evidence',
        'No owner-approved recognized-revenue or Stripe reporting feed is connected.'
    )
  )
  into result
  from member_totals
  cross join activity_totals
  cross join retention
  cross join conversation_totals
  cross join module_adoption
  cross join professional_usage
  cross join feature_usage
  cross join daily_activity;

  return result;
end;
$$;

revoke all on function public.get_beast_admin_executive_metrics(integer)
  from public;
grant execute on function public.get_beast_admin_executive_metrics(integer)
  to authenticated;
