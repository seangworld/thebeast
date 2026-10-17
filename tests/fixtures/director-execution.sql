-- Disposable local test database only; apply after director-database.sql and Director migrations.
-- Disposable local fixture extensions, not application migrations.
insert into public.beast_health_records values ('20000000-0000-4000-8000-000000000017','00000000-0000-4000-8000-000000000001','appointment','Own logistics note','active',null,'synthetic','Transport paperwork has not yet been arranged.','{}',now(),now());
grant update(amount) on public.income_events to authenticated;
create policy fixture_income_edit on public.income_events for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant insert,delete on public.beast_admin_member_module_access to authenticated;
create policy fixture_owner_module_edit on public.beast_admin_member_module_access for all to authenticated using(member_id=auth.uid()) with check(member_id=auth.uid());
-- Match the existing production migration's restrictive module select policies.
do $$ declare t text; begin
 foreach t in array array['debts','bill_events','income_events','cash_settings','funding_sources','debt_settings','retirement_scenarios'] loop
 execute format('create policy director_dependency_money_access on public.%I as restrictive for select to authenticated using (public.can_access_director_review(''money.cash-review''))',t);
 end loop;
end $$;
create policy director_dependency_health_access on public.beast_health_records as restrictive for select to authenticated using(public.can_access_director_review('health.preparation-review'));

-- Disposable API fixture only. Minimal existing conversation tables.
create table public.agent_conversations(id text primary key,owner_id uuid,agent_id text,title text,tags text[],message_count integer default 0,updated_at timestamptz default now());
create table public.agent_conversation_messages(id uuid primary key,owner_id uuid,conversation_id text,sender jsonb,recipient jsonb,content jsonb,created_at timestamptz default now());
alter table public.agent_conversations enable row level security;
alter table public.agent_conversation_messages enable row level security;
create policy fixture_conversation_owner on public.agent_conversations to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
create policy fixture_message_owner on public.agent_conversation_messages to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
grant select,insert,update on public.agent_conversations,public.agent_conversation_messages to authenticated;
