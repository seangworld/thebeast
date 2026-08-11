-- Run only against the disposable local Supabase test database after migrations.
-- The enclosing transaction guarantees that fixtures and failure triggers never persist.
begin;

create extension if not exists pgtap;

select plan(36);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'plat001c-owner@example.invalid', '',
    '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'plat001c-other@example.invalid', '',
    '{}'::jsonb, '{}'::jsonb, now(), now()
  );

insert into public.bill_events (
  id, user_id, name, amount, due_date, frequency, next_due_date_after_payment
) values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Atomic bill', 100, 15, 'monthly', '2026-08-15'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'Other owner bill', 100, 15, 'monthly', '2026-08-15'
  );

insert into public.debts (
  id, user_id, name, balance, minimum_payment, interest_rate, due_date,
  payment_behavior, next_due_date_after_payment
) values
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Atomic debt', 100, 30, 10, 20, 'fixed', '2026-08-20'
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000002',
    'Other owner debt', 100, 30, 10, 20, 'fixed', '2026-08-20'
  );

create or replace function public.plat001c_failure_trigger()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if current_setting('plat001c.failpoint', true) = tg_argv[0] then
    raise exception 'plat001c:%', tg_argv[0];
  end if;
  return new;
end;
$$;

create trigger plat001c_bill_payment_insert
before insert on public.bill_payments
for each row execute function public.plat001c_failure_trigger('bill_payment_insert');

create trigger plat001c_bill_due_update
before update on public.bill_events
for each row execute function public.plat001c_failure_trigger('bill_due_update');

create trigger plat001c_debt_payment_insert
before insert on public.debt_payments
for each row execute function public.plat001c_failure_trigger('debt_payment_insert');

create trigger plat001c_debt_balance_update
before update on public.debts
for each row execute function public.plat001c_failure_trigger('debt_balance_update');

create trigger plat001c_debt_reversal_update
before update on public.debt_payments
for each row execute function public.plat001c_failure_trigger('debt_reversal_update');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

select lives_ok(
  $$select public.record_bill_payment_atomic(
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    100, '2026-08-10', '2026-08'
  )$$,
  'bill payment succeeds atomically'
);
select is(
  (select count(*)::bigint from public.bill_payments where operation_id = '40000000-0000-4000-8000-000000000001'),
  1::bigint,
  'bill payment creates one history row'
);
select is(
  (select next_due_date_after_payment from public.bill_events where id = '20000000-0000-4000-8000-000000000001'),
  '2026-09-15'::date,
  'bill payment advances due state'
);
select lives_ok(
  $$select public.record_bill_payment_atomic(
    '40000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    100, '2026-08-10', '2026-08'
  )$$,
  'same bill operation replays safely'
);
select is(
  (select count(*)::bigint from public.bill_payments where operation_id = '40000000-0000-4000-8000-000000000001'),
  1::bigint,
  'bill replay remains one logical payment'
);

select set_config('plat001c.failpoint', 'bill_payment_insert', true);
select throws_ok(
  $$select public.record_bill_payment_atomic(
    '40000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    10, '2026-09-10', '2026-09'
  )$$,
  'P0001', 'plat001c:bill_payment_insert',
  'bill history failure aborts the command'
);
select set_config('plat001c.failpoint', '', true);
select is(
  (select count(*)::bigint from public.bill_payments where operation_id = '40000000-0000-4000-8000-000000000002'),
  0::bigint,
  'failed bill history insert leaves no payment'
);
select is(
  (select next_due_date_after_payment from public.bill_events where id = '20000000-0000-4000-8000-000000000001'),
  '2026-09-15'::date,
  'failed bill history insert leaves due state unchanged'
);

select set_config('plat001c.failpoint', 'bill_due_update', true);
select throws_ok(
  $$select public.record_bill_payment_atomic(
    '40000000-0000-4000-8000-000000000003',
    '20000000-0000-4000-8000-000000000001',
    100, '2026-09-10', '2026-09'
  )$$,
  'P0001', 'plat001c:bill_due_update',
  'bill due-state failure aborts the command'
);
select set_config('plat001c.failpoint', '', true);
select is(
  (select count(*)::bigint from public.bill_payments where operation_id = '40000000-0000-4000-8000-000000000003'),
  0::bigint,
  'due-state failure rolls back the bill payment'
);
select is(
  (select next_due_date_after_payment from public.bill_events where id = '20000000-0000-4000-8000-000000000001'),
  '2026-09-15'::date,
  'due-state failure leaves the bill unchanged'
);

select lives_ok(
  $$select public.record_debt_payment_atomic(
    '50000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    30, '2026-08-10', '2026-08-20', null, null, 'minimum'
  )$$,
  'debt payment succeeds atomically'
);
select is(
  (select balance from public.debts where id = '30000000-0000-4000-8000-000000000001'),
  70::numeric,
  'debt balance changes once'
);
select is(
  (select count(*)::bigint from public.debt_payments where operation_id = '50000000-0000-4000-8000-000000000001'),
  1::bigint,
  'debt payment creates one history row'
);
select lives_ok(
  $$select public.record_debt_payment_atomic(
    '50000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    30, '2026-08-10', '2026-08-20', null, null, 'minimum'
  )$$,
  'same debt operation replays safely'
);
select is(
  (select balance from public.debts where id = '30000000-0000-4000-8000-000000000001'),
  70::numeric,
  'debt replay does not reduce the balance again'
);
select is(
  (select count(*)::bigint from public.debt_payments where operation_id = '50000000-0000-4000-8000-000000000001'),
  1::bigint,
  'debt replay remains one logical payment'
);

select set_config('plat001c.failpoint', 'debt_payment_insert', true);
select throws_ok(
  $$select public.record_debt_payment_atomic(
    '50000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    10, '2026-09-10', '2026-09-20', null, null, 'custom'
  )$$,
  'P0001', 'plat001c:debt_payment_insert',
  'debt history failure aborts the command'
);
select set_config('plat001c.failpoint', '', true);
select is(
  (select balance from public.debts where id = '30000000-0000-4000-8000-000000000001'),
  70::numeric,
  'debt history failure leaves balance unchanged'
);

select set_config('plat001c.failpoint', 'debt_balance_update', true);
select throws_ok(
  $$select public.record_debt_payment_atomic(
    '50000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000001',
    10, '2026-09-10', '2026-09-20', null, null, 'custom'
  )$$,
  'P0001', 'plat001c:debt_balance_update',
  'debt balance failure aborts the command'
);
select set_config('plat001c.failpoint', '', true);
select is(
  (select count(*)::bigint from public.debt_payments where operation_id = '50000000-0000-4000-8000-000000000003'),
  0::bigint,
  'debt balance failure rolls back payment history'
);
select is(
  (select balance from public.debts where id = '30000000-0000-4000-8000-000000000001'),
  70::numeric,
  'debt balance failure leaves the debt unchanged'
);

select set_config('plat001c.failpoint', 'debt_reversal_update', true);
select throws_ok(
  $$select public.reverse_debt_payment_atomic(
    '60000000-0000-4000-8000-000000000001',
    (select id from public.debt_payments where operation_id = '50000000-0000-4000-8000-000000000001'),
    'Injected reversal'
  )$$,
  'P0001', 'plat001c:debt_reversal_update',
  'reversal write failure aborts the command'
);
select set_config('plat001c.failpoint', '', true);
select ok(
  (select reversed_at is null from public.debt_payments where operation_id = '50000000-0000-4000-8000-000000000001'),
  'failed reversal leaves the payment applied'
);
select is(
  (select balance from public.debts where id = '30000000-0000-4000-8000-000000000001'),
  70::numeric,
  'failed reversal leaves the debt balance applied'
);
select set_config('plat001c.failpoint', 'debt_balance_update', true);
select throws_ok(
  $$select public.reverse_debt_payment_atomic(
    '60000000-0000-4000-8000-000000000002',
    (select id from public.debt_payments where operation_id = '50000000-0000-4000-8000-000000000001'),
    'Injected downstream reversal failure'
  )$$,
  'P0001', 'plat001c:debt_balance_update',
  'debt restore failure rolls back the reversal marker'
);
select set_config('plat001c.failpoint', '', true);
select ok(
  (select reversed_at is null from public.debt_payments where operation_id = '50000000-0000-4000-8000-000000000001'),
  'downstream reversal failure leaves the payment applied'
);
select is(
  (select balance from public.debts where id = '30000000-0000-4000-8000-000000000001'),
  70::numeric,
  'downstream reversal failure leaves principal unchanged'
);
select lives_ok(
  $$select public.reverse_debt_payment_atomic(
    '60000000-0000-4000-8000-000000000003',
    (select id from public.debt_payments where operation_id = '50000000-0000-4000-8000-000000000001'),
    'Injected reversal'
  )$$,
  'debt reversal succeeds atomically'
);
select ok(
  (select reversed_at is not null from public.debt_payments where operation_id = '50000000-0000-4000-8000-000000000001'),
  'successful reversal marks the payment'
);
select is(
  (select balance from public.debts where id = '30000000-0000-4000-8000-000000000001'),
  100::numeric,
  'successful reversal restores the balance'
);
select lives_ok(
  $$select public.reverse_debt_payment_atomic(
    '60000000-0000-4000-8000-000000000003',
    (select id from public.debt_payments where operation_id = '50000000-0000-4000-8000-000000000001'),
    'Injected reversal'
  )$$,
  'same reversal operation replays safely'
);
select is(
  (select balance from public.debts where id = '30000000-0000-4000-8000-000000000001'),
  100::numeric,
  'reversal replay restores principal once'
);

select throws_ok(
  $$select public.record_bill_payment_atomic(
    '40000000-0000-4000-8000-000000000004',
    '20000000-0000-4000-8000-000000000002',
    100, '2026-08-10', '2026-08'
  )$$,
  'P0002', 'bill_not_found',
  'bill command cannot access another owner'
);
select throws_ok(
  $$select public.record_debt_payment_atomic(
    '50000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000002',
    30, '2026-08-10', '2026-08-20', null, null, 'minimum'
  )$$,
  'P0002', 'debt_not_found',
  'debt command cannot access another owner'
);

insert into public.debt_payments (
  user_id, debt_id, amount, payment_date, cycle_due_date, action_type
) values (
  '10000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  1, '2026-07-10', '2026-07-20', 'paid_outside_beast'
);
select is(
  (select count(*)::bigint from public.debt_payments where operation_id is null),
  1::bigint,
  'historical payments remain valid without operation IDs'
);

select * from finish();
rollback;
