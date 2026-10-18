-- Attach assignments to the canonical BeastGoals objective. No duplicate goal store.
-- Protect stored module evidence even when a client bypasses the Next route.
create function public.can_access_director_review(p_capability text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select p_capability in ('money.cash-review', 'health.preparation-review')
    and exists (select 1 from public.profiles p where p.id = auth.uid()
      and (p.role = 'admin' or p.birthday <= ((now() at time zone 'UTC')::date - interval '18 years')::date))
    and not exists (select 1 from public.beast_admin_member_module_access a
      where a.member_id = auth.uid() and a.module_id = case p_capability when 'money.cash-review' then 'money' else 'health' end and a.enabled = false);
$$;
revoke all on function public.can_access_director_review(text) from public, anon;
grant execute on function public.can_access_director_review(text) to authenticated;

create table public.beast_director_assignments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.beast_goals(id) on delete cascade,
  capability text not null check (capability in ('money.cash-review', 'health.preparation-review')),
  status text not null default 'planned' check (status in ('planned', 'running', 'verified', 'needs_correction', 'blocked')),
  dependencies uuid[] not null default '{}',
  revision integer not null default 0 check (revision >= 0),
  attempts integer not null default 0 check (attempts between 0 and 3),
  lease_id uuid,
  lease_until timestamptz,
  result jsonb,
  events jsonb not null default '[]' check (jsonb_typeof(events) = 'array'),
  blocker text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, goal_id, capability),
  check ((status = 'running') = (lease_id is not null and lease_until is not null)),
  check (status <> 'verified' or result is not null)
);
alter table public.beast_director_assignments enable row level security;
revoke all on public.beast_director_assignments from anon, authenticated;
grant select, insert, update on public.beast_director_assignments to authenticated;
create policy director_assignments_read on public.beast_director_assignments for select to authenticated
using (owner_id = (select auth.uid()) and public.can_access_director_review(capability) and exists (select 1 from public.beast_goals g where g.id = goal_id and g.owner_id = (select auth.uid()) and g.deleted_at is null and g.archived_at is null));
create policy director_assignments_insert on public.beast_director_assignments for insert to authenticated
with check (owner_id = (select auth.uid()) and public.can_access_director_review(capability) and exists (select 1 from public.beast_goals g where g.id = goal_id and g.owner_id = (select auth.uid()) and g.deleted_at is null and g.archived_at is null));
create policy director_assignments_update on public.beast_director_assignments for update to authenticated
using (owner_id = (select auth.uid()) and public.can_access_director_review(capability))
with check (owner_id = (select auth.uid()) and public.can_access_director_review(capability) and exists (select 1 from public.beast_goals g where g.id = goal_id and g.owner_id = (select auth.uid()) and g.deleted_at is null and g.archived_at is null));
-- This owner-controlled history is not an authorization token or proof of life-goal completion.
-- The server recomputes results before reporting verified checkpoints.

create function public.plan_director_reviews(p_goal_id uuid, p_capabilities text[])
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_owner uuid := auth.uid();
  v_goal uuid;
  v_capability text;
  v_id uuid;
  v_previous uuid;
begin
  if v_owner is null or cardinality(p_capabilities) not between 1 and 2
     or p_capabilities is null or array_position(p_capabilities, null) is not null
     or not (p_capabilities <@ array['money.cash-review', 'health.preparation-review']) then
    raise exception 'Invalid review plan' using errcode = '42501';
  end if;
  select id into v_goal from public.beast_goals
    where id = p_goal_id and owner_id = v_owner and deleted_at is null and archived_at is null and status <> 'Archived'
    for update;
  if v_goal is null then raise exception 'Objective unavailable' using errcode = '42501'; end if;
  foreach v_capability in array p_capabilities loop
    if not public.can_access_director_review(v_capability) then raise exception 'Specialist permission unavailable' using errcode = '42501'; end if;
    v_id := null;
    insert into public.beast_director_assignments(owner_id, goal_id, capability, dependencies, events)
      values (v_owner, p_goal_id, v_capability, case when v_previous is null then '{}'::uuid[] else array[v_previous] end,
        jsonb_build_array(jsonb_build_object('at', now(), 'status', 'planned', 'detail', 'Member authorized saved-record review. No external action authorized.')))
      on conflict (owner_id, goal_id, capability) do nothing returning id into v_id;
    if v_id is null then
      select id into v_id from public.beast_director_assignments where owner_id = v_owner and goal_id = p_goal_id and capability = v_capability;
    end if;
    v_previous := v_id;
  end loop;
end;
$$;
revoke all on function public.plan_director_reviews(uuid, text[]) from public, anon;
grant execute on function public.plan_director_reviews(uuid, text[]) to authenticated;
