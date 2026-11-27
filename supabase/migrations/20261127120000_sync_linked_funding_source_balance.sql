-- Keep a linked funding account's cached balance and available credit aligned
-- with its canonical debt record. The debt remains the source of truth.
create or replace function public.sync_linked_funding_source_balance_from_debt()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.funding_sources
  set
    current_balance = new.balance,
    available_credit = case
      when credit_limit is not null and credit_limit > 0
        then greatest(credit_limit - new.balance, 0)
      else null
    end
  where user_id = new.user_id
    and linked_debt_id = new.id;

  return new;
end;
$$;

revoke all on function public.sync_linked_funding_source_balance_from_debt() from public;

drop trigger if exists sync_linked_funding_source_balance_from_debt on public.debts;
create trigger sync_linked_funding_source_balance_from_debt
after update of balance on public.debts
for each row
when (old.balance is distinct from new.balance)
execute function public.sync_linked_funding_source_balance_from_debt();
