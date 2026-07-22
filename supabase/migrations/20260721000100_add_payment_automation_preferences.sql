alter table public.bill_events
  add column if not exists auto_pay_enabled boolean not null default false,
  add column if not exists reminder_enabled boolean not null default true;

alter table public.debts
  add column if not exists auto_pay_enabled boolean not null default false,
  add column if not exists reminder_enabled boolean not null default true;

comment on column public.bill_events.auto_pay_enabled is 'Informational only: provider is expected to draft the recurring payment. Does not execute or confirm payment.';
comment on column public.bill_events.reminder_enabled is 'Whether Beast should remind the owner before the bill is due.';
comment on column public.debts.auto_pay_enabled is 'Informational only: lender is expected to draft the recurring minimum. Does not cover extra or payoff-plan payments.';
comment on column public.debts.reminder_enabled is 'Whether Beast should remind the owner before the recurring debt payment is due.';
