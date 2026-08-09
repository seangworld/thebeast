-- AP-107: Digital Staff approvals must persist through the authenticated member session.
-- This migration is intentionally unapplied by this change; release verification must
-- apply it through the normal migration gate before live member acceptance.

drop policy if exists "Owners read own BeastHealth records"
  on public.beast_health_records;
create policy "Owners read own BeastHealth records"
  on public.beast_health_records
  for select
  using (auth.uid() = owner_id);

drop policy if exists "Owners create own BeastHealth records"
  on public.beast_health_records;
create policy "Owners create own BeastHealth records"
  on public.beast_health_records
  for insert
  with check (auth.uid() = owner_id);

drop policy if exists "Owners update own BeastHealth records"
  on public.beast_health_records;
create policy "Owners update own BeastHealth records"
  on public.beast_health_records
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Owners delete own BeastHealth records"
  on public.beast_health_records;
create policy "Owners delete own BeastHealth records"
  on public.beast_health_records
  for delete
  using (auth.uid() = owner_id);
