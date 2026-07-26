-- BA-119: owner-only, read-only Supabase migration and capability diagnostics.
-- This function exposes migration identifiers and approved object metadata only.
-- It never returns migration statements, credentials, member data, or mutations.

create or replace function public.get_beast_admin_migration_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_catalog
as $$
declare
  migration_history_available boolean :=
    to_regclass('supabase_migrations.schema_migrations') is not null;
  migration_rows jsonb := '[]'::jsonb;
  object_rows jsonb := '[]'::jsonb;
begin
  if not public.is_profile_admin() then
    raise exception 'BeastAdmin owner access required'
      using errcode = '42501';
  end if;

  if migration_history_available then
    execute $query$
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'version', migration_record ->> 'version',
            'name', nullif(migration_record ->> 'name', ''),
            'appliedAt', coalesce(
              nullif(migration_record ->> 'applied_at', ''),
              nullif(migration_record ->> 'inserted_at', ''),
              nullif(migration_record ->> 'created_at', '')
            )
          )
          order by migration_record ->> 'version'
        ),
        '[]'::jsonb
      )
      from (
        select to_jsonb(history_row) - 'statements' as migration_record
        from supabase_migrations.schema_migrations history_row
      ) migration_history
    $query$
    into migration_rows;
  end if;

  with expected_objects(
    capability_id,
    required_migration,
    object_id,
    object_kind,
    schema_name,
    object_name,
    identity
  ) as (
    values
      (
        'executive_metrics',
        '20260726000700_add_beast_admin_executive_metrics.sql',
        'executive_metrics_rpc',
        'function',
        'public',
        'get_beast_admin_executive_metrics',
        'public.get_beast_admin_executive_metrics(integer)'
      ),
      (
        'beta_feedback',
        '20260726000300_add_beast_admin_beta_feedback.sql',
        'beta_feedback_notifications',
        'table',
        'public',
        'beast_member_notifications',
        'public.beast_member_notifications'
      ),
      (
        'beta_feedback',
        '20260726000300_add_beast_admin_beta_feedback.sql',
        'beta_feedback_rpc',
        'function',
        'public',
        'get_beast_admin_beta_feedback',
        'public.get_beast_admin_beta_feedback()'
      ),
      (
        'feature_flags',
        '20260726000400_add_beast_admin_feature_flags.sql',
        'feature_flags_table',
        'table',
        'public',
        'beast_admin_feature_flags',
        'public.beast_admin_feature_flags'
      ),
      (
        'feature_flags',
        '20260726000400_add_beast_admin_feature_flags.sql',
        'feature_flag_assignments_table',
        'table',
        'public',
        'beast_admin_feature_flag_assignments',
        'public.beast_admin_feature_flag_assignments'
      ),
      (
        'feature_flags',
        '20260726000400_add_beast_admin_feature_flags.sql',
        'feature_flags_rpc',
        'function',
        'public',
        'get_beast_admin_feature_flags',
        'public.get_beast_admin_feature_flags()'
      ),
      (
        'release_center',
        '20260726000600_add_beast_admin_release_center.sql',
        'release_records_table',
        'table',
        'public',
        'beast_admin_release_records',
        'public.beast_admin_release_records'
      ),
      (
        'release_center',
        '20260726000600_add_beast_admin_release_center.sql',
        'release_records_rpc',
        'function',
        'public',
        'get_beast_admin_release_records',
        'public.get_beast_admin_release_records()'
      ),
      (
        'member_administration',
        '20260726000900_add_authoritative_beast_admin_member_directory.sql',
        'member_directory_rpc',
        'function',
        'public',
        'get_beast_admin_member_directory',
        'public.get_beast_admin_member_directory()'
      ),
      (
        'member_administration',
        '20260726001000_add_beast_admin_member_account_editing.sql',
        'member_module_access_table',
        'table',
        'public',
        'beast_admin_member_module_access',
        'public.beast_admin_member_module_access'
      ),
      (
        'member_administration',
        '20260726001200_add_beast_admin_member_invitations.sql',
        'member_invitations_rpc',
        'function',
        'public',
        'get_beast_admin_member_invitations',
        'public.get_beast_admin_member_invitations()'
      ),
      (
        'member_administration',
        '20260726001300_add_beast_admin_account_access_history.sql',
        'member_access_history_rpc',
        'function',
        'public',
        'get_beast_admin_member_access_history',
        'public.get_beast_admin_member_access_history(uuid,integer)'
      ),
      (
        'member_administration',
        '20260726001400_add_immutable_beast_admin_account_audit_log.sql',
        'account_audit_log_rpc',
        'function',
        'public',
        'get_beast_admin_account_audit_log',
        'public.get_beast_admin_account_audit_log(uuid,text,timestamp with time zone,timestamp with time zone,integer)'
      )
  ),
  inspected_objects as (
    select
      expected.*,
      case
        when expected.object_kind = 'function'
          then to_regprocedure(expected.identity) is not null
        else to_regclass(expected.identity) is not null
      end as object_exists,
      case
        when expected.object_kind = 'function'
          and to_regprocedure(expected.identity) is not null
          then has_function_privilege(
            'authenticated',
            to_regprocedure(expected.identity),
            'EXECUTE'
          )
        else null
      end as authenticated_execute,
      case
        when expected.object_kind = 'table'
          and to_regclass(expected.identity) is not null
          then (
            select relation.relrowsecurity
            from pg_class relation
            where relation.oid = to_regclass(expected.identity)
          )
        else null
      end as rls_enabled,
      case
        when expected.object_kind = 'table'
          and to_regclass(expected.identity) is not null
          then (
            select count(*)::integer
            from pg_policies policy
            where policy.schemaname = expected.schema_name
              and policy.tablename = expected.object_name
          )
        else null
      end as policy_count
    from expected_objects expected
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'capabilityId', inspected.capability_id,
        'requiredMigration', inspected.required_migration,
        'objectId', inspected.object_id,
        'kind', inspected.object_kind,
        'schema', inspected.schema_name,
        'name', inspected.object_name,
        'identity', inspected.identity,
        'exists', inspected.object_exists,
        'authenticatedExecute', inspected.authenticated_execute,
        'rlsEnabled', inspected.rls_enabled,
        'policyCount', inspected.policy_count
      )
      order by inspected.capability_id, inspected.object_id
    ),
    '[]'::jsonb
  )
  into object_rows
  from inspected_objects inspected;

  return jsonb_build_object(
    'historySource', jsonb_build_object(
      'schema', 'supabase_migrations',
      'table', 'schema_migrations',
      'available', migration_history_available,
      'storesAppliedTimestamp',
        exists (
          select 1
          from information_schema.columns column_definition
          where column_definition.table_schema = 'supabase_migrations'
            and column_definition.table_name = 'schema_migrations'
            and column_definition.column_name in (
              'applied_at',
              'inserted_at',
              'created_at'
            )
        )
    ),
    'migrations', migration_rows,
    'objects', object_rows
  );
end;
$$;

revoke all on function public.get_beast_admin_migration_status()
  from public;
grant execute on function public.get_beast_admin_migration_status()
  to authenticated;

notify pgrst, 'reload schema';
