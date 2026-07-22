alter table public.debts
  add column if not exists updated_at timestamptz not null default now();

create or replace function public.set_debts_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_debts_updated_at on public.debts;
create trigger set_debts_updated_at
  before update on public.debts
  for each row execute function public.set_debts_updated_at();

alter table public.velocity_settings
  add column if not exists selected_debt_id uuid null references public.debts(id) on delete set null;

create index if not exists velocity_settings_selected_debt_idx
  on public.velocity_settings(selected_debt_id);

comment on column public.velocity_settings.selected_debt_id is
  'Stable link to the owner-scoped canonical debt used by Velocity. Legacy duplicated source fields are retained as migration evidence only.';
