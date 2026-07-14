create table if not exists public.beast_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'Other',
  status text not null default 'Proposed',
  summary text,
  target_date date,
  current_step text,
  source_module text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_goals_status_check check (
    status in ('Proposed', 'Active', 'Paused', 'Blocked', 'Completed', 'Archived')
  ),
  constraint beast_goals_category_check check (
    category in ('Education', 'Career', 'Money', 'Personal', 'Project', 'Home', 'Health', 'Other')
  )
);

alter table public.beast_goals enable row level security;

drop policy if exists "Users manage own BeastOS goals" on public.beast_goals;
create policy "Users manage own BeastOS goals"
on public.beast_goals for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
