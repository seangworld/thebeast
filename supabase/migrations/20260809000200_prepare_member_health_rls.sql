-- BH-REL-01: prepare supporting BeastHealth tables for a future member release.
-- This migration is intentionally unapplied here. Visibility remains Admin Only
-- until the full member entitlement and authenticated acceptance gate is approved.

drop policy if exists "Owners manage their BeastHealth discovery"
  on public.beast_health_discovery;
create policy "Owners manage their BeastHealth discovery"
  on public.beast_health_discovery
  for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners manage own health document extractions"
  on public.beast_health_document_extractions;
create policy "Owners manage own health document extractions"
  on public.beast_health_document_extractions
  for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners manage own health document extraction items"
  on public.beast_health_document_extraction_items;
create policy "Owners manage own health document extraction items"
  on public.beast_health_document_extraction_items
  for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);
