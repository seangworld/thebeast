-- Run only against the disposable local Supabase test database after migrations.
begin;

create extension if not exists pgtap;
select plan(17);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  email_confirmed_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '81000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'ba-tel-admin@example.invalid', '',
    '{}'::jsonb, '{}'::jsonb, now(), now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '81000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'ba-tel-member@example.invalid', '',
    '{}'::jsonb, '{}'::jsonb, now(), now(), now()
  );

update public.profiles
set role = 'admin'
where id = '81000000-0000-4000-8000-000000000001';

update public.profiles
set onboarding_complete = true
where id = '81000000-0000-4000-8000-000000000002';

select has_table('public', 'beast_telemetry_events', 'bounded telemetry table exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.beast_telemetry_events'::regclass),
  true,
  'telemetry table has RLS enabled'
);
select hasnt_column('public', 'beast_telemetry_events', 'payload', 'no arbitrary payload column exists');
select hasnt_column('public', 'beast_telemetry_events', 'content', 'no content column exists');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select count(*) from public.beast_telemetry_events$$,
  '42501', 'permission denied for table beast_telemetry_events',
  'ordinary members cannot read the telemetry dataset'
);
select throws_ok(
  $$insert into public.beast_telemetry_events (
    actor_id, actor_class, event_name, environment, module_id, outcome
  ) values (
    '81000000-0000-4000-8000-000000000002', 'member', 'goal_created',
    'test', 'goals', 'success'
  )$$,
  '42501', 'permission denied for table beast_telemetry_events',
  'ordinary members cannot directly insert telemetry'
);
select throws_ok(
  $$select public.record_beast_telemetry_event(
    '81000000-0000-4000-8000-000000000002', 'goal_created', 'test',
    'goals', null, 'success', null, null, null
  )$$,
  '42501', 'permission denied for function record_beast_telemetry_event',
  'ordinary members cannot execute the server-only recorder'
);
select throws_ok(
  $$select public.get_beast_admin_first_party_telemetry(30, 'test')$$,
  '42501', 'BeastAdmin owner access required',
  'ordinary members cannot read aggregate ecosystem telemetry'
);
reset role;

set local role service_role;
select lives_ok(
  $$select public.record_beast_telemetry_event(
    '81000000-0000-4000-8000-000000000002',
    'professional_turn_completed', 'test', 'money', 'money_coach',
    'success', null, '3s_to_10s', 'ordinary'
  )$$,
  'service role records one bounded event'
);
select throws_ok(
  $$select public.record_beast_telemetry_event(
    '81000000-0000-4000-8000-000000000002',
    'unknown_event', 'test', 'money', null, 'success', null, null, null
  )$$,
  '23514', null,
  'unknown event types fail closed'
);
reset role;

select is(
  (select count(*)::bigint from public.beast_telemetry_events),
  1::bigint,
  'only the governed event persisted'
);
select throws_ok(
  $$update public.beast_telemetry_events set outcome = 'completed'$$,
  '42501', 'Beast telemetry events are append-only',
  'persisted telemetry cannot be updated'
);
select is(
  (select extract(day from (expires_at - occurred_at))::integer from public.beast_telemetry_events limit 1),
  180,
  'raw event retention is bounded to 180 days'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.get_beast_admin_first_party_telemetry(30, 'test')$$,
  'admin can request aggregate telemetry'
);
select is(
  (public.get_beast_admin_first_party_telemetry(30, 'test') #>> '{members,registered}')::integer,
  1,
  'admin account is excluded from registered-member adoption'
);
select is(
  (public.get_beast_admin_first_party_telemetry(30, 'test') #>> '{ownerAdmin,accounts}')::integer,
  1,
  'owner/admin account is classified separately'
);
select unlike(
  public.get_beast_admin_first_party_telemetry(30, 'test')::text,
  '%81000000-0000-4000-8000-000000000002%',
  'aggregate response exposes no member UUID'
);
reset role;

select * from finish();
rollback;
