-- Run only against the disposable local Supabase test database after migrations.
begin;

create extension if not exists pgtap;
select plan(20);

select has_table('public', 'beastfusion_command_snapshots', 'immutable snapshot table exists');
select has_table('public', 'beastfusion_command_current', 'current snapshot pointer exists');
select has_function('public', 'publish_beastfusion_command_snapshot', array['text', 'text', 'text', 'text', 'text', 'timestamp with time zone', 'jsonb'], 'service publication function exists');
select has_function('public', 'get_beastfusion_command_current', array[]::text[], 'owner read function exists');
select ok((select relrowsecurity from pg_class where oid = 'public.beastfusion_command_snapshots'::regclass), 'snapshot RLS is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.beastfusion_command_current'::regclass), 'pointer RLS is enabled');
select ok(not has_table_privilege('anon', 'public.beastfusion_command_snapshots', 'select'), 'anonymous cannot read snapshots');
select ok(not has_table_privilege('authenticated', 'public.beastfusion_command_snapshots', 'select'), 'members cannot read snapshots directly');
select ok(not has_table_privilege('authenticated', 'public.beastfusion_command_snapshots', 'insert'), 'members cannot publish snapshots');
select ok(not has_table_privilege('authenticated', 'public.beastfusion_command_current', 'select'), 'members cannot read the pointer directly');
select ok(has_function_privilege('service_role', 'public.publish_beastfusion_command_snapshot(text,text,text,text,text,timestamptz,jsonb)', 'execute'), 'service role can call publisher');
select ok(not has_function_privilege('authenticated', 'public.publish_beastfusion_command_snapshot(text,text,text,text,text,timestamptz,jsonb)', 'execute'), 'members cannot call publisher');
select ok(has_function_privilege('authenticated', 'public.get_beastfusion_command_current()', 'execute'), 'authenticated owner route can call reader');
select ok(not has_function_privilege('anon', 'public.get_beastfusion_command_current()', 'execute'), 'anonymous cannot call reader');

select is(
  public.publish_beastfusion_command_snapshot(
    'bfcp_bbbbbbbbbbbbbbbb', '1.0.0',
    'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', now(),
    '{"$schema":"beastfusion-command-center-projection.schema.json","projectionVersion":"1.0.0","projectionId":"bfcp_bbbbbbbbbbbbbbbb","source":{"commit":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","canonicalInputDigest":"sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"},"classification":{"audience":"beastadmin_owner_only","containsMemberData":false,"containsSecrets":false,"containsRawPrompts":false}}'::jsonb
  ) ->> 'status',
  'Accepted',
  'first valid service publication is accepted'
);
select is(
  public.publish_beastfusion_command_snapshot(
    'bfcp_bbbbbbbbbbbbbbbb', '1.0.0',
    'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
    'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
    'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', now(),
    '{"$schema":"beastfusion-command-center-projection.schema.json","projectionVersion":"1.0.0","projectionId":"bfcp_bbbbbbbbbbbbbbbb","source":{"commit":"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee","canonicalInputDigest":"sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd"},"classification":{"audience":"beastadmin_owner_only","containsMemberData":false,"containsSecrets":false,"containsRawPrompts":false}}'::jsonb
  ) ->> 'status',
  'Already Current',
  'duplicate publication is idempotent'
);
select is((select count(*)::bigint from public.beastfusion_command_current), 1::bigint, 'only one current pointer exists');
select throws_ok(
  $$select public.publish_beastfusion_command_snapshot(
    'bfcp_ffffffffffffffff', '1.0.0',
    'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'ffffffffffffffffffffffffffffffffffffffff', now() - interval '2 days',
    '{"$schema":"beastfusion-command-center-projection.schema.json","projectionVersion":"1.0.0","projectionId":"bfcp_ffffffffffffffff","source":{"commit":"ffffffffffffffffffffffffffffffffffffffff","canonicalInputDigest":"sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"},"classification":{"audience":"beastadmin_owner_only","containsMemberData":false,"containsSecrets":false,"containsRawPrompts":false}}'::jsonb
  )$$,
  'P0001', 'Projection contract validation failed',
  'stale publication is rejected without pointer regression'
);

insert into public.beastfusion_command_snapshots (
  projection_id, projection_version, payload_hash, canonical_input_digest,
  source_commit, generated_at, payload
) values (
  'bfcp_0123456789abcdef', '1.0.0',
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  'a4a3303a857354ce0568ebcb1ae841e4c7beda0e', now(), '{}'::jsonb
);

select throws_ok(
  $$update public.beastfusion_command_snapshots set generated_at = now() where projection_id = 'bfcp_0123456789abcdef'$$,
  'P0001', 'Canonical BeastFusion snapshots are immutable',
  'accepted snapshot cannot be updated'
);
select throws_ok(
  $$delete from public.beastfusion_command_snapshots where projection_id = 'bfcp_0123456789abcdef'$$,
  'P0001', 'Canonical BeastFusion snapshots are immutable',
  'accepted snapshot cannot be deleted'
);

select * from finish();
rollback;
