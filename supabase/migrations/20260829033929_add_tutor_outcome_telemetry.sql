-- BE-301: register the AI Tutor in privacy-bounded first-party telemetry.
-- This migration stores only governed event taxonomy values. It does not store
-- homework text, image data, filenames, prompts, responses, or member identity.

alter table public.beast_telemetry_events
  drop constraint if exists beast_telemetry_events_professional_id_check;

alter table public.beast_telemetry_events
  add constraint beast_telemetry_events_professional_id_check check (
    professional_id is null or professional_id in (
      'fusion_director', 'money_coach', 'guidance_counselor', 'tutor', 'health_advisor'
    )
  );

alter function public.get_beast_admin_first_party_telemetry(integer, text)
  rename to get_beast_admin_first_party_telemetry_without_tutor;

revoke all on function public.get_beast_admin_first_party_telemetry_without_tutor(integer, text)
  from public;
revoke all on function public.get_beast_admin_first_party_telemetry_without_tutor(integer, text)
  from anon;
revoke all on function public.get_beast_admin_first_party_telemetry_without_tutor(integer, text)
  from authenticated;

create function public.get_beast_admin_first_party_telemetry(
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
  base_result jsonb;
  tutor_result jsonb;
begin
  base_result := public.get_beast_admin_first_party_telemetry_without_tutor(
    reporting_days,
    telemetry_environment
  );

  select jsonb_build_object(
    'professionalId', 'tutor',
    'turnsInitiated', count(*) filter (where event_name = 'professional_turn_started'),
    'turnsCompleted', count(*) filter (where event_name = 'professional_turn_completed'),
    'successfulResponses', count(*) filter (
      where event_name = 'professional_turn_completed' and outcome = 'success'
    ),
    'failures', count(*) filter (where event_name = 'professional_turn_failed'),
    'timeouts', count(*) filter (
      where event_name = 'professional_turn_failed'
        and (outcome = 'timeout' or error_category = 'timeout')
    ),
    'ordinaryRoutes', count(*) filter (
      where event_name = 'professional_turn_completed' and model_route = 'ordinary'
    ),
    'strongRoutes', count(*) filter (
      where event_name = 'professional_turn_completed' and model_route = 'strong'
    ),
    'medianLatencyMs', null,
    'p95LatencyMs', null
  )
  into tutor_result
  from public.beast_telemetry_events
  where environment = telemetry_environment
    and actor_class = 'member'
    and professional_id = 'tutor'
    and expires_at > now()
    and occurred_at >= now() - make_interval(days => reporting_days);

  return jsonb_set(
    base_result,
    '{professionalUsage}',
    coalesce(base_result -> 'professionalUsage', '[]'::jsonb)
      || jsonb_build_array(tutor_result)
  );
end;
$$;

revoke all on function public.get_beast_admin_first_party_telemetry(integer, text)
  from public;
revoke all on function public.get_beast_admin_first_party_telemetry(integer, text)
  from anon;
grant execute on function public.get_beast_admin_first_party_telemetry(integer, text)
  to authenticated;

comment on function public.get_beast_admin_first_party_telemetry(integer, text) is
  'Owner-only aggregate telemetry including AI Tutor workflow outcomes. Never returns actor UUIDs, homework content, images, filenames, prompts, or responses.';
