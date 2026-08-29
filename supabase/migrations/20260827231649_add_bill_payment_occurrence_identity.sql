-- BM-43: identify bill payments by the canonical due occurrence instead of
-- treating an entire calendar month as one bill cycle.

alter table public.bill_payments
  add column if not exists cycle_due_date date null;

-- Historical atomic weekly/biweekly rows already record the next occurrence,
-- so recover the occurrence that was paid. Older rows fall back to payment_date.
update public.bill_payments payment
set cycle_due_date = case
  when bill.frequency = 'weekly'
    and payment.resulting_next_due_date is not null
    then payment.resulting_next_due_date - 7
  when bill.frequency = 'biweekly'
    and payment.resulting_next_due_date is not null
    then payment.resulting_next_due_date - 14
  else payment.payment_date
end
from public.bill_events bill
where bill.id = payment.bill_id
  and bill.user_id = payment.user_id
  and payment.cycle_due_date is null;

alter table public.bill_payments
  alter column cycle_due_date set not null;

drop index if exists public.bill_payments_owner_bill_cycle_idx;
create index if not exists bill_payments_owner_bill_occurrence_idx
  on public.bill_payments (user_id, bill_id, cycle_due_date);

comment on column public.bill_payments.cycle_due_date is
  'Canonical bill occurrence satisfied by this payment. Multiple weekly or biweekly occurrences may share a calendar month.';

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
  v_legacy_fingerprint text;
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

  select *
  into v_bill
  from public.bill_events
  where id = p_bill_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'bill_not_found';
  end if;

  begin
    v_cycle_start := pg_catalog.to_date(p_cycle_month || '-01', 'YYYY-MM-DD');
  exception when others then
    raise exception using errcode = '22023', message = 'invalid_payment_cycle';
  end;

  if pg_catalog.to_char(v_cycle_start, 'YYYY-MM') <> p_cycle_month then
    raise exception using errcode = '22023', message = 'invalid_payment_cycle';
  end if;

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

  v_legacy_fingerprint := pg_catalog.md5(
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
    v_fingerprint := pg_catalog.md5(
      pg_catalog.jsonb_build_object(
        'bill_id', p_bill_id,
        'amount', p_amount,
        'payment_date', p_payment_date,
        'cycle_due_date', v_existing.cycle_due_date
      )::text
    );
    if v_existing.bill_id <> p_bill_id
      or (
        v_existing.request_fingerprint is distinct from v_fingerprint
        and v_existing.request_fingerprint is distinct from v_legacy_fingerprint
      ) then
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

  v_fingerprint := pg_catalog.md5(
    pg_catalog.jsonb_build_object(
      'bill_id', p_bill_id,
      'amount', p_amount,
      'payment_date', p_payment_date,
      'cycle_due_date', v_current_due
    )::text
  );

  select coalesce(pg_catalog.sum(amount_paid), 0)
  into v_paid
  from public.bill_payments
  where user_id = v_user_id
    and bill_id = p_bill_id
    and cycle_due_date = v_current_due;

  v_remaining := greatest(v_bill.amount - v_paid, 0);
  if v_remaining <= 0 then
    raise exception using errcode = '22023', message = 'bill_occurrence_already_paid';
  end if;

  v_recorded := least(p_amount, v_remaining);

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
    cycle_due_date,
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
    pg_catalog.to_char(v_current_due, 'YYYY-MM'),
    v_current_due,
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
