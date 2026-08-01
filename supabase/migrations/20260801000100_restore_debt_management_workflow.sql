-- BM-36A/B: additive audit metadata for the restored debt workflow.
-- This migration file is not executed automatically.
alter table public.debts
  add column if not exists statement_balance numeric null;

alter table public.debt_payments
  add column if not exists action_type text not null default 'custom',
  add column if not exists notes text null,
  add column if not exists is_outside_beast boolean not null default false;

alter table public.debt_payments
  drop constraint if exists debt_payments_action_type_check,
  add constraint debt_payments_action_type_check check (
    action_type in ('minimum', 'full_balance', 'custom', 'statement_balance', 'skip', 'paid_outside_beast')
  );

comment on column public.debts.statement_balance is 'Optional latest statement balance for revolving credit debt.';
comment on column public.debt_payments.action_type is 'Member-selected debt workflow action; no external payment execution is implied.';
comment on column public.debt_payments.is_outside_beast is 'True when the member records a payment completed outside Beast.';
