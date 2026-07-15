create unique index if not exists beast_goals_id_owner_id_unique_idx
on public.beast_goals (id, owner_id);

create table if not exists public.beast_goal_milestones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  title text not null,
  status text not null default 'Not Started',
  target_date date,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_goal_milestones_goal_owner_fk foreign key (goal_id, owner_id)
    references public.beast_goals (id, owner_id) on delete cascade,
  constraint beast_goal_milestones_status_check check (
    status in ('Not Started', 'In Progress', 'Completed', 'Skipped')
  )
);

create index if not exists beast_goal_milestones_owner_goal_idx
on public.beast_goal_milestones (owner_id, goal_id, sort_order);

create index if not exists beast_goal_milestones_status_idx
on public.beast_goal_milestones (owner_id, status);

alter table public.beast_goal_milestones enable row level security;

drop policy if exists "Users manage own BeastOS goal milestones"
on public.beast_goal_milestones;

create policy "Users manage own BeastOS goal milestones"
on public.beast_goal_milestones for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
