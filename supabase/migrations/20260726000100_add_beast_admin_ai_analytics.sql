-- BA-103: privacy-preserving aggregate analytics for Beast professional conversations.
-- The function returns platform aggregates only. Raw conversation content and
-- member-level records remain inside their source tables.

create or replace function public.get_beast_admin_ai_analytics(
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
  result jsonb;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  with conversation_scope as (
    select
      conversation.id,
      conversation.owner_id,
      conversation.agent_id,
      conversation.tags,
      conversation.archived,
      conversation.created_at
    from public.agent_conversations conversation
    where conversation.created_at >= window_start
  ),
  conversation_rollup as (
    select
      conversation.id,
      conversation.owner_id,
      conversation.agent_id,
      conversation.tags,
      conversation.archived,
      conversation.created_at,
      count(message.id)::integer as message_count,
      count(message.id) filter (
        where message.sender ->> 'kind' = 'user'
      )::integer as member_message_count,
      count(message.id) filter (
        where message.sender ->> 'kind' = 'agent'
      )::integer as professional_message_count,
      min(message.created_at) as first_message_at,
      max(message.created_at) as last_message_at,
      (
        array_agg(
          message.sender ->> 'kind'
          order by message.created_at desc, message.id desc
        ) filter (where message.id is not null)
      )[1] as last_sender_kind
    from conversation_scope conversation
    left join public.agent_conversation_messages message
      on message.conversation_id = conversation.id
    group by
      conversation.id,
      conversation.owner_id,
      conversation.agent_id,
      conversation.tags,
      conversation.archived,
      conversation.created_at
  ),
  professional_rows as (
    select
      rollup.agent_id,
      count(*)::integer as conversation_count,
      sum(rollup.message_count)::integer as message_count
    from conversation_rollup rollup
    group by rollup.agent_id
  ),
  professional_usage as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'agentId', professional.agent_id,
          'conversationCount', professional.conversation_count,
          'messageCount', professional.message_count
        )
        order by professional.conversation_count desc, professional.agent_id
      ),
      '[]'::jsonb
    ) as value
    from professional_rows professional
  ),
  topic_rows as (
    select
      lower(btrim(topic.value)) as topic,
      count(*)::integer as conversation_count
    from conversation_rollup rollup
    cross join lateral unnest(rollup.tags) as topic(value)
    where btrim(topic.value) <> ''
    group by lower(btrim(topic.value))
  ),
  common_topics as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'topic', topic.topic,
          'conversationCount', topic.conversation_count
        )
        order by topic.conversation_count desc, topic.topic
      ),
      '[]'::jsonb
    ) as value
    from (
      select *
      from topic_rows
      order by conversation_count desc, topic
      limit 8
    ) topic
  ),
  daily_rows as (
    select
      rollup.created_at::date as activity_date,
      count(*)::integer as conversation_count
    from conversation_rollup rollup
    group by rollup.created_at::date
  ),
  daily_activity as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'date', daily.activity_date,
          'conversationCount', daily.conversation_count
        )
        order by daily.activity_date
      ),
      '[]'::jsonb
    ) as value
    from daily_rows daily
  ),
  totals as (
    select
      count(*)::integer as conversation_count,
      count(distinct rollup.owner_id)::integer as engaged_member_count,
      coalesce(sum(rollup.message_count), 0)::integer as message_count,
      count(*) filter (where rollup.archived)::integer as archived_count,
      count(*) filter (
        where rollup.member_message_count > 0
          and (
            rollup.professional_message_count = 0
            or (
              rollup.last_sender_kind = 'user'
              and rollup.last_message_at < now() - interval '24 hours'
            )
          )
      )::integer as abandoned_count,
      avg(
        extract(
          epoch from (rollup.last_message_at - rollup.first_message_at)
        )
      ) filter (
        where rollup.message_count >= 2
          and rollup.first_message_at is not null
          and rollup.last_message_at is not null
      ) as average_session_seconds
    from conversation_rollup rollup
  )
  select jsonb_build_object(
    'windowDays', safe_window_days,
    'generatedAt', now(),
    'conversationCount', totals.conversation_count,
    'engagedMemberCount', totals.engaged_member_count,
    'messageCount', totals.message_count,
    'archivedCount', totals.archived_count,
    'abandonedCount', totals.abandoned_count,
    'averageSessionSeconds',
      case
        when totals.average_session_seconds is null then null
        else round(totals.average_session_seconds)::integer
      end,
    'completionRate', null,
    'helpfulResponseRate', null,
    'professionalUsage', professional_usage.value,
    'commonTopics', common_topics.value,
    'dailyActivity', daily_activity.value
  )
  into result
  from totals
  cross join professional_usage
  cross join common_topics
  cross join daily_activity;

  return result;
end;
$$;

revoke all on function public.get_beast_admin_ai_analytics(integer) from public;
grant execute on function public.get_beast_admin_ai_analytics(integer)
  to authenticated;
