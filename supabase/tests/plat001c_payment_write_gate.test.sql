-- Run only against the disposable local Supabase test database after migrations.
begin;

create extension if not exists pgtap;
select plan(22);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'payment-gate-admin@example.invalid', '',
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'payment-gate-member@example.invalid', '',
    '{}'::jsonb, '{}'::jsonb, now(), now()
  );

update public.profiles
set role = 'admin'
where id = '71000000-0000-4000-8000-000000000001';

insert into public.bill_events (
  id, user_id, name, amount, due_date, frequency, next_due_date_after_payment
) values
  (
    '72000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001',
    'Admin gate bill', 100, 15, 'monthly', '2026-08-15'
  ),
  (
    '72000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000002',
    'Member gate bill', 100, 15, 'monthly', '2026-08-15'
  );

insert into public.debts (
  id, user_id, name, balance, minimum_payment, interest_rate, due_date,
  payment_behavior, next_due_date_after_payment
) values
  (
    '73000000-0000-4000-8000-000000000001',
    '71000000-0000-4000-8000-000000000001',
    'Admin gate debt', 100, 30, 10, 20, 'fixed', '2026-08-20'
  ),
  (
    '73000000-0000-4000-8000-000000000002',
    '71000000-0000-4000-8000-000000000002',
    'Member gate debt', 100, 30, 10, 20, 'fixed', '2026-08-20'
  );

select is(
  (select restricted from public.beastmoney_payment_write_control where control_key = 'global'),
  false,
  'restriction defaults off'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000002', true);
select lives_ok(
  $$select public.record_debt_payment_atomic(
    '74000000-0000-4000-8000-000000000001',
    '73000000-0000-4000-8000-000000000002',
    10, '2026-08-10', '2026-08-20', null, null, 'custom'
  )$$,
  'debt payments work while restriction is off'
);
reset role;
select set_config(
  'plat001c.gate_payment_id',
  (select id::text from public.debt_payments where operation_id = '74000000-0000-4000-8000-000000000001'),
  true
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.set_beastmoney_payment_write_restriction(true, false)$$,
  'admin activates restriction without a broad bypass'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000002', true);
select is(
  (public.get_beastmoney_payment_write_status() ->> 'payments_available')::boolean,
  false,
  'restricted member receives unavailable status'
);
select throws_ok(
  $$select public.record_bill_payment_atomic(
    '74000000-0000-4000-8000-000000000002',
    '72000000-0000-4000-8000-000000000002',
    100, '2026-08-10', '2026-08'
  )$$,
  '55000', 'beastmoney_payment_writes_temporarily_unavailable',
  'bill atomic command is blocked'
);
select throws_ok(
  $$select public.record_debt_payment_atomic(
    '74000000-0000-4000-8000-000000000003',
    '73000000-0000-4000-8000-000000000002',
    10, '2026-08-10', '2026-08-20', null, null, 'custom'
  )$$,
  '55000', 'beastmoney_payment_writes_temporarily_unavailable',
  'debt atomic command is blocked'
);
select throws_ok(
  $$select public.reverse_debt_payment_atomic(
    '74000000-0000-4000-8000-000000000004',
    current_setting('plat001c.gate_payment_id')::uuid,
    'Gate test reversal'
  )$$,
  '55000', 'beastmoney_payment_writes_temporarily_unavailable',
  'reversal command is blocked'
);
reset role;
select throws_ok(
  $$insert into public.bill_payments (
    user_id, bill_id, amount_paid, payment_date, cycle_month
  ) values (
    '71000000-0000-4000-8000-000000000002',
    '72000000-0000-4000-8000-000000000002',
    5, '2026-08-10', '2026-08'
  )$$,
  '55000', 'beastmoney_payment_writes_temporarily_unavailable',
  'direct bill payment insert is blocked'
);
select throws_ok(
  $$insert into public.debt_payments (
    user_id, debt_id, amount, payment_date, cycle_due_date
  ) values (
    '71000000-0000-4000-8000-000000000002',
    '73000000-0000-4000-8000-000000000002',
    5, '2026-08-10', '2026-08-20'
  )$$,
  '55000', 'beastmoney_payment_writes_temporarily_unavailable',
  'direct debt payment insert is blocked'
);
select lives_ok(
  $$select count(*) from public.bill_payments$$,
  'payment history reads remain available'
);
select lives_ok(
  $$update public.bill_events set name = 'Member gate bill updated'
    where id = '72000000-0000-4000-8000-000000000002'$$,
  'unrelated bill updates remain available'
);
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000002', true);
select throws_ok(
  $$select public.set_beastmoney_payment_write_restriction(false, false)$$,
  '42501', 'admin_required',
  'non-admin cannot control the restriction'
);
reset role;

select is(
  (select balance from public.debts where id = '73000000-0000-4000-8000-000000000002'),
  90::numeric,
  'blocked writes leave the applied debt balance unchanged'
);
select is(
  (select count(*)::bigint from public.bill_payments where user_id = '71000000-0000-4000-8000-000000000002'),
  0::bigint,
  'blocked bill writes leave no history rows'
);
select is(
  (select reversed_at is null from public.debt_payments where operation_id = '74000000-0000-4000-8000-000000000001'),
  true,
  'blocked reversal leaves history and principal applied'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select set_config('request.jwt.claim.sub', '71000000-0000-4000-8000-000000000001', true);
select lives_ok(
  $$select public.set_beastmoney_payment_write_restriction(true, true)$$,
  'admin activates a single current-admin acceptance exception'
);
select is(
  (public.get_beastmoney_payment_write_status() ->> 'acceptance_exception')::boolean,
  true,
  'acceptance admin receives the explicit exception status'
);
select lives_ok(
  $$select public.record_bill_payment_atomic(
    '74000000-0000-4000-8000-000000000005',
    '72000000-0000-4000-8000-000000000001',
    100, '2026-08-10', '2026-08'
  )$$,
  'acceptance admin can make a controlled payment'
);
select lives_ok(
  $$select public.set_beastmoney_payment_write_restriction(false, false)$$,
  'admin restores normal payment writes'
);
select is(
  (public.get_beastmoney_payment_write_status() ->> 'payments_available')::boolean,
  true,
  'writes are available after restriction is disabled'
);
reset role;

select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);

select throws_ok(
  $$select public.get_beastmoney_payment_write_status()$$,
  '42501', 'not_authenticated',
  'anonymous callers cannot inspect payment gate status'
);
select throws_ok(
  $$select public.set_beastmoney_payment_write_restriction(true, false)$$,
  '42501', 'not_authenticated',
  'anonymous callers cannot control the restriction'
);

select * from finish();
rollback;
