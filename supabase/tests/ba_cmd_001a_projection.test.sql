-- Run only against the disposable local Supabase test database after migrations.
begin;

create extension if not exists pgtap;
select plan(22);

select has_table('public', 'beastfusion_command_snapshots', 'immutable snapshot table exists');
select has_table('public', 'beastfusion_command_ingestions', 'append-only ingestion receipt table exists');
select has_table('public', 'beastfusion_command_current', 'current snapshot pointer exists');
select has_function('public', 'publish_beastfusion_command_snapshot', array['text','text','text','text','text','timestamp with time zone','jsonb','text','text','text','text','text','text','bigint','integer','text'], 'service publication function exists');
select has_function('public', 'get_beastfusion_command_current', array[]::text[], 'service-only read function exists');
select ok((select relrowsecurity from pg_class where oid = 'public.beastfusion_command_snapshots'::regclass), 'snapshot RLS is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.beastfusion_command_ingestions'::regclass), 'ingestion RLS is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.beastfusion_command_current'::regclass), 'pointer RLS is enabled');
select ok(not has_table_privilege('anon', 'public.beastfusion_command_snapshots', 'select'), 'anonymous cannot read snapshots');
select ok(not has_table_privilege('authenticated', 'public.beastfusion_command_snapshots', 'select'), 'members cannot read snapshots directly');
select ok(not has_table_privilege('authenticated', 'public.beastfusion_command_snapshots', 'insert'), 'members cannot publish snapshots');
select ok(not has_table_privilege('authenticated', 'public.beastfusion_command_ingestions', 'select'), 'members cannot read machine receipts');
select ok(not has_function_privilege('authenticated', 'public.get_beastfusion_command_current()', 'execute'), 'members cannot fetch raw projection payloads');

select is(
  public.publish_beastfusion_command_snapshot(
    'bfcp_bbbbbbbbbbbbbbbb', '1.0.0',
    'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', now(),
    '{"$schema":"beastfusion-command-center-projection.schema.json","projectionVersion":"1.0.0","projectionId":"bfcp_bbbbbbbbbbbbbbbb","source":{"repository":"seangworld/beastfusion","branch":"main","commit":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","canonicalInputDigest":"sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","generatorVersion":"1.0.0"},"classification":{"audience":"beastadmin_owner_only","containsMemberData":false,"containsSecrets":false,"containsRawPrompts":false}}'::jsonb,
    'https://token.actions.githubusercontent.com', 'repo:seangworld/beastfusion:ref:refs/heads/main',
    'https://dev.example.com/api/admin/beastfusion-projection', 'seangworld/beastfusion',
    'seangworld/beastfusion/.github/workflows/publish-beastadmin-projection.yml@refs/heads/main',
    'refs/heads/main', 42, 1,
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
  ) ->> 'status',
  'Accepted',
  'first valid OIDC service publication is accepted'
);

select is(
  public.publish_beastfusion_command_snapshot(
    'bfcp_bbbbbbbbbbbbbbbb', '1.0.0',
    'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', now(),
    '{"$schema":"beastfusion-command-center-projection.schema.json","projectionVersion":"1.0.0","projectionId":"bfcp_bbbbbbbbbbbbbbbb","source":{"repository":"seangworld/beastfusion","branch":"main","commit":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","canonicalInputDigest":"sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","generatorVersion":"1.0.0"},"classification":{"audience":"beastadmin_owner_only","containsMemberData":false,"containsSecrets":false,"containsRawPrompts":false}}'::jsonb,
    'https://token.actions.githubusercontent.com', 'repo:seangworld/beastfusion:ref:refs/heads/main',
    'https://dev.example.com/api/admin/beastfusion-projection', 'seangworld/beastfusion',
    'seangworld/beastfusion/.github/workflows/publish-beastadmin-projection.yml@refs/heads/main',
    'refs/heads/main', 43, 1,
    'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
  ) ->> 'status',
  'Already Current',
  'same snapshot from a newer workflow run is a safe heartbeat'
);

select is((select count(*)::bigint from public.beastfusion_command_ingestions), 2::bigint, 'accepted publication and heartbeat retain separate immutable receipts');
select is((select count(*)::bigint from public.beastfusion_command_current), 1::bigint, 'only one current pointer exists');

select throws_ok(
  $$select public.publish_beastfusion_command_snapshot(
    'bfcp_bbbbbbbbbbbbbbbb', '1.0.0',
    'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', now(),
    '{"$schema":"beastfusion-command-center-projection.schema.json","projectionVersion":"1.0.0","projectionId":"bfcp_bbbbbbbbbbbbbbbb","source":{"repository":"seangworld/beastfusion","branch":"main","commit":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","canonicalInputDigest":"sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd","generatorVersion":"1.0.0"},"classification":{"audience":"beastadmin_owner_only","containsMemberData":false,"containsSecrets":false,"containsRawPrompts":false}}'::jsonb,
    'https://token.actions.githubusercontent.com', 'repo:seangworld/beastfusion:ref:refs/heads/main',
    'https://dev.example.com/api/admin/beastfusion-projection', 'seangworld/beastfusion',
    'seangworld/beastfusion/.github/workflows/publish-beastadmin-projection.yml@refs/heads/main',
    'refs/heads/main', 43, 1,
    'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  )$$,
  'P0001', 'Replay or out-of-order workflow publication rejected',
  'replayed workflow identity is rejected'
);

select throws_ok(
  $$select public.publish_beastfusion_command_snapshot(
    'bfcp_ffffffffffffffff', '1.0.0',
    'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'ffffffffffffffffffffffffffffffffffffffff', now() - interval '2 days',
    '{"$schema":"beastfusion-command-center-projection.schema.json","projectionVersion":"1.0.0","projectionId":"bfcp_ffffffffffffffff","source":{"repository":"seangworld/beastfusion","branch":"main","commit":"ffffffffffffffffffffffffffffffffffffffff","canonicalInputDigest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","generatorVersion":"1.0.0"},"classification":{"audience":"beastadmin_owner_only","containsMemberData":false,"containsSecrets":false,"containsRawPrompts":false}}'::jsonb,
    'https://token.actions.githubusercontent.com', 'repo:seangworld/beastfusion:ref:refs/heads/main',
    'https://dev.example.com/api/admin/beastfusion-projection', 'seangworld/beastfusion',
    'seangworld/beastfusion/.github/workflows/publish-beastadmin-projection.yml@refs/heads/main',
    'refs/heads/main', 44, 1,
    'sha256:9999999999999999999999999999999999999999999999999999999999999999'
  )$$,
  'P0001', 'Projection contract validation failed',
  'stale publication is rejected without pointer regression'
);

select throws_ok(
  $$update public.beastfusion_command_snapshots set generated_at = now()$$,
  'P0001', 'Canonical BeastFusion snapshots are immutable',
  'accepted snapshot cannot be updated'
);
select throws_ok(
  $$delete from public.beastfusion_command_snapshots$$,
  'P0001', 'Canonical BeastFusion snapshots are immutable',
  'accepted snapshot cannot be deleted'
);
select throws_ok(
  $$update public.beastfusion_command_ingestions set received_at = now()$$,
  'P0001', 'Canonical BeastFusion snapshots are immutable',
  'ingestion receipts cannot be mutated'
);

select * from finish();
rollback;
