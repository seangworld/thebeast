-- PLAT-001C: narrowly scoped, default-off payment maintenance control.
-- The authoritative trigger boundary covers atomic RPCs and direct writers
-- without disabling BeastMoney reads or unrelated account maintenance.
create table if not exists public.beastmoney_payment_write_control (
  control_key text primary key,
  restricted boolean not null default false,
  acceptance_admin_id uuid null references auth.users(id) on delete set null,
  activated_at timestamptz null,
  activated_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint beastmoney_payment_write_control_singleton_check
    check (control_key = 'global'),
  constraint beastmoney_payment_write_control_state_check
    check (
      (restricted and activated_at is not null and activated_by is not null)
      or
      (not restricted and acceptance_admin_id is null and activated_at is null)
    )
);

insert into public.beastmoney_payment_write_control (
  control_key,
  restricted,
  acceptance_admin_id,
  activated_at,
  activated_by
) values ('global', false, null, null, null)
on conflict (control_key) do nothing;

alter table public.beastmoney_payment_write_control enable row level security;
revoke all on table public.beastmoney_payment_write_control
  from public, anon, authenticated;

create or replace function public.get_beastmoney_payment_write_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
  v_restricted boolean;
  v_acceptance_admin_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;

  select restricted, acceptance_admin_id
  into v_restricted, v_acceptance_admin_id
  from public.beastmoney_payment_write_control
  where control_key = 'global';

  if not found then
    raise exception using errcode = '55000', message = 'payment_write_control_unavailable';
  end if;

  return pg_catalog.jsonb_build_object(
    'restricted', v_restricted,
    'payments_available', not v_restricted or coalesce(v_acceptance_admin_id = v_user_id, false),
    'acceptance_exception', v_restricted and coalesce(v_acceptance_admin_id = v_user_id, false)
  );
end;
$$;

create or replace function public.set_beastmoney_payment_write_restriction(
  p_restricted boolean,
  p_allow_current_admin boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'not_authenticated';
  end if;
  if not public.is_profile_admin() then
    raise exception using errcode = '42501', message = 'admin_required';
  end if;
  if p_restricted is null then
    raise exception using errcode = '22023', message = 'restriction_state_required';
  end if;
  if not p_restricted and p_allow_current_admin then
    raise exception using errcode = '22023', message = 'acceptance_exception_requires_restriction';
  end if;

  update public.beastmoney_payment_write_control
  set restricted = p_restricted,
      acceptance_admin_id = case
        when p_restricted and p_allow_current_admin then v_user_id
        else null
      end,
      activated_at = case when p_restricted then pg_catalog.now() else null end,
      activated_by = case when p_restricted then v_user_id else activated_by end,
      updated_at = pg_catalog.now()
  where control_key = 'global';

  if not found then
    raise exception using errcode = '55000', message = 'payment_write_control_unavailable';
  end if;

  return public.get_beastmoney_payment_write_status();
end;
$$;

create or replace function public.enforce_beastmoney_payment_write_restriction()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_restricted boolean;
  v_acceptance_admin_id uuid;
begin
  select restricted, acceptance_admin_id
  into v_restricted, v_acceptance_admin_id
  from public.beastmoney_payment_write_control
  where control_key = 'global';

  if not found then
    raise exception using errcode = '55000', message = 'payment_write_control_unavailable';
  end if;

  if v_restricted and auth.uid() is distinct from v_acceptance_admin_id then
    raise exception using
      errcode = '55000',
      message = 'beastmoney_payment_writes_temporarily_unavailable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_beastmoney_bill_payment_write_restriction
  on public.bill_payments;
create trigger enforce_beastmoney_bill_payment_write_restriction
  before insert or update or delete on public.bill_payments
  for each row
  execute function public.enforce_beastmoney_payment_write_restriction();

drop trigger if exists enforce_beastmoney_debt_payment_write_restriction
  on public.debt_payments;
create trigger enforce_beastmoney_debt_payment_write_restriction
  before insert or update or delete on public.debt_payments
  for each row
  execute function public.enforce_beastmoney_payment_write_restriction();

revoke all on function public.get_beastmoney_payment_write_status()
  from public, anon;
revoke all on function public.set_beastmoney_payment_write_restriction(boolean, boolean)
  from public, anon;
revoke all on function public.enforce_beastmoney_payment_write_restriction()
  from public, anon, authenticated;

grant execute on function public.get_beastmoney_payment_write_status()
  to authenticated;
grant execute on function public.set_beastmoney_payment_write_restriction(boolean, boolean)
  to authenticated;

comment on table public.beastmoney_payment_write_control is
  'Default-off PLAT-001C maintenance control for bill/debt payment and reversal writes.';
