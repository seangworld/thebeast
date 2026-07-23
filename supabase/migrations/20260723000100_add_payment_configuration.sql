-- BM-309: additive payment configuration model.
-- Legacy funding_source_id columns remain available for rollback and audit history.

alter table public.bill_events
  add column if not exists payment_account_id uuid null,
  add column if not exists funding_account_type text null,
  add column if not exists funding_account_id text null,
  add column if not exists funding_strategy_id text not null default 'direct_payment';

alter table public.debts
  add column if not exists payment_account_id uuid null,
  add column if not exists funding_account_type text null,
  add column if not exists funding_account_id text null,
  add column if not exists funding_strategy_id text not null default 'direct_payment';

alter table public.bill_payments
  add column if not exists payment_account_id uuid null,
  add column if not exists funding_account_type text null,
  add column if not exists funding_account_id text null,
  add column if not exists funding_strategy_id text not null default 'direct_payment';

alter table public.debt_payments
  add column if not exists payment_account_id uuid null,
  add column if not exists funding_account_type text null,
  add column if not exists funding_account_id text null,
  add column if not exists funding_strategy_id text not null default 'direct_payment';

do $$
declare
  table_name text;
begin
  foreach table_name in array array['bill_events', 'debts', 'bill_payments', 'debt_payments']
  loop
    execute format(
      'alter table public.%I drop constraint if exists %I',
      table_name,
      table_name || '_funding_account_type_check'
    );
    execute format(
      'alter table public.%I add constraint %I check (funding_account_type is null or funding_account_type in (''account'', ''income_pot''))',
      table_name,
      table_name || '_funding_account_type_check'
    );
  end loop;
end $$;

update public.bill_events
set
  payment_account_id = coalesce(payment_account_id, funding_source_id),
  funding_account_type = coalesce(funding_account_type, 'account'),
  funding_account_id = coalesce(funding_account_id, funding_source_id::text),
  funding_strategy_id = coalesce(funding_strategy_id, 'direct_payment')
where funding_source_id is not null;

update public.debts
set
  payment_account_id = coalesce(payment_account_id, funding_source_id),
  funding_account_type = coalesce(funding_account_type, 'account'),
  funding_account_id = coalesce(funding_account_id, funding_source_id::text),
  funding_strategy_id = coalesce(funding_strategy_id, 'direct_payment')
where funding_source_id is not null;

update public.bill_payments
set
  payment_account_id = coalesce(payment_account_id, funding_source_id),
  funding_account_type = coalesce(funding_account_type, 'account'),
  funding_account_id = coalesce(funding_account_id, funding_source_id::text),
  funding_strategy_id = coalesce(funding_strategy_id, 'direct_payment')
where funding_source_id is not null;

update public.debt_payments
set
  payment_account_id = coalesce(payment_account_id, funding_source_id),
  funding_account_type = coalesce(funding_account_type, 'account'),
  funding_account_id = coalesce(funding_account_id, funding_source_id::text),
  funding_strategy_id = coalesce(funding_strategy_id, 'direct_payment')
where funding_source_id is not null;

create index if not exists bill_events_payment_account_idx
  on public.bill_events (payment_account_id);
create index if not exists debts_payment_account_idx
  on public.debts (payment_account_id);

comment on column public.bill_events.payment_account_id is
  'Account from which the bill payment is drafted.';
comment on column public.bill_events.funding_account_id is
  'Account or income-pot identifier from which payment funds originated.';
comment on column public.bill_events.funding_strategy_id is
  'Configuration-driven strategy describing how funds reach the payment account.';
