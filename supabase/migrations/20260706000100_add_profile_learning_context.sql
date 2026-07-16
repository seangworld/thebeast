alter table public.profiles
  add column if not exists current_academic_level text,
  add column if not exists career_interests text,
  add column if not exists learning_preferences text,
  add column if not exists learning_availability text,
  add column if not exists learning_strengths text,
  add column if not exists learning_help_areas text;
