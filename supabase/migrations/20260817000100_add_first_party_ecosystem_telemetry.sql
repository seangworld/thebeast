-- BA-TEL-001: privacy-preserving first-party ecosystem telemetry.
--
-- Canonical product records remain authoritative for member activity. This
-- append-only table stores only bounded operational facts that canonical
-- records cannot provide safely. It has no arbitrary JSON, text payload,
-- member-facing read policy, or direct authenticated write permission.

create table if not exists public.beast_telemetry_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  actor_class text not null check (actor_class in ('member', 'owner_admin')),
  event_name text not null check (event_name in (
    'onboarding_completed',
    'bill_created',
    'debt_created',
    'payment_recorded',
    'payoff_plan_viewed',
    'education_goal_created',
    'education_activity_completed',
    'education_course_created',
    'health_workspace_opened',
    'health_record_added',
    'appointment_record_added',
    'goal_created',
    'goal_completed',
    'document_uploaded',
    'document_processed',
    'document_viewed',
    'professional_turn_started',
    'professional_turn_completed',
    'professional_turn_failed',
    'api_failure',
    'database_command_failed'
  )),
  environment text not null check (environment in (
    'development', 'test', 'preview', 'production'
  )),
  module_id text not null check (module_id in (
    'beastos', 'money', 'education', 'health', 'goals', 'documents', 'admin'
  )),
  professional_id text null check (
    professional_id is null or professional_id in (
      'fusion_director', 'money_coach', 'guidance_counselor', 'health_advisor'
    )
  ),
  outcome text not null check (outcome in (
    'started', 'completed', 'success', 'failed', 'timeout'
  )),
  error_category text null check (
    error_category is null or error_category in (
      'authorization', 'configuration', 'database', 'network', 'not_found',
      'provider', 'rate_limited', 'timeout', 'validation', 'unknown'
    )
  ),
  performance_bucket text null check (
    performance_bucket is null or performance_bucket in (
      'under_1s', '1s_to_3s', '3s_to_10s', 'over_10s', 'unknown'
    )
  ),
  model_route text null check (
    model_route is null or model_route in ('ordinary', 'strong', 'none')
  ),
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '180 days'),
  constraint beast_telemetry_events_error_shape_check check (
    (outcome in ('failed', 'timeout') and error_category is not null)
    or (outcome not in ('failed', 'timeout') and error_category is null)
  ),
  constraint beast_telemetry_events_professional_shape_check check (
    (event_name like 'professional_turn_%' and professional_id is not null)
    or (event_name not like 'professional_turn_%')
  ),
  constraint beast_telemetry_events_retention_check check (
    expires_at >= occurred_at + interval '179 days'
    and expires_at <= occurred_at + interval '181 days'
  )
);

create index if not exists beast_telemetry_events_environment_time_idx
  on public.beast_telemetry_events (environment, occurred_at desc);
create index if not exists beast_telemetry_events_actor_time_idx
  on public.beast_telemetry_events (actor_id, occurred_at desc);
create index if not exists beast_telemetry_events_event_time_idx
  on public.beast_telemetry_events (event_name, occurred_at desc);
create index if not exists beast_telemetry_events_expiry_idx
  on public.beast_telemetry_events (expires_at);

alter table public.beast_telemetry_events enable row level security;

revoke all on table public.beast_telemetry_events from public;
revoke all on table public.beast_telemetry_events from anon;
revoke all on table public.beast_telemetry_events from authenticated;
revoke all on table public.beast_telemetry_events from service_role;
grant insert on table public.beast_telemetry_events to service_role;

create or replace function public.prevent_beast_telemetry_event_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'Beast telemetry events are append-only'
    using errcode = '42501';
end;
$$;

drop trigger if exists prevent_beast_telemetry_event_update
  on public.beast_telemetry_events;
create trigger prevent_beast_telemetry_event_update
before update on public.beast_telemetry_events
for each row execute function public.prevent_beast_telemetry_event_mutation();

create or replace function public.record_beast_telemetry_event(
  p_actor_id uuid,
  p_event_name text,
  p_environment text,
  p_module_id text,
  p_professional_id text default null,
  p_outcome text default 'completed',
  p_error_category text default null,
  p_performance_bucket text default null,
  p_model_route text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_actor_class text;
  v_event_id uuid;
begin
  select case when profile.role = 'admin' then 'owner_admin' else 'member' end
  into v_actor_class
  from public.profiles profile
  where profile.id = p_actor_id;

  if v_actor_class is null then
    raise exception 'Telemetry actor profile is unavailable'
      using errcode = 'P0002';
  end if;

  insert into public.beast_telemetry_events (
    actor_id,
    actor_class,
    event_name,
    environment,
    module_id,
    professional_id,
    outcome,
    error_category,
    performance_bucket,
    model_route
  ) values (
    p_actor_id,
    v_actor_class,
    p_event_name,
    p_environment,
    p_module_id,
    p_professional_id,
    p_outcome,
    p_error_category,
    p_performance_bucket,
    p_model_route
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.record_beast_telemetry_event(
  uuid, text, text, text, text, text, text, text, text
) from public;
revoke all on function public.record_beast_telemetry_event(
  uuid, text, text, text, text, text, text, text, text
) from anon;
revoke all on function public.record_beast_telemetry_event(
  uuid, text, text, text, text, text, text, text, text
) from authenticated;
grant execute on function public.record_beast_telemetry_event(
  uuid, text, text, text, text, text, text, text, text
) to service_role;

create or replace function public.get_beast_admin_first_party_telemetry(
  reporting_days integer default 30,
  telemetry_environment text default 'production'
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  safe_days integer;
  safe_environment text;
  minimum_cohort integer := 5;
  window_start timestamptz;
  result jsonb;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  if reporting_days not in (7, 30, 90) then
    raise exception 'Select a supported telemetry range: 7, 30, or 90 days.'
      using errcode = '22023';
  end if;
  safe_days := reporting_days;

  if telemetry_environment not in ('development', 'test', 'preview', 'production') then
    raise exception 'Select a supported telemetry environment.'
      using errcode = '22023';
  end if;
  safe_environment := telemetry_environment;
  window_start := now() - make_interval(days => safe_days);

  with member_profiles as (
    select
      profile.id,
      profile.role,
      profile.onboarding_complete,
      profile.created_at,
      profile.updated_at,
      auth_user.email_confirmed_at
    from public.profiles profile
    join auth.users auth_user on auth_user.id = profile.id
  ),
  canonical_events as (
    select
      conversation.owner_id as actor_id,
      conversation.created_at as occurred_at,
      case
        when conversation.agent_id = 'beastmoney.money-coach' then 'money'
        when conversation.agent_id = 'beasteducation.guidance-counselor' then 'education'
        when conversation.agent_id = 'beasthealth.health-advisor' then 'health'
        else 'beastos'
      end::text as module_id,
      'professional_turn_started'::text as event_name
    from public.agent_conversations conversation

    union all

    select
      message.owner_id,
      message.created_at,
      case
        when conversation.agent_id = 'beastmoney.money-coach' then 'money'
        when conversation.agent_id = 'beasteducation.guidance-counselor' then 'education'
        when conversation.agent_id = 'beasthealth.health-advisor' then 'health'
        else 'beastos'
      end,
      'professional_turn_completed'
    from public.agent_conversation_messages message
    join public.agent_conversations conversation
      on conversation.id = message.conversation_id
    where message.sender ->> 'kind' = 'agent'

    union all

    select goal.owner_id, goal.created_at, 'goals', 'goal_created'
    from public.beast_goals goal

    union all

    select lifecycle.owner_id, lifecycle.occurred_at, 'goals', 'goal_completed'
    from public.beast_goal_lifecycle_events lifecycle
    where lifecycle.event_type = 'Completed'

    union all

    select document.owner_id, document.created_at, 'documents', 'document_uploaded'
    from public.beast_documents document
    where document.status <> 'Deleted'

    union all

    select debt.user_id, debt.created_at, 'money', 'debt_created'
    from public.debts debt

    union all

    select bill.user_id, bill.created_at, 'money', 'bill_created'
    from public.bill_events bill

    union all

    select payment.user_id, payment.created_at, 'money', 'payment_recorded'
    from public.bill_payments payment

    union all

    select payment.user_id, payment.created_at, 'money', 'payment_recorded'
    from public.debt_payments payment

    union all

    select activity.user_id, activity.completed_at, 'education', 'education_activity_completed'
    from public.learning_activities activity
    where activity.completed_at is not null

    union all

    select session.user_id, session.completed_at, 'education', 'education_activity_completed'
    from public.learning_sessions session
    where session.completed_at is not null

    union all

    select health.owner_id, health.created_at, 'health', 'health_record_added'
    from public.beast_health_records health
    where health.status <> 'archived'

    union all

    select
      telemetry.actor_id,
      telemetry.occurred_at,
      telemetry.module_id,
      telemetry.event_name
    from public.beast_telemetry_events telemetry
    where telemetry.environment = safe_environment
      and telemetry.expires_at > now()
      and telemetry.event_name in (
        'payoff_plan_viewed', 'health_workspace_opened',
        'document_processed', 'document_viewed'
      )
      and telemetry.outcome in ('completed', 'success')
  ),
  classified_events as (
    select
      event.actor_id,
      event.occurred_at,
      event.module_id,
      event.event_name,
      profile.role
    from canonical_events event
    join member_profiles profile on profile.id = event.actor_id
  ),
  member_events as (
    select * from classified_events where role = 'user'
  ),
  first_actions as (
    select event.actor_id, min(event.occurred_at) as activated_at
    from member_events event
    group by event.actor_id
  ),
  activated_members as (
    select
      profile.id,
      action.activated_at
    from member_profiles profile
    join first_actions action on action.actor_id = profile.id
    where profile.role = 'user'
      and profile.onboarding_complete = true
  ),
  member_totals as (
    select
      count(*) filter (where profile.role = 'user')::integer as registered,
      count(*) filter (
        where profile.role = 'user' and profile.email_confirmed_at is not null
      )::integer as verified,
      count(*) filter (
        where profile.role = 'user' and profile.onboarding_complete = true
      )::integer as onboarding_completed,
      count(activated.id)::integer as activated,
      count(*) filter (where profile.role = 'admin')::integer as admin_accounts
    from member_profiles profile
    left join activated_members activated on activated.id = profile.id
  ),
  activity_totals as (
    select
      count(distinct event.actor_id) filter (
        where event.occurred_at >= date_trunc('day', now())
      )::integer as dau,
      count(distinct event.actor_id) filter (
        where event.occurred_at >= now() - interval '7 days'
      )::integer as wau,
      count(distinct event.actor_id) filter (
        where event.occurred_at >= now() - interval '30 days'
      )::integer as mau,
      count(*) filter (where event.occurred_at >= window_start)::integer
        as meaningful_actions,
      min(event.occurred_at) as first_activity_at,
      max(event.occurred_at) as last_activity_at
    from member_events event
  ),
  owner_totals as (
    select count(*) filter (where event.occurred_at >= window_start)::integer
      as meaningful_actions
    from classified_events event
    where event.role = 'admin'
  ),
  returned_members as (
    select count(*)::integer as returned
    from activated_members activated
    where exists (
      select 1
      from member_events event
      where event.actor_id = activated.id
        and event.occurred_at >= activated.activated_at + interval '1 day'
    )
  ),
  retention_days(day_number) as (values (1), (7), (30)),
  retention_rows as (
    select
      retention.day_number,
      count(activated.id) filter (
        where activated.activated_at <= now() - make_interval(days => retention.day_number)
      )::integer as eligible,
      count(activated.id) filter (
        where activated.activated_at <= now() - make_interval(days => retention.day_number)
          and exists (
            select 1
            from member_events event
            where event.actor_id = activated.id
              and event.occurred_at >= activated.activated_at
                + make_interval(days => retention.day_number)
              and event.occurred_at < activated.activated_at
                + make_interval(days => retention.day_number + 1)
          )
      )::integer as returned
    from retention_days retention
    left join activated_members activated on true
    group by retention.day_number
  ),
  retention_json as (
    select jsonb_agg(
      jsonb_build_object(
        'day', retention.day_number,
        'eligibleMembers', retention.eligible,
        'returnedMembers', retention.returned,
        'rate', case
          when retention.eligible < minimum_cohort then null
          else retention.returned::numeric / retention.eligible
        end,
        'status', case
          when retention.eligible < minimum_cohort then 'insufficient_data'
          else 'available'
        end
      ) order by retention.day_number
    ) as value
    from retention_rows retention
  ),
  module_catalog(module_id, module_label, sort_order) as (
    values
      ('beastos'::text, 'BeastOS'::text, 1),
      ('money', 'BeastMoney', 2),
      ('education', 'BeastEducation', 3),
      ('health', 'BeastHealth', 4),
      ('goals', 'Goals', 5),
      ('documents', 'Documents', 6)
  ),
  module_rows as (
    select
      catalog.module_id,
      catalog.module_label,
      catalog.sort_order,
      count(distinct activated.id) filter (
        where event.occurred_at >= window_start
      )::integer as activated_members,
      count(event.actor_id) filter (
        where event.occurred_at >= window_start
      )::integer as meaningful_actions
    from module_catalog catalog
    left join member_events event on event.module_id = catalog.module_id
    left join activated_members activated on activated.id = event.actor_id
    group by catalog.module_id, catalog.module_label, catalog.sort_order
  ),
  module_json as (
    select jsonb_agg(
      jsonb_build_object(
        'moduleId', module.module_id,
        'moduleLabel', module.module_label,
        'activatedMembers', module.activated_members,
        'meaningfulActions', module.meaningful_actions,
        'adoptionRate', case
          when totals.activated = 0 then null
          else module.activated_members::numeric / totals.activated
        end
      ) order by module.sort_order
    ) as value
    from module_rows module
    cross join member_totals totals
    group by totals.activated
  ),
  member_module_counts as (
    select event.actor_id, count(distinct event.module_id)::integer as module_count
    from member_events event
    join activated_members activated on activated.id = event.actor_id
    where event.occurred_at >= window_start
    group by event.actor_id
  ),
  cross_thresholds(minimum_modules) as (values (1), (2), (3)),
  cross_rows as (
    select
      threshold.minimum_modules,
      count(module_count.actor_id) filter (
        where module_count.module_count >= threshold.minimum_modules
      )::integer as member_count
    from cross_thresholds threshold
    left join member_module_counts module_count on true
    group by threshold.minimum_modules
  ),
  cross_json as (
    select jsonb_agg(
      jsonb_build_object(
        'minimumModules', adoption.minimum_modules,
        'memberCount', adoption.member_count,
        'rate', case
          when totals.activated < minimum_cohort then null
          else adoption.member_count::numeric / totals.activated
        end,
        'status', case
          when totals.activated < minimum_cohort then 'insufficient_data'
          else 'available'
        end
      ) order by adoption.minimum_modules
    ) as value
    from cross_rows adoption
    cross join member_totals totals
    group by totals.activated
  ),
  professional_catalog(professional_id, agent_id, sort_order) as (
    values
      ('fusion_director'::text, 'beastfusion.fusion-director'::text, 1),
      ('money_coach', 'beastmoney.money-coach', 2),
      ('guidance_counselor', 'beasteducation.guidance-counselor', 3),
      ('health_advisor', 'beasthealth.health-advisor', 4)
  ),
  professional_message_rows as (
    select
      catalog.professional_id,
      message.sender ->> 'kind' as sender_kind,
      message.content,
      message.created_at
    from professional_catalog catalog
    join public.agent_conversations conversation
      on conversation.agent_id = catalog.agent_id
    join member_profiles profile
      on profile.id = conversation.owner_id and profile.role = 'user'
    join public.agent_conversation_messages message
      on message.conversation_id = conversation.id
    where message.created_at >= window_start
  ),
  professional_runtime as (
    select
      message.professional_id,
      message.sender_kind,
      case
        when message.sender_kind = 'agent'
          and message.content -> 'runtime' ->> 'latencyMs' ~ '^[0-9]+([.][0-9]+)?$'
        then (message.content -> 'runtime' ->> 'latencyMs')::numeric
        else null
      end as latency_ms,
      case
        when message.sender_kind = 'agent'
          and message.content -> 'runtime' ->> 'model' like '%luna%'
        then 'ordinary'
        when message.sender_kind = 'agent'
          and nullif(message.content -> 'runtime' ->> 'model', '') is not null
        then 'strong'
        else null
      end as model_route
    from professional_message_rows message
  ),
  professional_failures as (
    select
      telemetry.professional_id,
      count(*)::integer as failures,
      count(*) filter (
        where telemetry.error_category = 'timeout' or telemetry.outcome = 'timeout'
      )::integer as timeouts
    from public.beast_telemetry_events telemetry
    where telemetry.environment = safe_environment
      and telemetry.actor_class = 'member'
      and telemetry.expires_at > now()
      and telemetry.occurred_at >= window_start
      and telemetry.event_name = 'professional_turn_failed'
    group by telemetry.professional_id
  ),
  professional_rows as (
    select
      catalog.professional_id,
      count(runtime.sender_kind) filter (where runtime.sender_kind = 'user')::integer
        as turns_initiated,
      count(runtime.sender_kind) filter (where runtime.sender_kind = 'agent')::integer
        as turns_completed,
      count(runtime.sender_kind) filter (where runtime.sender_kind = 'agent')::integer
        as successful_responses,
      coalesce(failure.failures, 0)::integer as failures,
      coalesce(failure.timeouts, 0)::integer as timeouts,
      count(runtime.model_route) filter (where runtime.model_route = 'ordinary')::integer
        as ordinary_routes,
      count(runtime.model_route) filter (where runtime.model_route = 'strong')::integer
        as strong_routes,
      percentile_cont(0.5) within group (order by runtime.latency_ms)
        filter (where runtime.latency_ms is not null) as median_latency,
      percentile_cont(0.95) within group (order by runtime.latency_ms)
        filter (where runtime.latency_ms is not null) as p95_latency,
      catalog.sort_order
    from professional_catalog catalog
    left join professional_runtime runtime
      on runtime.professional_id = catalog.professional_id
    left join professional_failures failure
      on failure.professional_id = catalog.professional_id
    group by
      catalog.professional_id,
      catalog.sort_order,
      failure.failures,
      failure.timeouts
  ),
  professional_json as (
    select jsonb_agg(
      jsonb_build_object(
        'professionalId', professional.professional_id,
        'turnsInitiated', professional.turns_initiated,
        'turnsCompleted', professional.turns_completed,
        'successfulResponses', professional.successful_responses,
        'failures', professional.failures,
        'timeouts', professional.timeouts,
        'ordinaryRoutes', professional.ordinary_routes,
        'strongRoutes', professional.strong_routes,
        'medianLatencyMs', case
          when professional.median_latency is null then null
          else round(professional.median_latency)::integer
        end,
        'p95LatencyMs', case
          when professional.p95_latency is null then null
          else round(professional.p95_latency)::integer
        end
      ) order by professional.sort_order
    ) as value
    from professional_rows professional
  ),
  reliability_totals as (
    select
      count(*) filter (
        where telemetry.outcome in ('completed', 'success')
      )::integer as successful,
      count(*) filter (
        where telemetry.outcome in ('failed', 'timeout')
      )::integer as failures,
      count(*) filter (
        where telemetry.outcome = 'timeout'
          or telemetry.error_category = 'timeout'
      )::integer as timeouts
    from public.beast_telemetry_events telemetry
    where telemetry.environment = safe_environment
      and telemetry.expires_at > now()
      and telemetry.occurred_at >= window_start
  ),
  reliability_error_rows as (
    select telemetry.error_category as category, count(*)::integer as count
    from public.beast_telemetry_events telemetry
    where telemetry.environment = safe_environment
      and telemetry.expires_at > now()
      and telemetry.occurred_at >= window_start
      and telemetry.error_category is not null
    group by telemetry.error_category
  ),
  reliability_error_json as (
    select coalesce(
      jsonb_agg(
        jsonb_build_object('category', error.category, 'count', error.count)
        order by error.count desc, error.category
      ),
      '[]'::jsonb
    ) as value
    from reliability_error_rows error
  )
  select jsonb_build_object(
    'contractVersion', 'ba-tel-001-v1',
    'windowDays', safe_days,
    'generatedAt', now(),
    'environment', safe_environment,
    'source', 'canonical_records_and_bounded_events',
    'historicalTreatment', 'derived_from_canonical_records',
    'rawEventRetentionDays', 180,
    'minimumCohortSize', minimum_cohort,
    'coverage', jsonb_build_object(
      'firstActivityAt', activity.first_activity_at,
      'lastActivityAt', activity.last_activity_at
    ),
    'members', jsonb_build_object(
      'registered', totals.registered,
      'verified', totals.verified,
      'onboardingCompleted', totals.onboarding_completed,
      'activated', totals.activated,
      'activationRate', case
        when totals.onboarding_completed = 0 then null
        else totals.activated::numeric / totals.onboarding_completed
      end
    ),
    'ownerAdmin', jsonb_build_object(
      'accounts', totals.admin_accounts,
      'meaningfulActions', owners.meaningful_actions
    ),
    'activity', jsonb_build_object(
      'dau', activity.dau,
      'wau', activity.wau,
      'mau', activity.mau,
      'meaningfulActions', activity.meaningful_actions
    ),
    'retention', retention.value,
    'moduleAdoption', modules.value,
    'crossModuleAdoption', cross_modules.value,
    'professionalUsage', professionals.value,
    'reliability', jsonb_build_object(
      'successfulOperations', reliability.successful,
      'failures', reliability.failures,
      'timeouts', reliability.timeouts,
      'failureRate', case
        when reliability.successful + reliability.failures = 0 then null
        else reliability.failures::numeric
          / (reliability.successful + reliability.failures)
      end,
      'errorCategories', reliability_errors.value
    ),
    'funnel', jsonb_build_array(
      jsonb_build_object('stage', 'account_created', 'count', totals.registered),
      jsonb_build_object('stage', 'email_verified', 'count', totals.verified),
      jsonb_build_object('stage', 'onboarding_completed', 'count', totals.onboarding_completed),
      jsonb_build_object('stage', 'activated', 'count', totals.activated),
      jsonb_build_object('stage', 'returned', 'count', returned.returned)
    )
  )
  into result
  from member_totals totals
  cross join activity_totals activity
  cross join owner_totals owners
  cross join returned_members returned
  cross join retention_json retention
  cross join module_json modules
  cross join cross_json cross_modules
  cross join professional_json professionals
  cross join reliability_totals reliability
  cross join reliability_error_json reliability_errors;

  return result;
end;
$$;

revoke all on function public.get_beast_admin_first_party_telemetry(integer, text)
  from public;
revoke all on function public.get_beast_admin_first_party_telemetry(integer, text)
  from anon;
grant execute on function public.get_beast_admin_first_party_telemetry(integer, text)
  to authenticated;

comment on table public.beast_telemetry_events is
  'BA-TEL-001 bounded operational telemetry. No arbitrary payloads or member-readable dataset. Raw events are excluded after 180 days and require a governed purge job for physical deletion.';
comment on function public.get_beast_admin_first_party_telemetry(integer, text) is
  'Owner-only aggregate telemetry derived from canonical records and bounded events. Never returns actor UUIDs or private contents.';
