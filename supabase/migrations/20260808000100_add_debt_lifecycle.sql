-- BM-40/41: additive canonical debt lifecycle and immutable transition evidence.
-- This migration is not executed automatically.
alter table public.debts
  add column if not exists lifecycle_status text not null default 'active_balance',
  add column if not exists paid_off_at date null,
  add column if not exists closed_at date null,
  add column if not exists archived_at timestamptz null,
  add column if not exists lifecycle_auto_archived boolean not null default false,
  add column if not exists reminder_enabled_before_payoff boolean null;

alter table public.debts
  drop constraint if exists debts_lifecycle_status_check,
  add constraint debts_lifecycle_status_check check (
    lifecycle_status in ('active_balance', 'open_zero_balance', 'paid_off_closed', 'archived')
  );

-- Reconcile only states proven by current canonical fields. Historical payoff
-- dates remain null when the repository has no trustworthy event date.
update public.debts
set lifecycle_status = case
      when is_archived then 'archived'
      when balance > 0 then 'active_balance'
      when payment_behavior = 'revolving' then 'open_zero_balance'
      else 'paid_off_closed'
    end,
    is_archived = case
      when balance <= 0 and payment_behavior <> 'revolving' then true
      else is_archived
    end,
    lifecycle_auto_archived = case
      when balance <= 0 and payment_behavior <> 'revolving' and not is_archived then true
      else lifecycle_auto_archived
    end,
    reminder_enabled_before_payoff = case
      when balance <= 0 and payment_behavior <> 'revolving' and reminder_enabled_before_payoff is null
        then reminder_enabled
      else reminder_enabled_before_payoff
    end,
    reminder_enabled = case
      when balance <= 0 and payment_behavior <> 'revolving' then false
      else reminder_enabled
    end,
    next_due_date_after_payment = case when balance <= 0 then null else next_due_date_after_payment end,
    assigned_income_date = case when balance <= 0 then null else assigned_income_date end;

alter table public.debt_payments
  add column if not exists reversed_at timestamptz null,
  add column if not exists reversal_reason text null;

create table if not exists public.debt_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid not null references public.debts(id) on delete cascade,
  previous_status text null,
  next_status text not null,
  source text not null,
  balance numeric not null,
  reason text not null,
  payment_id uuid null references public.debt_payments(id) on delete set null,
  occurred_at timestamptz not null default now(),
  constraint debt_lifecycle_events_status_check check (
    next_status in ('active_balance', 'open_zero_balance', 'paid_off_closed', 'archived')
    and (previous_status is null or previous_status in ('active_balance', 'open_zero_balance', 'paid_off_closed', 'archived'))
  )
);

create index if not exists debt_lifecycle_events_owner_debt_time_idx
  on public.debt_lifecycle_events (user_id, debt_id, occurred_at desc);

alter table public.debt_lifecycle_events enable row level security;
drop policy if exists "Users read own debt lifecycle events" on public.debt_lifecycle_events;
create policy "Users read own debt lifecycle events"
  on public.debt_lifecycle_events for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own debt lifecycle events" on public.debt_lifecycle_events;
create policy "Users insert own debt lifecycle events"
  on public.debt_lifecycle_events for insert
  with check (auth.uid() = user_id);
