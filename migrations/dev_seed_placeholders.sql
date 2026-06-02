-- Dev seed placeholders (NO PRODUCTION DATA)
-- Usage: replace <TEST_USER_ID> with a dev user UUID (from Supabase Auth)
--        replace any other <...> placeholders before running.
+
-- PLACEHOLDER VARIABLES (replace these)
-- <TEST_USER_ID>            -- UUID of a test auth user you created in the dev Supabase project
-- <CHECKING_FUNDING_ID>     -- optional explicit UUID for the checking funding source
-- <CREDIT_CARD_FUNDING_ID>  -- optional explicit UUID for the credit card funding source
-- <HELOC_FUNDING_ID>        -- optional explicit UUID for the HELOC funding source
+
-- Example: sign up a test user through your app, copy the user's id,
-- then run this file (after replacing placeholders) in the Supabase SQL editor.
+
-- 1) Settings
INSERT INTO public.cash_settings (user_id, starting_balance, checking_buffer, lookahead_days, assignment_horizon_months)
VALUES ('<TEST_USER_ID>', 1000, 500, 30, 6)
ON CONFLICT (user_id) DO NOTHING;
+
INSERT INTO public.debt_settings (user_id, strategy, extra_payment)
VALUES ('<TEST_USER_ID>', 'snowball', 0)
ON CONFLICT (user_id) DO NOTHING;
+
-- 2) Funding sources (checking, credit card, HELOC)
INSERT INTO public.funding_sources (id, user_id, name, type, current_balance, credit_limit, available_credit, is_active)
VALUES
  ('<CHECKING_FUNDING_ID>', '<TEST_USER_ID>', 'Dev Checking', 'checking', 1000, NULL, NULL, true),
  ('<CREDIT_CARD_FUNDING_ID>', '<TEST_USER_ID>', 'Dev Credit Card', 'credit_card', -500, 3000, 2500, true),
  ('<HELOC_FUNDING_ID>', '<TEST_USER_ID>', 'Dev HELOC', 'heloc', -2000, 50000, NULL, true)
ON CONFLICT (id) DO NOTHING;
+
-- 3) Debts (two debts)
INSERT INTO public.debts (id, user_id, name, balance, minimum_payment, interest_rate, due_date, payment_behavior, minimum_payment_rate, minimum_payment_floor, funding_source_id)
VALUES
  (gen_random_uuid(), '<TEST_USER_ID>', 'Dev Loan 1', 1500, 50, 5.5, 15, 'fixed', 2.00, 25, '<CREDIT_CARD_FUNDING_ID>'),
  (gen_random_uuid(), '<TEST_USER_ID>', 'Dev Loan 2', 800, 30, 6.0, 10, 'fixed', 2.00, 25, '<HELOC_FUNDING_ID>');
+
-- 4) Bills (3 bills)
INSERT INTO public.bill_events (id, user_id, name, amount, due_date, frequency)
VALUES
  (gen_random_uuid(), '<TEST_USER_ID>', 'Dev Rent', 1200, 1, 'monthly'),
  (gen_random_uuid(), '<TEST_USER_ID>', 'Dev Utilities', 150, 5, 'monthly'),
  (gen_random_uuid(), '<TEST_USER_ID>', 'Dev Internet', 60, 10, 'monthly')
ON CONFLICT (id) DO NOTHING;
+
-- 5) Income sources (2 incomes)
INSERT INTO public.income_events (id, user_id, name, amount, frequency, next_date)
VALUES
  (gen_random_uuid(), '<TEST_USER_ID>', 'Dev Paycheck', 2000, 'biweekly', now()::date + interval '7 days'),
  (gen_random_uuid(), '<TEST_USER_ID>', 'Dev Side Gig', 300, 'monthly', now()::date + interval '14 days')
ON CONFLICT (id) DO NOTHING;
+
-- 6) Optional: small demonstration debt payment (no personal data)
-- INSERT INTO public.debt_payments (id, user_id, debt_id, amount, payment_date, cycle_due_date)
-- VALUES (gen_random_uuid(), '<TEST_USER_ID>', '<DEBT_ID_FROM_ABOVE>', 50, now()::date, now()::date);
+
-- 7) Quick checks (select statements you can run after applying seed)
-- SELECT * FROM public.cash_settings WHERE user_id = '<TEST_USER_ID>';
-- SELECT * FROM public.funding_sources WHERE user_id = '<TEST_USER_ID>';
-- SELECT * FROM public.debts WHERE user_id = '<TEST_USER_ID>' LIMIT 10;
+
-- End of seed placeholders
