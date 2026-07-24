alter table public.learning_courses
  add column if not exists paused_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists removed_at timestamptz,
  add column if not exists lifecycle_state text;

update public.learning_courses
set lifecycle_state = case
  when removed_at is not null then 'removed'
  when archived_at is not null or lower(status) = 'archived' then 'archived'
  when paused_at is not null or lower(status) = 'paused' then 'paused'
  else 'active'
end
where lifecycle_state is null
   or lifecycle_state not in ('active', 'paused', 'archived', 'removed');

alter table public.learning_courses
  alter column lifecycle_state set default 'active',
  alter column lifecycle_state set not null;

alter table public.learning_courses
  drop constraint if exists learning_courses_lifecycle_state_check;

alter table public.learning_courses
  add constraint learning_courses_lifecycle_state_check
  check (lifecycle_state in ('active', 'paused', 'archived', 'removed'));

create index if not exists learning_courses_user_lifecycle_idx
  on public.learning_courses (user_id, lifecycle_state);

drop policy if exists "Admins manage all learning courses" on public.learning_courses;
create policy "Admins manage all learning courses"
on public.learning_courses for all
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

create or replace function public.remove_learning_course(p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  course_record public.learning_courses%rowtype;
  actor_id uuid := auth.uid();
  actor_is_admin boolean := false;
begin
  if actor_id is null then
    raise exception 'Authentication is required to remove a course.';
  end if;

  select exists (
    select 1
    from public.profiles
    where profiles.id = actor_id
      and profiles.role = 'admin'
  )
  into actor_is_admin;

  select *
  into course_record
  from public.learning_courses
  where id = p_course_id
    and lifecycle_state <> 'removed'
    and (user_id = actor_id or actor_is_admin)
  for update;

  if course_record.id is null then
    raise exception 'Course not found or removal is not permitted.';
  end if;

  insert into public.learning_history (
    user_id,
    learner_profile_id,
    event_type,
    title,
    summary,
    occurred_at
  )
  values (
    course_record.user_id,
    course_record.learner_profile_id,
    'course_removed',
    course_record.title,
    'Course removed from active learning. Previously earned and completed records were preserved.',
    now()
  );

  update public.learning_courses
  set lifecycle_state = 'removed',
      status = 'Removed',
      removed_at = now(),
      paused_at = null,
      archived_at = null,
      updated_at = now()
  where id = p_course_id;
end;
$$;

revoke all on function public.remove_learning_course(uuid) from public;
grant execute on function public.remove_learning_course(uuid) to authenticated;

notify pgrst, 'reload schema';
