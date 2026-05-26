-- Add debt-level payment behavior and revolving minimum settings.
-- This migration preserves existing behavior by default.

ALTER TABLE debts
  ADD COLUMN payment_behavior text NOT NULL DEFAULT 'fixed';

ALTER TABLE debts
  ADD COLUMN minimum_payment_rate numeric NOT NULL DEFAULT 2.00;

ALTER TABLE debts
  ADD COLUMN minimum_payment_floor numeric NOT NULL DEFAULT 25.00;
