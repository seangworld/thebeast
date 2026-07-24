alter table public.learning_courses
  add column if not exists paused_at timestamptz,
  add column if not exists archived_at timestamptz;

alter table public.learning_activities
  drop constraint if exists learning_activities_course_id_fkey;

alter table public.learning_activities
  add constraint learning_activities_course_id_fkey
  foreign key (course_id)
  references public.learning_courses(id)
  on delete set null;

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
    and (user_id = actor_id or actor_is_admin);

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

  update public.learning_activities
  set course_id = null,
      updated_at = now()
  where course_id = p_course_id;

  delete from public.learning_courses
  where id = p_course_id;
end;
$$;

revoke all on function public.remove_learning_course(uuid) from public;
grant execute on function public.remove_learning_course(uuid) to authenticated;
