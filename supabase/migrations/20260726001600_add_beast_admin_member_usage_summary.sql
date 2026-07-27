-- BA-128: owner-only member module-usage summary.
--
-- Usage is calculated only from persisted activity metadata during an explicit
-- bounded period. The function does not return conversation content, financial
-- values, document contents, health details, access assignments, or fixtures.

create or replace function public.get_beast_admin_member_usage_summary(
  usage_period_days integer default 90
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  safe_period_days integer :=
    greatest(1, least(coalesce(usage_period_days, 90), 365));
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
        when conversation.agent_id = 'beasteducation.guidance-counselor'
          then 'learning'
        when conversation.agent_id = 'beasthealth.health-advisor' then 'health'
        else 'beastos'
      end as module_id
    from public.agent_conversations conversation
    where conversation.created_at >=
      now() - make_interval(days => safe_period_days)

    union all

    select lifecycle.owner_id, lifecycle.occurred_at, 'goals'
    from public.beast_goal_lifecycle_events lifecycle
    where lifecycle.event_type = 'Completed'
      and lifecycle.occurred_at >=
        now() - make_interval(days => safe_period_days)

    union all

    select session.user_id, session.completed_at, 'learning'
    from public.learning_sessions session
    where session.completed_at is not null
      and session.completed_at >=
        now() - make_interval(days => safe_period_days)

    union all

    select achievement.user_id, achievement.earned_at, 'learning'
    from public.learning_achievements achievement
    where achievement.earned = true
      and achievement.earned_at is not null
      and achievement.earned_at >=
        now() - make_interval(days => safe_period_days)

    union all

    select certificate.user_id, certificate.created_at, 'learning'
    from public.learning_certificates certificate
    where certificate.created_at >=
      now() - make_interval(days => safe_period_days)

    union all

    select payment.user_id, payment.created_at, 'money'
    from public.debt_payments payment
    where payment.created_at >=
      now() - make_interval(days => safe_period_days)

    union all

    select payment.user_id, payment.created_at, 'money'
    from public.bill_payments payment
    where payment.created_at >=
      now() - make_interval(days => safe_period_days)

    union all

    select timeline.owner_id, timeline.created_at, 'money'
    from public.retirement_timeline_runs timeline
    where timeline.created_at >=
      now() - make_interval(days => safe_period_days)

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
      and document.created_at >=
        now() - make_interval(days => safe_period_days)
  ),
  module_totals as (
    select
      event.member_id,
      event.module_id,
      count(*)::integer as activity_count,
      max(event.occurred_at) as latest_activity_at
    from activity_events event
    group by event.member_id, event.module_id
  ),
  ranked_modules as (
    select
      total.*,
      row_number() over (
        partition by total.member_id
        order by
          total.activity_count desc,
          total.latest_activity_at desc,
          total.module_id
      ) as usage_rank
    from module_totals total
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'memberId', ranked.member_id,
        'mostUsedModuleId', ranked.module_id,
        'activityCount', ranked.activity_count,
        'latestActivityAt', ranked.latest_activity_at,
        'periodDays', safe_period_days
      )
      order by ranked.member_id
    ),
    '[]'::jsonb
  )
  into result
  from ranked_modules ranked
  where ranked.usage_rank = 1;

  return result;
end;
$$;

revoke all on function public.get_beast_admin_member_usage_summary(integer)
  from public;
grant execute on function public.get_beast_admin_member_usage_summary(integer)
  to authenticated;
