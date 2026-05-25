create extension if not exists pgcrypto;

create table if not exists public.debt_payments (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  debt_id uuid not null references public.debts(id),
  amount numeric not null,
  payment_date date not null,
  cycle_due_date date not null,
  created_at timestamptz not null default now()
);

create index if not exists debt_payments_debt_cycle_idx
  on public.debt_payments (debt_id, cycle_due_date);

alter table public.debt_payments enable row level security;

create policy "Users can manage their own debt payments"
  on public.debt_payments
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
