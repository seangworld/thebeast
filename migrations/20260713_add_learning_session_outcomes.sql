alter table public.learning_activities
  add column if not exists session_state text,
  add column if not exists session_recap text,
  add column if not exists session_strengths text[] not null default '{}',
  add column if not exists session_weak_concepts text[] not null default '{}',
  add column if not exists session_next_recommendation text,
  add column if not exists reflection_option text,
  add column if not exists reflection_note text,
  add column if not exists reflection_confidence_adjustment text,
  add column if not exists reflection_next_action text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'learning_activities_session_state_check'
  ) then
    alter table public.learning_activities
      add constraint learning_activities_session_state_check
      check (
        session_state is null or session_state in (
          'not_started',
          'in_progress',
          'paused',
          'completed',
          'remediation_required',
          'mastery_check_required',
          'review_due'
        )
      ) not valid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'learning_activities_reflection_option_check'
  ) then
    alter table public.learning_activities
      add constraint learning_activities_reflection_option_check
      check (
        reflection_option is null or reflection_option in (
          'Easy',
          'Okay',
          'Hard',
          'I guessed',
          'I''m frustrated'
        )
      ) not valid;
  end if;
end $$;
