-- PLAT-001C: additive atomic bill/debt payment and debt reversal commands.
-- Apply the migration before deploying callers. No historical rows are rewritten.

alter table public.bill_payments
  add column if not exists payment_date date null,
  add column if not exists operation_id uuid null,
  add column if not exists request_fingerprint text null,
  add column if not exists requested_amount numeric null,
  add column if not exists resulting_next_due_date date null;

alter table public.debt_payments
  add column if not exists operation_id uuid null,
  add column if not exists request_fingerprint text null,
  add column if not exists requested_amount numeric null,
  add column if not exists balance_after numeric null,
  add column if not exists resulting_next_due_date date null,
  add column if not exists lifecycle_status_after text null,
  add column if not exists debt_state_before jsonb null,
  add column if not exists debt_state_after jsonb null,
  add column if not exists reversal_operation_id uuid null,
  add column if not exists reversal_request_fingerprint text null,
  add column if not exists balance_after_reversal numeric null,
  add column if not exists resulting_due_date_after_reversal date null,
  add column if not exists lifecycle_status_after_reversal text null;

create unique index if not exists bill_payments_owner_operation_uidx
  on public.bill_payments (user_id, operation_id)
  where operation_id is not null;

create unique index if not exists debt_payments_owner_operation_uidx
  on public.debt_payments (user_id, operation_id)
  where operation_id is not null;

create unique index if not exists debt_payments_owner_reversal_operation_uidx
  on public.debt_payments (user_id, reversal_operation_id)
  where reversal_operation_id is not null;

create index if not exists bill_payments_owner_bill_cycle_idx
  on public.bill_payments (user_id, bill_id, cycle_month);

create index if not exists debt_payments_owner_debt_cycle_active_idx
  on public.debt_payments (user_id, debt_id, cycle_due_date)
  where reversed_at is null;

comment on column public.bill_payments.operation_id is
  'Opaque client-generated identifier that makes an atomic bill-payment command idempotent.';
comment on column public.debt_payments.operation_id is
  'Opaque client-generated identifier that makes an atomic debt-payment command idempotent.';
comment on column public.debt_payments.reversal_operation_id is
  'Opaque client-generated identifier that makes an atomic debt-payment reversal idempotent.';

create or replace function public.beast_add_months_clamped(
  p_date date,
  p_months integer
)
returns date
language plpgsql
immutable
strict
set search_path = pg_catalog, public
as $$
declare
  v_target_month date;
  v_target_day integer;
begin
  v_target_month := (
    pg_catalog.date_trunc('month', p_date)::date
    + pg_catalog.make_interval(months => p_months)
  )::date;
  v_target_day := least(
    extract(day from p_date)::integer,
    extract(
      day from (
        v_target_month + interval '1 month' - interval '1 day'
      )
    )::integer
  );
  return v_target_month + (v_target_day - 1);
end;
$$;

revoke all on function public.beast_add_months_clamped(date, integer)
  from public, anon, authenticated;

create or replace function public.record_bill_payment_atomic(
  p_operation_id uuid,
  p_bill_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_cycle_month text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_bill public.bill_events%rowtype;
  v_existing public.bill_payments%rowtype;
  v_payment_id uuid;
  v_fingerprint text;
  v_paid numeric;
  v_remaining numeric;
  v_recorded numeric;
  v_cycle_start date;
  v_due_day integer;
  v_current_due date;
  v_next_due date;
  v_frequency text;
  v_month_step integer;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if p_operation_id is null or p_bill_id is null then
    raise exception using errcode = '22023', message = 'invalid_bill_payment_command';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception using errcode = '22023', message = 'invalid_payment_amount';
  end if;
  if p_payment_date is null
    or p_cycle_month is null
    or p_cycle_month !~ '^[0-9]{4}-[0-9]{2}$' then
    raise exception using errcode = '22023', message = 'invalid_payment_date_or_cycle';
  end if;

  -- Lock order: operation target first. Every bill-payment command uses this lock.
  select *
  into v_bill
  from public.bill_events
  where id = p_bill_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'bill_not_found';
  end if;

  v_fingerprint := pg_catalog.md5(
    pg_catalog.jsonb_build_object(
      'bill_id', p_bill_id,
      'amount', p_amount,
      'payment_date', p_payment_date,
      'cycle_month', p_cycle_month
    )::text
  );

  select *
  into v_existing
  from public.bill_payments
  where user_id = v_user_id
    and operation_id = p_operation_id;

  if found then
    if v_existing.bill_id <> p_bill_id
      or v_existing.request_fingerprint is distinct from v_fingerprint then
      raise exception using errcode = '23505', message = 'financial_operation_conflict';
    end if;

    return pg_catalog.jsonb_build_object(
      'status', 'succeeded',
      'operation_id', p_operation_id,
      'payment_id', v_existing.id,
      'recorded_amount', v_existing.amount_paid,
      'next_due_date', v_existing.resulting_next_due_date,
      'replayed', true
    );
  end if;

  begin
    v_cycle_start := pg_catalog.to_date(p_cycle_month || '-01', 'YYYY-MM-DD');
  exception when others then
    raise exception using errcode = '22023', message = 'invalid_payment_cycle';
  end;

  if pg_catalog.to_char(v_cycle_start, 'YYYY-MM') <> p_cycle_month then
    raise exception using errcode = '22023', message = 'invalid_payment_cycle';
  end if;

  select coalesce(pg_catalog.sum(amount_paid), 0)
  into v_paid
  from public.bill_payments
  where user_id = v_user_id
    and bill_id = p_bill_id
    and cycle_month = p_cycle_month;

  v_remaining := greatest(v_bill.amount - v_paid, 0);
  if v_remaining <= 0 then
    raise exception using errcode = '22023', message = 'bill_cycle_already_paid';
  end if;

  v_recorded := least(p_amount, v_remaining);
  v_due_day := least(
    greatest(coalesce(v_bill.due_date, 1), 1),
    extract(
      day from (
        v_cycle_start + interval '1 month' - interval '1 day'
      )
    )::integer
  );
  v_current_due := coalesce(
    v_bill.next_due_date_after_payment,
    v_cycle_start + (v_due_day - 1)
  );
  v_frequency := coalesce(v_bill.frequency, 'monthly');

  if v_recorded >= v_remaining then
    if v_frequency = 'weekly' then
      v_next_due := v_current_due + 7;
    elsif v_frequency = 'biweekly' then
      v_next_due := v_current_due + 14;
    else
      v_month_step := case v_frequency
        when 'every_2_months' then 2
        when 'every_3_months' then 3
        when 'every_6_months' then 6
        when 'yearly' then 12
        else 1
      end;
      v_next_due := public.beast_add_months_clamped(v_current_due, v_month_step);
    end if;
  end if;

  insert into public.bill_payments (
    user_id,
    bill_id,
    amount_paid,
    payment_date,
    cycle_month,
    payment_account_id,
    funding_account_type,
    funding_account_id,
    funding_strategy_id,
    funding_source_id,
    operation_id,
    request_fingerprint,
    requested_amount,
    resulting_next_due_date
  ) values (
    v_user_id,
    p_bill_id,
    v_recorded,
    p_payment_date,
    p_cycle_month,
    coalesce(v_bill.payment_account_id, v_bill.funding_source_id),
    coalesce(
      v_bill.funding_account_type,
      case when v_bill.funding_source_id is not null then 'account' else null end
    ),
    coalesce(v_bill.funding_account_id, v_bill.funding_source_id::text),
    coalesce(v_bill.funding_strategy_id, 'direct_payment'),
    v_bill.funding_source_id,
    p_operation_id,
    v_fingerprint,
    p_amount,
    v_next_due
  )
  returning id into v_payment_id;

  if v_next_due is not null then
    update public.bill_events
    set next_due_date_after_payment = v_next_due,
        assigned_income_date = null
    where id = p_bill_id
      and user_id = v_user_id;
  end if;

  return pg_catalog.jsonb_build_object(
    'status', 'succeeded',
    'operation_id', p_operation_id,
    'payment_id', v_payment_id,
    'recorded_amount', v_recorded,
    'next_due_date', v_next_due,
    'replayed', false
  );
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'financial_operation_conflict';
end;
$$;

revoke all on function public.record_bill_payment_atomic(uuid, uuid, numeric, date, text)
  from public, anon;
grant execute on function public.record_bill_payment_atomic(uuid, uuid, numeric, date, text)
  to authenticated;

create or replace function public.record_debt_payment_atomic(
  p_operation_id uuid,
  p_debt_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_cycle_due_date date,
  p_funding_source_id uuid default null,
  p_notes text default null,
  p_action_type text default 'custom'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_debt public.debts%rowtype;
  v_existing public.debt_payments%rowtype;
  v_payment_id uuid;
  v_fingerprint text;
  v_cycle_due date;
  v_current_cycle_paid numeric;
  v_recorded numeric;
  v_new_balance numeric;
  v_next_due date;
  v_result_due date;
  v_previous_status text;
  v_next_status text;
  v_reason text;
  v_source text;
  v_changed boolean;
  v_is_archived boolean;
  v_paid_off_at date;
  v_closed_at date;
  v_archived_at timestamptz;
  v_lifecycle_auto_archived boolean;
  v_reminder_enabled boolean;
  v_reminder_enabled_before_payoff boolean;
  v_assigned_income_date date;
  v_payment_account_id uuid;
  v_funding_account_type text;
  v_funding_account_id text;
  v_funding_strategy_id text;
  v_debt_state_before jsonb;
  v_debt_state_after jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if p_operation_id is null or p_debt_id is null then
    raise exception using errcode = '22023', message = 'invalid_debt_payment_command';
  end if;
  if p_payment_date is null or p_cycle_due_date is null then
    raise exception using errcode = '22023', message = 'invalid_payment_date_or_cycle';
  end if;
  if p_action_type is null or p_action_type not in (
    'minimum',
    'full_balance',
    'custom',
    'statement_balance',
    'skip',
    'paid_outside_beast'
  ) then
    raise exception using errcode = '22023', message = 'invalid_debt_payment_action';
  end if;
  if p_action_type <> 'skip' and (p_amount is null or p_amount <= 0) then
    raise exception using errcode = '22023', message = 'invalid_payment_amount';
  end if;

  -- Lock order: debt row first for every debt payment. Reversals lock their
  -- payment row first, then this same debt row, and never request another lock.
  select *
  into v_debt
  from public.debts
  where id = p_debt_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'debt_not_found';
  end if;

  v_debt_state_before := pg_catalog.jsonb_build_object(
    'balance', v_debt.balance,
    'next_due_date_after_payment', v_debt.next_due_date_after_payment,
    'assigned_income_date', v_debt.assigned_income_date,
    'lifecycle_status', v_debt.lifecycle_status,
    'is_archived', v_debt.is_archived,
    'paid_off_at', v_debt.paid_off_at,
    'closed_at', v_debt.closed_at,
    'archived_at', v_debt.archived_at,
    'lifecycle_auto_archived', v_debt.lifecycle_auto_archived,
    'reminder_enabled', v_debt.reminder_enabled,
    'reminder_enabled_before_payoff', v_debt.reminder_enabled_before_payoff
  );

  v_fingerprint := pg_catalog.md5(
    pg_catalog.jsonb_build_object(
      'debt_id', p_debt_id,
      'amount', p_amount,
      'payment_date', p_payment_date,
      'cycle_due_date', p_cycle_due_date,
      'funding_source_id', p_funding_source_id,
      'notes', p_notes,
      'action_type', p_action_type
    )::text
  );

  select *
  into v_existing
  from public.debt_payments
  where user_id = v_user_id
    and operation_id = p_operation_id;

  if found then
    if v_existing.debt_id <> p_debt_id
      or v_existing.request_fingerprint is distinct from v_fingerprint then
      raise exception using errcode = '23505', message = 'financial_operation_conflict';
    end if;

    return pg_catalog.jsonb_build_object(
      'status', 'succeeded',
      'operation_id', p_operation_id,
      'payment_id', v_existing.id,
      'recorded_amount', v_existing.amount,
      'balance_after', v_existing.balance_after,
      'next_due_date', v_existing.resulting_next_due_date,
      'lifecycle_status', v_existing.lifecycle_status_after,
      'replayed', true
    );
  end if;

  if p_funding_source_id is not null and not exists (
    select 1
    from public.funding_sources
    where id = p_funding_source_id
      and user_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'funding_source_not_owned';
  end if;

  v_cycle_due := coalesce(
    v_debt.next_due_date_after_payment,
    p_cycle_due_date
  );

  select coalesce(pg_catalog.sum(amount), 0)
  into v_current_cycle_paid
  from public.debt_payments
  where user_id = v_user_id
    and debt_id = p_debt_id
    and cycle_due_date = v_cycle_due
    and reversed_at is null
    and action_type <> 'skip';

  if p_action_type = 'skip' then
    v_recorded := 0;
    v_new_balance := greatest(v_debt.balance, 0);
    v_next_due := public.beast_add_months_clamped(v_cycle_due, 1);
  else
    if v_debt.balance <= 0 then
      raise exception using errcode = '22023', message = 'debt_has_no_payable_balance';
    end if;
    v_recorded := least(p_amount, v_debt.balance);
    v_new_balance := greatest(v_debt.balance - v_recorded, 0);
    if v_new_balance = 0
      or v_current_cycle_paid + v_recorded >= coalesce(v_debt.minimum_payment, 0) then
      v_next_due := public.beast_add_months_clamped(v_cycle_due, 1);
    end if;
  end if;

  v_previous_status := coalesce(
    v_debt.lifecycle_status,
    case when v_debt.is_archived then 'archived' else 'active_balance' end
  );
  v_source := case
    when p_action_type = 'paid_outside_beast' then 'outside_payment'
    else 'beast_payment'
  end;
  v_is_archived := coalesce(v_debt.is_archived, false);
  v_paid_off_at := v_debt.paid_off_at;
  v_closed_at := v_debt.closed_at;
  v_archived_at := v_debt.archived_at;
  v_lifecycle_auto_archived := coalesce(
    v_debt.lifecycle_auto_archived,
    false
  );
  v_reminder_enabled := coalesce(v_debt.reminder_enabled, true);
  v_reminder_enabled_before_payoff := v_debt.reminder_enabled_before_payoff;
  v_assigned_income_date := v_debt.assigned_income_date;

  if v_new_balance > 0 then
    v_next_status := 'active_balance';
    v_changed := v_previous_status <> 'active_balance' or v_is_archived;
    v_reason := 'Canonical balance is above zero.';
    if v_previous_status in ('paid_off_closed', 'open_zero_balance')
      or v_lifecycle_auto_archived then
      v_is_archived := false;
      v_archived_at := null;
    end if;
    v_paid_off_at := null;
    v_closed_at := null;
    v_lifecycle_auto_archived := false;
    v_reminder_enabled := coalesce(
      v_reminder_enabled_before_payoff,
      v_reminder_enabled,
      true
    );
    v_reminder_enabled_before_payoff := null;
    v_result_due := coalesce(
      v_next_due,
      v_debt.next_due_date_after_payment
    );
    if v_next_due is not null then
      v_assigned_income_date := null;
    end if;
  elsif v_debt.payment_behavior = 'revolving' then
    v_next_status := 'open_zero_balance';
    v_changed := v_previous_status <> 'open_zero_balance' or v_is_archived;
    v_reason := 'The revolving account is open with a zero balance.';
    v_is_archived := false;
    v_paid_off_at := p_payment_date;
    v_closed_at := null;
    v_archived_at := null;
    v_lifecycle_auto_archived := false;
    v_result_due := null;
    v_assigned_income_date := null;
  else
    v_next_status := 'paid_off_closed';
    v_changed := v_previous_status <> 'paid_off_closed' or not v_is_archived;
    v_reason := 'The fixed debt reached a confirmed zero balance.';
    v_is_archived := true;
    v_paid_off_at := p_payment_date;
    v_closed_at := p_payment_date;
    v_archived_at := p_payment_date::timestamptz;
    v_lifecycle_auto_archived := true;
    v_reminder_enabled_before_payoff := coalesce(
      v_debt.reminder_enabled,
      true
    );
    v_reminder_enabled := false;
    v_result_due := null;
    v_assigned_income_date := null;
  end if;

  v_debt_state_after := pg_catalog.jsonb_build_object(
    'balance', v_new_balance,
    'next_due_date_after_payment', v_result_due,
    'assigned_income_date', v_assigned_income_date,
    'lifecycle_status', v_next_status,
    'is_archived', v_is_archived,
    'paid_off_at', v_paid_off_at,
    'closed_at', v_closed_at,
    'archived_at', v_archived_at,
    'lifecycle_auto_archived', v_lifecycle_auto_archived,
    'reminder_enabled', v_reminder_enabled,
    'reminder_enabled_before_payoff', v_reminder_enabled_before_payoff
  );

  if p_funding_source_id is not null then
    v_payment_account_id := p_funding_source_id;
    v_funding_account_type := 'account';
    v_funding_account_id := p_funding_source_id::text;
    v_funding_strategy_id := 'direct_payment';
  else
    v_payment_account_id := coalesce(
      v_debt.payment_account_id,
      v_debt.funding_source_id
    );
    v_funding_account_type := coalesce(
      v_debt.funding_account_type,
      case when v_debt.funding_source_id is not null then 'account' else null end
    );
    v_funding_account_id := coalesce(
      v_debt.funding_account_id,
      v_debt.funding_source_id::text
    );
    v_funding_strategy_id := coalesce(
      v_debt.funding_strategy_id,
      'direct_payment'
    );
  end if;

  insert into public.debt_payments (
    user_id,
    debt_id,
    amount,
    payment_date,
    cycle_due_date,
    funding_source_id,
    payment_account_id,
    funding_account_type,
    funding_account_id,
    funding_strategy_id,
    action_type,
    notes,
    is_outside_beast,
    operation_id,
    request_fingerprint,
    requested_amount,
    balance_after,
    resulting_next_due_date,
    lifecycle_status_after,
    debt_state_before,
    debt_state_after
  ) values (
    v_user_id,
    p_debt_id,
    v_recorded,
    p_payment_date,
    v_cycle_due,
    coalesce(p_funding_source_id, v_debt.funding_source_id),
    v_payment_account_id,
    v_funding_account_type,
    v_funding_account_id,
    v_funding_strategy_id,
    p_action_type,
    p_notes,
    p_action_type = 'paid_outside_beast',
    p_operation_id,
    v_fingerprint,
    p_amount,
    v_new_balance,
    v_result_due,
    v_next_status,
    v_debt_state_before,
    v_debt_state_after
  )
  returning id into v_payment_id;

  update public.debts
  set balance = v_new_balance,
      next_due_date_after_payment = v_result_due,
      assigned_income_date = v_assigned_income_date,
      lifecycle_status = v_next_status,
      is_archived = v_is_archived,
      paid_off_at = v_paid_off_at,
      closed_at = v_closed_at,
      archived_at = v_archived_at,
      lifecycle_auto_archived = v_lifecycle_auto_archived,
      reminder_enabled = v_reminder_enabled,
      reminder_enabled_before_payoff = v_reminder_enabled_before_payoff
  where id = p_debt_id
    and user_id = v_user_id;

  if v_changed then
    insert into public.debt_lifecycle_events (
      user_id,
      debt_id,
      previous_status,
      next_status,
      source,
      balance,
      reason,
      payment_id
    ) values (
      v_user_id,
      p_debt_id,
      v_previous_status,
      v_next_status,
      v_source,
      v_new_balance,
      v_reason,
      v_payment_id
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'status', 'succeeded',
    'operation_id', p_operation_id,
    'payment_id', v_payment_id,
    'recorded_amount', v_recorded,
    'balance_after', v_new_balance,
    'next_due_date', v_result_due,
    'lifecycle_status', v_next_status,
    'replayed', false
  );
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'financial_operation_conflict';
end;
$$;

revoke all on function public.record_debt_payment_atomic(
  uuid, uuid, numeric, date, date, uuid, text, text
) from public, anon;
grant execute on function public.record_debt_payment_atomic(
  uuid, uuid, numeric, date, date, uuid, text, text
) to authenticated;

create or replace function public.reverse_debt_payment_atomic(
  p_operation_id uuid,
  p_payment_id uuid,
  p_reason text default 'Member reversed the recorded payment.'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_payment public.debt_payments%rowtype;
  v_debt public.debts%rowtype;
  v_fingerprint text;
  v_restored_balance numeric;
  v_previous_status text;
  v_next_status text;
  v_reason text;
  v_changed boolean;
  v_is_archived boolean;
  v_paid_off_at date;
  v_closed_at date;
  v_archived_at timestamptz;
  v_lifecycle_auto_archived boolean;
  v_reminder_enabled boolean;
  v_reminder_enabled_before_payoff boolean;
  v_result_due date;
  v_assigned_income_date date;
  v_current_debt_state jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'authentication_required';
  end if;
  if p_operation_id is null or p_payment_id is null then
    raise exception using errcode = '22023', message = 'invalid_reversal_command';
  end if;

  -- Reversal lock order is payment row, then its authoritative debt row.
  select *
  into v_payment
  from public.debt_payments
  where id = p_payment_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'payment_not_found';
  end if;

  v_fingerprint := pg_catalog.md5(
    pg_catalog.jsonb_build_object(
      'payment_id', p_payment_id,
      'reason', p_reason
    )::text
  );

  if v_payment.reversal_operation_id = p_operation_id then
    if v_payment.reversal_request_fingerprint is distinct from v_fingerprint then
      raise exception using errcode = '23505', message = 'financial_operation_conflict';
    end if;

    return pg_catalog.jsonb_build_object(
      'status', 'succeeded',
      'operation_id', p_operation_id,
      'payment_id', p_payment_id,
      'recorded_amount', v_payment.amount,
      'balance_after', v_payment.balance_after_reversal,
      'next_due_date', v_payment.resulting_due_date_after_reversal,
      'lifecycle_status', v_payment.lifecycle_status_after_reversal,
      'replayed', true
    );
  end if;

  if v_payment.reversed_at is not null then
    raise exception using errcode = '22023', message = 'payment_already_reversed';
  end if;

  select *
  into v_debt
  from public.debts
  where id = v_payment.debt_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'debt_not_found';
  end if;

  -- The accepted lifecycle is "undo last payment". Reversing an older payment
  -- after a later active payment would make due-state reconstruction ambiguous.
  if p_payment_id is distinct from (
    select latest.id
    from public.debt_payments latest
    where latest.user_id = v_user_id
      and latest.debt_id = v_payment.debt_id
      and latest.reversed_at is null
    order by latest.created_at desc, latest.id desc
    limit 1
  ) then
    raise exception using errcode = '22023', message = 'only_latest_payment_can_be_reversed';
  end if;

  v_previous_status := coalesce(
    v_debt.lifecycle_status,
    case when v_debt.is_archived then 'archived' else 'active_balance' end
  );

  if v_payment.debt_state_before is not null
    and v_payment.debt_state_after is not null then
    v_current_debt_state := pg_catalog.jsonb_build_object(
      'balance', v_debt.balance,
      'next_due_date_after_payment', v_debt.next_due_date_after_payment,
      'assigned_income_date', v_debt.assigned_income_date,
      'lifecycle_status', v_debt.lifecycle_status,
      'is_archived', v_debt.is_archived,
      'paid_off_at', v_debt.paid_off_at,
      'closed_at', v_debt.closed_at,
      'archived_at', v_debt.archived_at,
      'lifecycle_auto_archived', v_debt.lifecycle_auto_archived,
      'reminder_enabled', v_debt.reminder_enabled,
      'reminder_enabled_before_payoff', v_debt.reminder_enabled_before_payoff
    );

    if v_current_debt_state is distinct from v_payment.debt_state_after then
      raise exception using errcode = '40001', message = 'debt_changed_since_payment';
    end if;

    v_restored_balance := (v_payment.debt_state_before ->> 'balance')::numeric;
    v_result_due := (v_payment.debt_state_before ->> 'next_due_date_after_payment')::date;
    v_assigned_income_date := (v_payment.debt_state_before ->> 'assigned_income_date')::date;
    v_next_status := v_payment.debt_state_before ->> 'lifecycle_status';
    v_is_archived := (v_payment.debt_state_before ->> 'is_archived')::boolean;
    v_paid_off_at := (v_payment.debt_state_before ->> 'paid_off_at')::date;
    v_closed_at := (v_payment.debt_state_before ->> 'closed_at')::date;
    v_archived_at := (v_payment.debt_state_before ->> 'archived_at')::timestamptz;
    v_lifecycle_auto_archived := (
      v_payment.debt_state_before ->> 'lifecycle_auto_archived'
    )::boolean;
    v_reminder_enabled := (
      v_payment.debt_state_before ->> 'reminder_enabled'
    )::boolean;
    v_reminder_enabled_before_payoff := (
      v_payment.debt_state_before ->> 'reminder_enabled_before_payoff'
    )::boolean;
    v_changed := v_previous_status is distinct from v_next_status
      or v_debt.is_archived is distinct from v_is_archived;
    v_reason := 'The reversal restored the exact pre-payment debt state.';
  else
    -- Historical rows have no state snapshots. Preserve the prior additive
    -- reversal behavior without rewriting history.
    v_restored_balance := greatest(v_debt.balance + v_payment.amount, 0);
    v_is_archived := coalesce(v_debt.is_archived, false);
    v_paid_off_at := v_debt.paid_off_at;
    v_closed_at := v_debt.closed_at;
    v_archived_at := v_debt.archived_at;
    v_lifecycle_auto_archived := coalesce(
      v_debt.lifecycle_auto_archived,
      false
    );
    v_reminder_enabled := coalesce(v_debt.reminder_enabled, true);
    v_reminder_enabled_before_payoff := v_debt.reminder_enabled_before_payoff;
    v_assigned_income_date := null;

    if v_restored_balance > 0 then
      v_next_status := 'active_balance';
      v_changed := v_previous_status <> 'active_balance' or v_is_archived;
      v_reason := 'A reversed historical payment restored an outstanding balance.';
      v_is_archived := false;
      v_paid_off_at := null;
      v_closed_at := null;
      v_archived_at := null;
      v_lifecycle_auto_archived := false;
      v_reminder_enabled := coalesce(
        v_reminder_enabled_before_payoff,
        v_reminder_enabled,
        true
      );
      v_reminder_enabled_before_payoff := null;
      v_result_due := v_payment.cycle_due_date;
    elsif v_debt.payment_behavior = 'revolving' then
      v_next_status := 'open_zero_balance';
      v_changed := v_previous_status <> 'open_zero_balance' or v_is_archived;
      v_reason := 'The revolving account remains open with a zero balance.';
      v_is_archived := false;
      v_paid_off_at := v_payment.payment_date;
      v_closed_at := null;
      v_archived_at := null;
      v_lifecycle_auto_archived := false;
      v_result_due := null;
    else
      v_next_status := 'paid_off_closed';
      v_changed := v_previous_status <> 'paid_off_closed' or not v_is_archived;
      v_reason := 'The fixed debt remains at a confirmed zero balance.';
      v_is_archived := true;
      v_result_due := null;
    end if;
  end if;

  update public.debt_payments
  set reversed_at = pg_catalog.now(),
      reversal_reason = pg_catalog.left(
        coalesce(p_reason, 'Member reversed the recorded payment.'),
        500
      ),
      reversal_operation_id = p_operation_id,
      reversal_request_fingerprint = v_fingerprint,
      balance_after_reversal = v_restored_balance,
      resulting_due_date_after_reversal = v_result_due,
      lifecycle_status_after_reversal = v_next_status
  where id = p_payment_id
    and user_id = v_user_id;

  update public.debts
  set balance = v_restored_balance,
      next_due_date_after_payment = v_result_due,
      assigned_income_date = v_assigned_income_date,
      lifecycle_status = v_next_status,
      is_archived = v_is_archived,
      paid_off_at = v_paid_off_at,
      closed_at = v_closed_at,
      archived_at = v_archived_at,
      lifecycle_auto_archived = v_lifecycle_auto_archived,
      reminder_enabled = v_reminder_enabled,
      reminder_enabled_before_payoff = v_reminder_enabled_before_payoff
  where id = v_payment.debt_id
    and user_id = v_user_id;

  if v_changed then
    insert into public.debt_lifecycle_events (
      user_id,
      debt_id,
      previous_status,
      next_status,
      source,
      balance,
      reason,
      payment_id
    ) values (
      v_user_id,
      v_payment.debt_id,
      v_previous_status,
      v_next_status,
      'payment_reversal',
      v_restored_balance,
      v_reason,
      p_payment_id
    );
  end if;

  return pg_catalog.jsonb_build_object(
    'status', 'succeeded',
    'operation_id', p_operation_id,
    'payment_id', p_payment_id,
    'recorded_amount', v_payment.amount,
    'balance_after', v_restored_balance,
    'next_due_date', v_result_due,
    'lifecycle_status', v_next_status,
    'replayed', false
  );
exception
  when unique_violation then
    raise exception using errcode = '23505', message = 'financial_operation_conflict';
end;
$$;

revoke all on function public.reverse_debt_payment_atomic(uuid, uuid, text)
  from public, anon;
grant execute on function public.reverse_debt_payment_atomic(uuid, uuid, text)
  to authenticated;
