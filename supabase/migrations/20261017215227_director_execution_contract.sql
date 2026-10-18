-- Preserve explicit data prerequisites; list order is not a dependency.
-- New RPC has a distinct name to avoid PostgREST overload ambiguity.
create function public.approve_director_scoped_plan(p_goal_id uuid, p_goal_updated_at timestamptz, p_steps jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  v_owner uuid := auth.uid(); v_updated timestamptz; v_step jsonb;
  v_cap text; v_dep text; v_deps uuid[]; v_id uuid; v_seen text[] := '{}';
begin
  if v_owner is null or jsonb_typeof(p_steps) is distinct from 'array' then raise exception 'Invalid review plan' using errcode='42501'; end if;
  if jsonb_array_length(p_steps) not between 1 and 2 then raise exception 'Invalid plan size' using errcode='42501'; end if;
  select updated_at into v_updated from public.beast_goals where id=p_goal_id and owner_id=v_owner
    and deleted_at is null and archived_at is null and status not in ('Paused','Completed','Archived') for update;
  if v_updated is null or v_updated is distinct from p_goal_updated_at then raise exception 'Objective changed' using errcode='PT409'; end if;
  for v_step in select value from jsonb_array_elements(p_steps) loop
    if jsonb_typeof(v_step) is distinct from 'object' then raise exception 'Invalid step' using errcode='42501'; end if;
    if (v_step - 'capability' - 'dependsOn') <> '{}'::jsonb or jsonb_typeof(v_step->'capability') is distinct from 'string'
      or jsonb_typeof(v_step->'dependsOn') is distinct from 'array' then raise exception 'Invalid step fields' using errcode='42501'; end if;
    v_cap := v_step->>'capability';
    if v_cap not in ('money.cash-review','health.preparation-review') or v_cap=any(v_seen) or not public.can_access_director_review(v_cap) then raise exception 'Capability unavailable' using errcode='42501'; end if;
    if exists(select 1 from public.beast_director_assignments where owner_id=v_owner and goal_id=p_goal_id and capability=v_cap) then raise exception 'Existing checkpoint must be reused' using errcode='PT409'; end if;
    v_deps := '{}';
    for v_dep in select value #>> '{}' from jsonb_array_elements(v_step->'dependsOn') loop
      if v_dep is null or v_dep=v_cap or v_dep not in ('money.cash-review','health.preparation-review') or not public.can_access_director_review(v_dep) then raise exception 'Invalid dependency' using errcode='42501'; end if;
      v_id := null;
      select id into v_id from public.beast_director_assignments where owner_id=v_owner and goal_id=p_goal_id and capability=v_dep
        and (capability=any(v_seen) or status='verified') for update;
      if v_id is null or v_id=any(v_deps) then raise exception 'Unresolved or duplicate dependency' using errcode='42501'; end if;
      v_deps := array_append(v_deps,v_id);
    end loop;
    insert into public.beast_director_assignments(owner_id,goal_id,capability,dependencies,events)
      values(v_owner,p_goal_id,v_cap,v_deps,jsonb_build_array(jsonb_build_object('at',now(),'status','planned','detail','Member explicitly approved this ready saved-record review.')));
    v_seen := array_append(v_seen,v_cap);
  end loop;
end;
$$;
revoke all on function public.approve_director_scoped_plan(uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.approve_director_scoped_plan(uuid,timestamptz,jsonb) to authenticated;

alter table public.beast_director_assignments drop constraint beast_director_assignments_status_check;
alter table public.beast_director_assignments add constraint beast_director_assignments_status_check
 check(status in ('planned','running','verified','needs_correction','blocked','cancelled'));

-- Cancellation and in-flight runner writes contend on the same row/revision.
-- Preserve completed results; never reset attempts or revive a cancelled row.
create function public.cancel_director_reviews(p_goal_id uuid,p_goal_updated_at timestamptz,p_capabilities text[])
returns void language plpgsql security invoker set search_path = '' as $$
declare v_updated timestamptz; v_cap text;
begin
  if auth.uid() is null or p_capabilities is null or cardinality(p_capabilities) not between 1 and 2
    or array_position(p_capabilities,null) is not null or not(p_capabilities <@ array['money.cash-review','health.preparation-review']) then raise exception 'Invalid cancellation' using errcode='42501'; end if;
  select updated_at into v_updated from public.beast_goals where id=p_goal_id and owner_id=auth.uid() and deleted_at is null and archived_at is null for update;
  if v_updated is null or v_updated is distinct from p_goal_updated_at then raise exception 'Objective changed' using errcode='PT409'; end if;
  foreach v_cap in array p_capabilities loop
    if not public.can_access_director_review(v_cap) then raise exception 'Cannot confirm cancellation of inaccessible work' using errcode='42501'; end if;
  end loop;
  update public.beast_director_assignments set status='cancelled',revision=revision+1,lease_id=null,lease_until=null,result=null,
    blocker='Current member instruction cancelled remaining work.',updated_at=now(),
    events=events||jsonb_build_array(jsonb_build_object('at',now(),'status','cancelled','detail','Current member instruction cancelled remaining work. Prior verified reviews retained.'))
    where owner_id=auth.uid() and goal_id=p_goal_id and capability=any(p_capabilities) and status not in ('verified','cancelled');
end;
$$;
revoke all on function public.cancel_director_reviews(uuid,timestamptz,text[]) from public,anon;
grant execute on function public.cancel_director_reviews(uuid,timestamptz,text[]) to authenticated;
