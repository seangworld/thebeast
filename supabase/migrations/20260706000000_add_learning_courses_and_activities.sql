create table if not exists public.learning_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_profile_id uuid references public.learning_profiles(id) on delete cascade,
  title text not null,
  subject text,
  status text not null default 'Active',
  progress integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, title)
);

create table if not exists public.learning_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_profile_id uuid references public.learning_profiles(id) on delete cascade,
  course_id uuid references public.learning_courses(id) on delete cascade,
  plan_id uuid references public.learning_plans(id) on delete set null,
  session_id uuid references public.learning_sessions(id) on delete set null,
  activity_type text not null,
  title text not null,
  difficulty text not null default 'Beginner',
  estimated_minutes integer not null default 15,
  xp integer not null default 10,
  status text not null default 'Ready',
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.learning_courses enable row level security;
alter table public.learning_activities enable row level security;

drop policy if exists "Users manage own learning courses" on public.learning_courses;
create policy "Users manage own learning courses"
on public.learning_courses for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own learning activities" on public.learning_activities;
create policy "Users manage own learning activities"
on public.learning_activities for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
