-- Run only against the disposable local Supabase test database after migrations.
-- The enclosing transaction guarantees that the fixture never persists.
begin;

create extension if not exists pgtap;
select plan(8);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '81000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'beastmoney-cycle@example.invalid', '',
  '{}'::jsonb, '{}'::jsonb, now(), now()
);

insert into public.debts (
  id, user_id, name, balance, minimum_payment, interest_rate, due_date,
  payment_behavior, next_due_date_after_payment
) values (
  '82000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  'Custom payment cycle fixture', 10413, 562, 20, 20,
  'revolving', '2026-11-20'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000001',
  true
);

select lives_ok(
  $$select public.record_debt_payment_atomic(
    '83000000-0000-4000-8000-000000000001',
    '82000000-0000-4000-8000-000000000001',
    200, '2026-11-07', '2026-11-20', null, null, 'custom'
  )$$,
  'a below-minimum custom payment succeeds'
);
reset role;

select is(
  (select balance from public.debts where id = '82000000-0000-4000-8000-000000000001'),
  10213::numeric,
  'partial custom payment reduces the debt balance'
);
select is(
  (select next_due_date_after_payment from public.debts where id = '82000000-0000-4000-8000-000000000001'),
  '2026-11-20'::date,
  'below-minimum custom payment leaves the due date unchanged'
);
select is(
  (
    select d.minimum_payment - coalesce(sum(p.amount), 0)
    from public.debts d
    left join public.debt_payments p
      on p.debt_id = d.id
      and p.cycle_due_date = d.next_due_date_after_payment
      and p.reversed_at is null
      and p.action_type <> 'skip'
    where d.id = '82000000-0000-4000-8000-000000000001'
    group by d.minimum_payment
  ),
  362::numeric,
  'remaining minimum reflects the partial payment'
);

set local role authenticated;
select lives_ok(
  $$select public.record_debt_payment_atomic(
    '83000000-0000-4000-8000-000000000002',
    '82000000-0000-4000-8000-000000000001',
    362, '2026-11-07', '2026-11-20', null, null, 'custom'
  )$$,
  'a custom payment that completes the minimum succeeds'
);
reset role;

select is(
  (select balance from public.debts where id = '82000000-0000-4000-8000-000000000001'),
  9851::numeric,
  'the payment that completes the minimum reduces the balance'
);
select is(
  (select next_due_date_after_payment from public.debts where id = '82000000-0000-4000-8000-000000000001'),
  '2026-12-20'::date,
  'meeting the due-cycle minimum advances the due date'
);
select is(
  (select count(*)::bigint from public.debt_payments where debt_id = '82000000-0000-4000-8000-000000000001'),
  2::bigint,
  'both custom payments appear in debt history'
);

select * from finish();
rollback;
