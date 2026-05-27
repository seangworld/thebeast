-- Add funding_source_id tracking to bill and debt payment records.
-- This migration is safe to run multiple times when using IF NOT EXISTS.

ALTER TABLE IF EXISTS public.bill_payments
  ADD COLUMN IF NOT EXISTS funding_source_id uuid NULL;

CREATE INDEX IF NOT EXISTS bill_payments_funding_source_idx
  ON public.bill_payments (funding_source_id);

ALTER TABLE IF EXISTS public.debt_payments
  ADD COLUMN IF NOT EXISTS funding_source_id uuid NULL;

CREATE INDEX IF NOT EXISTS debt_payments_funding_source_idx
  ON public.debt_payments (funding_source_id);
