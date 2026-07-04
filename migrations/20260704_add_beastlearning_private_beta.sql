create table if not exists public.learning_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  learner_role text default 'Learner',
  focus text,
  birthday date,
  learning_style text,
  preferred_pace text,
  beta_status text default 'Private Beta',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_profile_id uuid references public.learning_profiles(id) on delete cascade,
  title text not null,
  category text not null,
  target text,
  priority text default 'Medium',
  status text default 'Active',
  progress integer default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_profile_id uuid references public.learning_profiles(id) on delete cascade,
  goal_id uuid references public.learning_goals(id) on delete set null,
  title text not null,
  summary text,
  weekly_session_target integer default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_profile_id uuid references public.learning_profiles(id) on delete cascade,
  plan_id uuid references public.learning_plans(id) on delete set null,
  title text not null,
  course_title text,
  scheduled_for timestamptz,
  duration_minutes integer,
  status text default 'Scheduled',
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_profile_id uuid references public.learning_profiles(id) on delete cascade,
  label text not null,
  value text not null,
  detail text,
  numeric_value numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_mastery (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_profile_id uuid references public.learning_profiles(id) on delete cascade,
  concept_id text not null,
  mastery_percent integer default 0,
  confidence text default 'low',
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_profile_id uuid references public.learning_profiles(id) on delete cascade,
  title text not null,
  detail text,
  earned boolean not null default false,
  earned_at timestamptz,
  permanent boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_profile_id uuid references public.learning_profiles(id) on delete cascade,
  certificate_id text not null unique,
  learner_name text not null,
  path_name text not null,
  completion_date date not null,
  metadata jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_study_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_profile_id uuid references public.learning_profiles(id) on delete cascade,
  preferred_study_times text[] default '{}',
  average_session_length text,
  consistency integer default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.learning_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  category text not null,
  message text not null,
  context text,
  status text not null default 'New',
  created_at timestamptz not null default now()
);

create table if not exists public.learning_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  learner_profile_id uuid references public.learning_profiles(id) on delete cascade,
  event_type text not null,
  title text not null,
  summary text,
  occurred_at timestamptz not null default now()
);

create table if not exists public.learning_parent_links (
  id uuid primary key default gen_random_uuid(),
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  learner_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'invite pending',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique(parent_user_id, learner_user_id)
);

alter table public.learning_profiles enable row level security;
alter table public.learning_goals enable row level security;
alter table public.learning_plans enable row level security;
alter table public.learning_sessions enable row level security;
alter table public.learning_progress enable row level security;
alter table public.learning_mastery enable row level security;
alter table public.learning_achievements enable row level security;
alter table public.learning_certificates enable row level security;
alter table public.learning_study_habits enable row level security;
alter table public.learning_feedback enable row level security;
alter table public.learning_history enable row level security;
alter table public.learning_parent_links enable row level security;

create policy "Users manage own learning profiles"
on public.learning_profiles for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own learning goals"
on public.learning_goals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own learning plans"
on public.learning_plans for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own learning sessions"
on public.learning_sessions for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own learning progress"
on public.learning_progress for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own learning mastery"
on public.learning_mastery for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own learning achievements"
on public.learning_achievements for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own learning certificates"
on public.learning_certificates for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own learning study habits"
on public.learning_study_habits for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users manage own learning feedback"
on public.learning_feedback for all
using (auth.uid() = user_id or user_id is null)
with check (auth.uid() = user_id or user_id is null);

create policy "Users manage own learning history"
on public.learning_history for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Parents and learners can see links"
on public.learning_parent_links for select
using (auth.uid() = parent_user_id or auth.uid() = learner_user_id);

create policy "Parents can invite learners"
on public.learning_parent_links for insert
with check (auth.uid() = parent_user_id);

create policy "Parents and learners can update links"
on public.learning_parent_links for update
using (auth.uid() = parent_user_id or auth.uid() = learner_user_id)
with check (auth.uid() = parent_user_id or auth.uid() = learner_user_id);
