-- Cancellation is a deny-only owner intent, independent of module visibility.
-- Never reveals hidden assignments or weakens their RLS.
create table public.beast_director_cancellations (
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null references public.beast_goals(id) on delete cascade,
  cancelled_at timestamptz not null default now(),
  primary key(owner_id, goal_id)
);
alter table public.beast_director_cancellations enable row level security;
create policy director_cancellation_owner_read on public.beast_director_cancellations for select to authenticated using ((select auth.uid()) = owner_id);
create policy director_cancellation_owner_insert on public.beast_director_cancellations for insert to authenticated with check ((select auth.uid()) = owner_id and exists(select 1 from public.beast_goals g where g.id=goal_id and g.owner_id=(select auth.uid())));
revoke all on public.beast_director_cancellations from public, anon, authenticated;
grant select, insert on public.beast_director_cancellations to authenticated;

create function public.fence_cancelled_director_work() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  -- Serializes cancellation with approval, result persistence, recovery and correction.
  perform 1 from public.beast_goals where id=new.goal_id and owner_id=new.owner_id for update;
  if exists(select 1 from public.beast_director_cancellations where owner_id=new.owner_id and goal_id=new.goal_id) and new.status <> 'cancelled' then
    raise exception 'Owner cancelled remaining Director work' using errcode='PT409';
  end if;
  return new;
end;
$$;
revoke all on function public.fence_cancelled_director_work() from public, anon, authenticated;
create trigger fence_cancelled_director_work before insert or update on public.beast_director_assignments for each row execute function public.fence_cancelled_director_work();

create function public.record_director_cancellation(p_goal_id uuid, p_goal_updated_at timestamptz) returns void language plpgsql security invoker set search_path='' as $$
declare g public.beast_goals;
begin
  select * into g from public.beast_goals where id=p_goal_id and owner_id=(select auth.uid()) and deleted_at is null and archived_at is null for update;
  if not found then raise exception 'Objective unavailable' using errcode='42501'; end if;
  if g.updated_at is distinct from p_goal_updated_at then raise exception 'Objective changed' using errcode='PT409'; end if;
  insert into public.beast_director_cancellations(owner_id,goal_id) values((select auth.uid()),p_goal_id) on conflict do nothing;
  -- Only RLS-visible rows change here. Hidden work stays inaccessible but is fenced above.
  update public.beast_director_assignments set status='cancelled',revision=revision+1,lease_id=null,lease_until=null,result=null,
    blocker='Owner cancelled remaining reviews.',updated_at=now(),
    events=events || jsonb_build_array(jsonb_build_object('at',now(),'status','cancelled','detail','Owner cancelled remaining reviews.'))
  where owner_id=(select auth.uid()) and goal_id=p_goal_id and status not in ('verified','cancelled');
end;
$$;
revoke all on function public.record_director_cancellation(uuid,timestamptz) from public,anon;
grant execute on function public.record_director_cancellation(uuid,timestamptz) to authenticated;
