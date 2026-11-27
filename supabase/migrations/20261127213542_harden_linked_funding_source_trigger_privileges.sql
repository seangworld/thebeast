-- Trigger functions do not need RPC execution grants. Supabase default
-- privileges may grant exposed-schema functions to API roles explicitly.
revoke all on function public.sync_linked_funding_source_balance_from_debt()
  from public, anon, authenticated;
