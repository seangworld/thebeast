-- TODO #17 owner-authorized expansion of the existing revocable standing
-- observation. This adds read-only aggregate outcome evidence; it grants no
-- execution, spending, publication, or Production-change authority.

alter table public.beast_admin_staff_schedules
  drop constraint if exists beast_admin_staff_schedule_scope_check,
  drop constraint if exists beast_admin_staff_schedule_sources_check;

alter table public.beast_admin_standing_authorizations
  drop constraint if exists beast_admin_standing_scope_check,
  drop constraint if exists beast_admin_standing_sources_check;

update public.beast_admin_staff_schedules
set scope_key = 'orchestrator_3_site_wide_observation_v2',
    permitted_sources = '["beastfusion_canonical_projection", "github_repository_evidence", "vercel_deployment_evidence", "growth_aggregate_outcome_evidence", "news_aggregate_outcome_evidence", "ux_aggregate_outcome_evidence"]'::jsonb,
    updated_at = now()
where assignment_key = 'orchestrator_3_standing_observation'
  and scope_key = 'orchestrator_3_bounded_observation_v1';

update public.beast_admin_standing_authorizations
set scope_key = 'orchestrator_3_site_wide_observation_v2',
    permitted_sources = '["beastfusion_canonical_projection", "github_repository_evidence", "vercel_deployment_evidence", "growth_aggregate_outcome_evidence", "news_aggregate_outcome_evidence", "ux_aggregate_outcome_evidence"]'::jsonb
where authorization_key = 'orchestrator_3_standing_observation'
  and scope_key = 'orchestrator_3_bounded_observation_v1';

alter table public.beast_admin_staff_schedules
  alter column scope_key set default 'orchestrator_3_site_wide_observation_v2',
  alter column permitted_sources set default '["beastfusion_canonical_projection", "github_repository_evidence", "vercel_deployment_evidence", "growth_aggregate_outcome_evidence", "news_aggregate_outcome_evidence", "ux_aggregate_outcome_evidence"]'::jsonb,
  add constraint beast_admin_staff_schedule_scope_check
    check (scope_key = 'orchestrator_3_site_wide_observation_v2'),
  add constraint beast_admin_staff_schedule_sources_check
    check (permitted_sources = '["beastfusion_canonical_projection", "github_repository_evidence", "vercel_deployment_evidence", "growth_aggregate_outcome_evidence", "news_aggregate_outcome_evidence", "ux_aggregate_outcome_evidence"]'::jsonb);

alter table public.beast_admin_standing_authorizations
  alter column scope_key set default 'orchestrator_3_site_wide_observation_v2',
  alter column permitted_sources set default '["beastfusion_canonical_projection", "github_repository_evidence", "vercel_deployment_evidence", "growth_aggregate_outcome_evidence", "news_aggregate_outcome_evidence", "ux_aggregate_outcome_evidence"]'::jsonb,
  add constraint beast_admin_standing_scope_check
    check (scope_key = 'orchestrator_3_site_wide_observation_v2'),
  add constraint beast_admin_standing_sources_check
    check (permitted_sources = '["beastfusion_canonical_projection", "github_repository_evidence", "vercel_deployment_evidence", "growth_aggregate_outcome_evidence", "news_aggregate_outcome_evidence", "ux_aggregate_outcome_evidence"]'::jsonb);

comment on table public.beast_admin_standing_authorizations is
  'Persisted, revocable owner authorization for the fixed site-wide Orchestrator observation scope. Aggregate evidence may recommend Continue, Modify, or Investigate; it cannot execute, spend, publish, or change Production.';
