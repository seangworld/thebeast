-- Add next_due_date_after_payment column to debts table to persist due date advancement.
-- This ensures that after a payment meets the minimum, the next cycle's due date persists across page refreshes.
-- This migration is safe to run multiple times when using IF NOT EXISTS.

ALTER TABLE IF EXISTS public.debts
  ADD COLUMN IF NOT EXISTS next_due_date_after_payment DATE NULL;

CREATE INDEX IF NOT EXISTS debts_next_due_date_idx
  ON public.debts (next_due_date_after_payment);
