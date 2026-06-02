-- Dev-only consolidated schema for local/dev Supabase projects
-- SAFE: uses IF NOT EXISTS; does NOT modify production data.
-- Replace <TEST_USER_ID> in seed statements with a real dev user UUID

create extension if not exists pgcrypto;

-- ---------------------------------------------
-- debts
-- ---------------------------------------------
create table if not exists public.debts (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  name text not null,
  balance numeric not null default 0,
  minimum_payment numeric not null default 0,
  interest_rate numeric not null default 0,
  due_date integer,
  is_archived boolean default false,
  payment_behavior text NOT NULL DEFAULT 'fixed',
  minimum_payment_rate numeric DEFAULT 2.00,
  minimum_payment_floor numeric DEFAULT 25.00,
  next_due_date_after_payment date NULL,
  funding_source_id uuid NULL,
  assigned_income_date date NULL,
  created_at timestamptz not null default now()
);

create index if not exists debts_funding_source_idx on public.debts (funding_source_id);
create index if not exists debts_next_due_date_idx on public.debts (next_due_date_after_payment);
create index if not exists debts_assigned_income_date_idx on public.debts (assigned_income_date);

alter table public.debts enable row level security;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'debts'
      AND policyname = 'Users can manage their own debts'
  ) THEN
    CREATE POLICY "Users can manage their own debts"
      ON public.debts
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- ---------------------------------------------
-- funding_sources
-- ---------------------------------------------
create table if not exists public.funding_sources (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  name text not null,
  type text not null,
  current_balance numeric not null default 0,
  credit_limit numeric,
  available_credit numeric,
  interest_rate numeric,
  is_active boolean default true,
  linked_debt_id uuid NULL references public.debts(id),
  created_at timestamptz not null default now()
);

create index if not exists funding_sources_linked_debt_idx on public.funding_sources (linked_debt_id);
alter table public.funding_sources enable row level security;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'funding_sources'
      AND policyname = 'Users can manage their own funding_sources'
  ) THEN
    CREATE POLICY "Users can manage their own funding_sources"
      ON public.funding_sources
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

comment on column funding_sources.linked_debt_id is 'When set, this funding source represents a debt account. The balance should be read from the linked debt.';

-- ---------------------------------------------
-- bill_events (recurring bills)
-- ---------------------------------------------
create table if not exists public.bill_events (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  name text not null,
  amount numeric not null,
  due_date integer,
  frequency text,
  is_archived boolean default false,
  next_due_date_after_payment date NULL,
  assigned_income_date date NULL,
  funding_source_id uuid NULL,
  created_at timestamptz not null default now()
);

create index if not exists bill_events_next_due_date_idx on public.bill_events (next_due_date_after_payment);
create index if not exists bill_events_assigned_income_date_idx on public.bill_events (assigned_income_date);
create index if not exists bill_events_funding_source_idx on public.bill_events (funding_source_id);
alter table public.bill_events enable row level security;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bill_events'
      AND policyname = 'Users can manage their own bill_events'
  ) THEN
    CREATE POLICY "Users can manage their own bill_events"
      ON public.bill_events
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- ---------------------------------------------
-- bill_payments
-- ---------------------------------------------
create table if not exists public.bill_payments (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  bill_id uuid not null references public.bill_events(id),
  amount_paid numeric not null,
  cycle_month text,
  funding_source_id uuid NULL,
  created_at timestamptz not null default now()
);

create index if not exists bill_payments_funding_source_idx on public.bill_payments (funding_source_id);
alter table public.bill_payments enable row level security;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bill_payments'
      AND policyname = 'Users can manage their own bill_payments'
  ) THEN
    CREATE POLICY "Users can manage their own bill_payments"
      ON public.bill_payments
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- ---------------------------------------------
-- debt_payments
-- ---------------------------------------------
create table if not exists public.debt_payments (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  debt_id uuid not null references public.debts(id),
  amount numeric not null,
  payment_date date not null,
  cycle_due_date date not null,
  funding_source_id uuid NULL,
  created_at timestamptz not null default now()
);

create index if not exists debt_payments_debt_cycle_idx on public.debt_payments (debt_id, cycle_due_date);
create index if not exists debt_payments_funding_source_idx on public.debt_payments (funding_source_id);
alter table public.debt_payments enable row level security;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'debt_payments'
      AND policyname = 'Users can manage their own debt payments'
  ) THEN
    CREATE POLICY "Users can manage their own debt payments"
      ON public.debt_payments
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- ---------------------------------------------
-- income_events
-- ---------------------------------------------
create table if not exists public.income_events (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id),
  name text not null,
  amount numeric not null,
  frequency text,
  next_date date,
  created_at timestamptz not null default now()
);

alter table public.income_events enable row level security;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'income_events'
      AND policyname = 'Users can manage their own income_events'
  ) THEN
    CREATE POLICY "Users can manage their own income_events"
      ON public.income_events
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- ---------------------------------------------
-- settings tables: cash_settings, debt_settings, cache_settings
-- ---------------------------------------------
create table if not exists public.cash_settings (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) unique,
  starting_balance numeric default 500,
  checking_buffer numeric default 500,
  lookahead_days integer default 30,
  assignment_horizon_months integer default 6,
  created_at timestamptz not null default now()
);

alter table public.cash_settings enable row level security;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cash_settings'
      AND policyname = 'Users can manage their own cash_settings'
  ) THEN
    CREATE POLICY "Users can manage their own cash_settings"
      ON public.cash_settings
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

create table if not exists public.debt_settings (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) unique,
  strategy text default 'snowball',
  extra_payment numeric default 0,
  created_at timestamptz not null default now()
);

alter table public.debt_settings enable row level security;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'debt_settings'
      AND policyname = 'Users can manage their own debt_settings'
  ) THEN
    CREATE POLICY "Users can manage their own debt_settings"
      ON public.debt_settings
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

create table if not exists public.cache_settings (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) unique,
  assignment_horizon_months integer default 6,
  created_at timestamptz not null default now()
);

alter table public.cache_settings enable row level security;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cache_settings'
      AND policyname = 'Users can manage their own cache_settings'
  ) THEN
    CREATE POLICY "Users can manage their own cache_settings"
      ON public.cache_settings
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- End of dev schema
