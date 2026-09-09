-- Additive migration. Apply only to the explicitly approved target.
create table public.beast_admin_company_costs (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  name text not null check (char_length(trim(name)) between 1 and 120),
  kind text not null check (kind in ('recurring', 'payment', 'credit_funding')),
  amount_cents integer check (amount_cents between 0 and 100000000),
  interval_months integer,
  active boolean not null default true,
  paid_on date,
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  primary key (owner_id, id),
  check ((kind = 'recurring' and interval_months is not null and interval_months between 1 and 120 and paid_on is null)
      or (kind <> 'recurring' and interval_months is null))
);
alter table public.beast_admin_company_costs enable row level security;
revoke all on public.beast_admin_company_costs from public, anon, authenticated;
grant select, insert, update on public.beast_admin_company_costs to authenticated;
create policy "CEO reads own company costs" on public.beast_admin_company_costs for select to authenticated
using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "CEO inserts own company costs" on public.beast_admin_company_costs for insert to authenticated
with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
create policy "CEO updates own company costs" on public.beast_admin_company_costs for update to authenticated
using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'))
with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));
