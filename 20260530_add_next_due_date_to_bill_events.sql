-- Add next_due_date_after_payment column to bill_events to persist bill due date advancement.
-- This ensures that bill Next Due can advance and remain correct after payment completion.
-- This migration is safe to run multiple times when using IF NOT EXISTS.

ALTER TABLE IF EXISTS public.bill_events
  ADD COLUMN IF NOT EXISTS next_due_date_after_payment DATE NULL;

CREATE INDEX IF NOT EXISTS bill_events_next_due_date_idx
  ON public.bill_events (next_due_date_after_payment);
