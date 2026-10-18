-- Disposable local integration fixture only. Never run against a hosted database.
create role anon nologin;
create role authenticated nologin;
create role authenticator login password 'synthetic-local-only' noinherit;
grant anon, authenticated to authenticator;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid $$;
grant usage on schema public, auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
create table public.beast_goals(id uuid primary key, owner_id uuid not null references auth.users, title text, description text, current_step text, category text, status text, updated_at timestamptz default now(), deleted_at timestamptz, archived_at timestamptz);
alter table public.beast_goals enable row level security;
create policy goals_owner on public.beast_goals to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select, insert, update on public.beast_goals to authenticated;
create table public.beast_health_records(id uuid primary key, owner_id uuid, record_type text, title text, status text, occurred_on text, source text, notes text, details jsonb, created_at timestamptz, updated_at timestamptz);
alter table public.beast_health_records enable row level security;
create policy health_owner on public.beast_health_records to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select, insert, update on public.beast_health_records to authenticated;
create table public.beast_admin_member_module_access(member_id uuid, module_id text, enabled boolean);
create table public.profiles(id uuid primary key, role text, birthday date);
alter table public.profiles enable row level security;
create policy profiles_owner on public.profiles for select to authenticated using (id = auth.uid());
grant select on public.profiles to authenticated;
alter table public.beast_admin_member_module_access enable row level security;
create policy access_owner on public.beast_admin_member_module_access for select to authenticated using (member_id = auth.uid());
grant select on public.beast_admin_member_module_access to authenticated;
insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002'), ('00000000-0000-4000-8000-000000000003'), ('00000000-0000-4000-8000-000000000004');
insert into public.profiles values ('00000000-0000-4000-8000-000000000001', 'member', '1980-01-01'), ('00000000-0000-4000-8000-000000000002', 'member', '1980-01-01'), ('00000000-0000-4000-8000-000000000003', 'member', '2015-01-01'), ('00000000-0000-4000-8000-000000000004', 'member', '1980-01-01');
insert into public.beast_admin_member_module_access values ('00000000-0000-4000-8000-000000000004', 'health', false);
insert into public.beast_goals(id, owner_id, title, category, status) values
 ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Prepare appointment and cash review', 'Health', 'Active'),
 ('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'Other member goal', 'Health', 'Active'),
 ('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000003', 'Child goal', 'Personal', 'Active'),
 ('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000004', 'Disabled module goal', 'Personal', 'Active');
insert into public.beast_health_records values
 ('20000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'medication', 'Synthetic medication A', 'active', null, 'synthetic', null, '{}', now(), now()),
 ('20000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000002', 'medication', 'PRIVATE BOB MEDICATION', 'active', null, 'synthetic', null, '{}', now(), now());

create table public.debts(id uuid primary key, user_id uuid, name text, balance numeric, minimum_payment numeric, interest_rate numeric, due_date text, next_due_date_after_payment text, payment_behavior text, lifecycle_status text, paid_off_at text, is_archived boolean, created_at timestamptz);
create table public.bill_events(id uuid primary key, user_id uuid, name text, amount numeric, frequency text, due_date text, next_due_date_after_payment text, assigned_income_date text, is_archived boolean, created_at timestamptz);
create table public.income_events(id uuid primary key, user_id uuid, name text, amount numeric, frequency text, next_date text, is_active boolean, is_archived boolean, created_at timestamptz);
create table public.cash_settings(user_id uuid primary key, starting_balance numeric, checking_buffer numeric);
create table public.funding_sources(id uuid primary key, user_id uuid, name text, current_balance numeric, credit_limit numeric, available_credit numeric, is_active boolean, created_at timestamptz);
create table public.debt_settings(user_id uuid primary key, strategy text, extra_payment numeric, custom_debt_order uuid[]);
create table public.retirement_scenarios(id uuid primary key, owner_id uuid, name text, assumptions jsonb, updated_at timestamptz);
do $$ declare t text; begin
  foreach t in array array['debts','bill_events','income_events','cash_settings','funding_sources','debt_settings'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy fixture_owner on public.%I for select to authenticated using (user_id = auth.uid())', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end $$;
alter table public.retirement_scenarios enable row level security;
create policy retirement_owner on public.retirement_scenarios for select to authenticated using (owner_id = auth.uid());
grant select on public.retirement_scenarios to authenticated;
insert into public.cash_settings values ('00000000-0000-4000-8000-000000000001', 1000, 200);
insert into public.income_events values ('30000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Synthetic salary', 3000, 'monthly', to_char(now() + interval '5 days', 'YYYY-MM-DD'), true, false, now());
