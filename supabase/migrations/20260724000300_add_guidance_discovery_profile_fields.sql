alter table public.education_profiles
  add column if not exists career_interests text[] not null default '{}'::text[],
  add column if not exists educational_goals text[] not null default '{}'::text[],
  add column if not exists learning_preferences text[] not null default '{}'::text[],
  add column if not exists certifications text[] not null default '{}'::text[],
  add column if not exists available_study_time_known boolean not null default false,
  add column if not exists college_interest boolean,
  add column if not exists trade_interest boolean,
  add column if not exists current_employment text not null default '',
  add column if not exists military_experience text not null default '',
  add column if not exists other_educational_context text not null default '';

notify pgrst, 'reload schema';
