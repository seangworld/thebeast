-- New Supabase projects no longer automatically expose public tables.
-- Keep grants explicit and fail closed if an expected dependency lacks RLS.
-- The shared override constraint predates Health; make its existing denial path usable.
alter table public.beast_admin_member_module_access drop constraint beast_admin_member_module_access_module_check;
alter table public.beast_admin_member_module_access add constraint beast_admin_member_module_access_module_check
check (module_id in ('money', 'learning', 'home', 'health'));
do $$ declare t text; begin
  foreach t in array array['profiles','beast_goals','beast_health_records','debts','bill_events','income_events','cash_settings','funding_sources','debt_settings','retirement_scenarios','agent_conversations','agent_conversation_messages','agent_memories','beast_admin_member_module_access','education_career_roadmaps','beast_documents'] loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t and c.relrowsecurity) then
      raise exception 'Director dependency % must exist with RLS enabled before granting access', t;
    end if;
    execute format('grant select on table public.%I to authenticated', t);
  end loop;
end $$;
grant insert, update on public.agent_conversations, public.agent_conversation_messages, public.beast_goals to authenticated;
grant update (birthday) on public.profiles to authenticated;

-- Defense in depth: direct Data API reads honor module/age revocation too.
-- Existing owner policies remain required; restrictive policies cannot widen them.
do $$ declare t text; begin
  foreach t in array array['debts','bill_events','income_events','cash_settings','funding_sources','debt_settings','retirement_scenarios'] loop
    execute format('create policy director_dependency_money_access on public.%I as restrictive for select to authenticated using (public.can_access_director_review(''money.cash-review''))', t);
  end loop;
end $$;
create policy director_dependency_health_access on public.beast_health_records as restrictive for select to authenticated
using (public.can_access_director_review('health.preparation-review'));

-- Bind approval to the canonical objective version while holding its row lock.
create function public.approve_director_review_plan(p_goal_id uuid, p_goal_updated_at timestamptz, p_capabilities text[])
returns void language plpgsql security invoker set search_path = '' as $$
declare v_updated timestamptz;
begin
  select updated_at into v_updated from public.beast_goals
    where id=p_goal_id and owner_id=auth.uid() and deleted_at is null and archived_at is null for update;
  if v_updated is null or v_updated is distinct from p_goal_updated_at then
    -- A stale approval is an HTTP conflict, not a retryable database transaction.
    raise exception 'Objective changed before approval' using errcode='PT409';
  end if;
  perform public.plan_director_reviews(p_goal_id, p_capabilities);
end;
$$;
revoke all on function public.approve_director_review_plan(uuid,timestamptz,text[]) from public, anon;
grant execute on function public.approve_director_review_plan(uuid,timestamptz,text[]) to authenticated;
