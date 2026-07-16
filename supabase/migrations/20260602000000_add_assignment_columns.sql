-- Add missing assignment columns to bill_events and debts tables
-- These columns enable assigning bills and debts to income pots and funding sources
-- This migration is safe to run multiple times when using IF NOT EXISTS

-- bill_events: assigned_income_date for income pot assignment
ALTER TABLE IF EXISTS public.bill_events
  ADD COLUMN IF NOT EXISTS assigned_income_date DATE NULL;

-- bill_events: funding_source_id for funding source assignment  
ALTER TABLE IF EXISTS public.bill_events
  ADD COLUMN IF NOT EXISTS funding_source_id UUID NULL;

CREATE INDEX IF NOT EXISTS bill_events_assigned_income_date_idx
  ON public.bill_events (assigned_income_date);

CREATE INDEX IF NOT EXISTS bill_events_funding_source_idx
  ON public.bill_events (funding_source_id);

-- debts: assigned_income_date for income pot assignment
ALTER TABLE IF EXISTS public.debts
  ADD COLUMN IF NOT EXISTS assigned_income_date DATE NULL;

-- Note: debts.funding_source_id already exists per 20260529_add_funding_source_to_debts.sql
-- No need to add it again, but we ensure the index exists
CREATE INDEX IF NOT EXISTS debts_funding_source_idx
  ON public.debts (funding_source_id);

CREATE INDEX IF NOT EXISTS debts_assigned_income_date_idx
  ON public.debts (assigned_income_date);