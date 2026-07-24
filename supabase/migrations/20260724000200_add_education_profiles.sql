create table if not exists public.education_profiles (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  goal_kind text not null default 'career'
    check (goal_kind in ('career', 'education', 'certification', 'skill', 'personal-growth')),
  goal text not null default '',
  current_situation text not null default '',
  background text not null default '',
  strengths text not null default '',
  growth_areas text not null default '',
  constraints text not null default '',
  weekly_hours integer not null default 5
    check (weekly_hours between 0 and 168),
  discovery_answers jsonb not null default '{}'::jsonb
    check (jsonb_typeof(discovery_answers) = 'object'),
  selected_providers text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.education_profiles enable row level security;

drop policy if exists "Members manage own education profile" on public.education_profiles;
create policy "Members manage own education profile"
on public.education_profiles for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create or replace function public.set_education_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_education_profile_updated_at on public.education_profiles;
create trigger set_education_profile_updated_at
before update on public.education_profiles
for each row execute function public.set_education_profile_updated_at();

notify pgrst, 'reload schema';
