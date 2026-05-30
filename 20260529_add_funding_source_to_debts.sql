-- Add funding_source_id column to debts table for debt-to-funding-source tracking.
-- This migration is safe to run multiple times when using IF NOT EXISTS.

ALTER TABLE IF EXISTS public.debts
  ADD COLUMN IF NOT EXISTS funding_source_id uuid NULL;

CREATE INDEX IF NOT EXISTS debts_funding_source_idx
  ON public.debts (funding_source_id);

-- Optional: Add foreign key constraint (comment out if debts can exist without a funding source)
-- ALTER TABLE public.debts
--   ADD CONSTRAINT debts_funding_source_fk 
--   FOREIGN KEY (funding_source_id) 
--   REFERENCES public.funding_sources(id) ON DELETE SET NULL;
