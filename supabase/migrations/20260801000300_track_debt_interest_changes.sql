-- BM-37: preserve the latest debt interest-rate change for Money Coach awareness.
alter table public.debts
  add column if not exists previous_interest_rate numeric null,
  add column if not exists interest_rate_updated_at timestamptz null;

create or replace function public.track_debt_interest_rate_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.interest_rate is distinct from old.interest_rate then
    new.previous_interest_rate := old.interest_rate;
    new.interest_rate_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists track_debt_interest_rate_change on public.debts;
create trigger track_debt_interest_rate_change
  before update of interest_rate on public.debts
  for each row
  execute function public.track_debt_interest_rate_change();

comment on column public.debts.previous_interest_rate is
  'Previous recorded APR retained when interest_rate changes for owner-scoped Money Coach explanations.';
comment on column public.debts.interest_rate_updated_at is
  'Timestamp of the latest recorded APR change; no lender event is inferred.';
