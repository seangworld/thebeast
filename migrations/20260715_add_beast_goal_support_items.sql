create unique index if not exists beast_goals_id_owner_id_unique_idx
on public.beast_goals (id, owner_id);

create table if not exists public.beast_goal_support_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  item_type text not null,
  title text not null,
  status text not null,
  summary text,
  cadence text,
  next_due_date date,
  resolved_at timestamptz,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_goal_support_items_goal_owner_fk foreign key (goal_id, owner_id)
    references public.beast_goals (id, owner_id) on delete cascade,
  constraint beast_goal_support_items_type_check check (
    item_type in ('Dependency', 'Prerequisite', 'Blocker', 'Recurring Action')
  ),
  constraint beast_goal_support_items_status_check check (
    status in ('Needed', 'In Progress', 'Satisfied', 'Blocked', 'Open', 'Resolved', 'Active', 'Paused')
  ),
  constraint beast_goal_support_items_cadence_check check (
    cadence is null or cadence in ('Daily', 'Weekly', 'Biweekly', 'Monthly', 'Custom')
  )
);

create index if not exists beast_goal_support_items_owner_goal_idx
on public.beast_goal_support_items (owner_id, goal_id, sort_order);

create index if not exists beast_goal_support_items_owner_type_status_idx
on public.beast_goal_support_items (owner_id, item_type, status);

create index if not exists beast_goal_support_items_next_due_idx
on public.beast_goal_support_items (owner_id, next_due_date)
where next_due_date is not null;

alter table public.beast_goal_support_items enable row level security;

drop policy if exists "Users manage own BeastOS goal support items"
on public.beast_goal_support_items;

create policy "Users manage own BeastOS goal support items"
on public.beast_goal_support_items for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
