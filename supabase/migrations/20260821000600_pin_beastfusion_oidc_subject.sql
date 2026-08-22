-- BA-CMD-001A: pin publication to the exact GitHub repository identity.

create or replace function public.publish_beastfusion_command_snapshot(
  selected_projection_id text,
  selected_projection_version text,
  selected_payload_hash text,
  selected_canonical_input_digest text,
  selected_source_commit text,
  selected_generated_at timestamptz,
  selected_payload jsonb,
  selected_oidc_issuer text,
  selected_oidc_subject text,
  selected_oidc_audience text,
  selected_repository text,
  selected_workflow_ref text,
  selected_git_ref text,
  selected_workflow_run_number bigint,
  selected_workflow_run_attempt integer,
  selected_token_digest text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_snapshot public.beastfusion_command_snapshots%rowtype;
  current_snapshot public.beastfusion_command_snapshots%rowtype;
  accepted_snapshot_id uuid;
  latest_run_number bigint;
  latest_run_attempt integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('beastfusion_command_projection', 0));
  if selected_projection_version <> '1.0.0'
    or selected_projection_id !~ '^bfcp_[0-9a-f]{16}$'
    or selected_payload_hash !~ '^sha256:[0-9a-f]{64}$'
    or selected_canonical_input_digest !~ '^sha256:[0-9a-f]{64}$'
    or selected_source_commit !~ '^[0-9a-f]{40}$'
    or selected_source_commit = repeat('0', 40)
    or selected_generated_at < now() - interval '24 hours'
    or selected_generated_at > now() + interval '5 minutes'
    or jsonb_typeof(selected_payload) <> 'object'
    or octet_length(selected_payload::text) > 1048576
    or selected_payload ->> '$schema' <> 'beastfusion-command-center-projection.schema.json'
    or selected_payload ->> 'projectionVersion' <> selected_projection_version
    or selected_payload ->> 'projectionId' <> selected_projection_id
    or selected_payload #>> '{source,commit}' <> selected_source_commit
    or selected_payload #>> '{source,canonicalInputDigest}' <> selected_canonical_input_digest
    or selected_payload #>> '{source,repository}' <> 'seangworld/beastfusion'
    or selected_payload #>> '{source,branch}' <> 'main'
    or selected_payload #>> '{source,generatorVersion}' <> '1.0.0'
    or (selected_payload #>> '{classification,audience}') <> 'beastadmin_owner_only'
    or (selected_payload #>> '{classification,containsMemberData}')::boolean is distinct from false
    or (selected_payload #>> '{classification,containsSecrets}')::boolean is distinct from false
    or (selected_payload #>> '{classification,containsRawPrompts}')::boolean is distinct from false
    or selected_oidc_issuer <> 'https://token.actions.githubusercontent.com'
    or selected_repository <> 'seangworld/beastfusion'
    or selected_git_ref <> 'refs/heads/main'
    or selected_oidc_subject <> 'repo:seangworld@271630738/beastfusion@1297414450:ref:refs/heads/main'
    or selected_oidc_audience is null or length(selected_oidc_audience) < 8
    or selected_workflow_ref is null or selected_workflow_ref not like 'seangworld/beastfusion/.github/workflows/%@refs/heads/main'
    or selected_workflow_run_number < 1 or selected_workflow_run_attempt < 1
    or selected_token_digest !~ '^sha256:[0-9a-f]{64}$'
  then
    raise exception 'Projection contract validation failed';
  end if;

  select snapshot.* into current_snapshot
  from public.beastfusion_command_current pointer
  join public.beastfusion_command_snapshots snapshot on snapshot.id = pointer.snapshot_id
  where pointer.singleton = true
  for update of pointer;

  select workflow_run_number, workflow_run_attempt
  into latest_run_number, latest_run_attempt
  from public.beastfusion_command_ingestions
  where repository = selected_repository
    and workflow_ref = selected_workflow_ref
    and git_ref = selected_git_ref
  order by workflow_run_number desc, workflow_run_attempt desc
  limit 1;

  if latest_run_number is not null and (
    selected_workflow_run_number < latest_run_number
    or (selected_workflow_run_number = latest_run_number and selected_workflow_run_attempt <= latest_run_attempt)
  ) then
    raise exception 'Replay or out-of-order workflow publication rejected';
  end if;

  select * into existing_snapshot
  from public.beastfusion_command_snapshots
  where projection_id = selected_projection_id or payload_hash = selected_payload_hash
  limit 1;

  if existing_snapshot.id is not null then
    if existing_snapshot.projection_id <> selected_projection_id
      or existing_snapshot.payload_hash <> selected_payload_hash
      or existing_snapshot.canonical_input_digest <> selected_canonical_input_digest
      or existing_snapshot.source_commit <> selected_source_commit
    then
      raise exception 'Projection identity conflicts with immutable history';
    end if;
    if current_snapshot.id is distinct from existing_snapshot.id then
      raise exception 'Stale or downgrade projection rejected';
    end if;
    insert into public.beastfusion_command_ingestions (
      snapshot_id, outcome, oidc_issuer, oidc_subject, oidc_audience, repository,
      workflow_ref, git_ref, source_commit, workflow_run_number,
      workflow_run_attempt, token_digest, payload_hash
    ) values (
      existing_snapshot.id, 'heartbeat', selected_oidc_issuer, selected_oidc_subject,
      selected_oidc_audience, selected_repository, selected_workflow_ref,
      selected_git_ref, selected_source_commit, selected_workflow_run_number,
      selected_workflow_run_attempt, selected_token_digest, selected_payload_hash
    );
    return jsonb_build_object(
      'status', 'Already Current',
      'snapshotId', existing_snapshot.id,
      'projectionId', existing_snapshot.projection_id
    );
  end if;

  if current_snapshot.id is not null and selected_generated_at <= current_snapshot.generated_at then
    raise exception 'Stale or downgrade projection rejected';
  end if;

  insert into public.beastfusion_command_snapshots (
    projection_id, projection_version, payload_hash, canonical_input_digest,
    source_commit, generated_at, payload
  ) values (
    selected_projection_id, selected_projection_version, selected_payload_hash,
    selected_canonical_input_digest, selected_source_commit,
    selected_generated_at, selected_payload
  ) returning id into accepted_snapshot_id;

  insert into public.beastfusion_command_ingestions (
    snapshot_id, outcome, oidc_issuer, oidc_subject, oidc_audience, repository,
    workflow_ref, git_ref, source_commit, workflow_run_number,
    workflow_run_attempt, token_digest, payload_hash
  ) values (
    accepted_snapshot_id, 'accepted', selected_oidc_issuer, selected_oidc_subject,
    selected_oidc_audience, selected_repository, selected_workflow_ref,
    selected_git_ref, selected_source_commit, selected_workflow_run_number,
    selected_workflow_run_attempt, selected_token_digest, selected_payload_hash
  );

  insert into public.beastfusion_command_current (singleton, snapshot_id, advanced_at)
  values (true, accepted_snapshot_id, now())
  on conflict (singleton) do update
    set snapshot_id = excluded.snapshot_id,
        advanced_at = excluded.advanced_at;

  return jsonb_build_object('status', 'Accepted', 'snapshotId', accepted_snapshot_id, 'projectionId', selected_projection_id);
end;
$$;

revoke all on function public.publish_beastfusion_command_snapshot(text, text, text, text, text, timestamptz, jsonb, text, text, text, text, text, text, bigint, integer, text) from public, anon, authenticated;
grant execute on function public.publish_beastfusion_command_snapshot(text, text, text, text, text, timestamptz, jsonb, text, text, text, text, text, text, bigint, integer, text) to service_role;
