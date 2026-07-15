create unique index if not exists beast_goals_id_owner_id_unique_idx
on public.beast_goals (id, owner_id);

create table if not exists public.beast_goal_contributions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  source_module text not null,
  contribution_type text not null,
  status text not null default 'Active',
  title text not null,
  summary text not null,
  action_url text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_goal_contributions_goal_owner_fk foreign key (goal_id, owner_id)
    references public.beast_goals (id, owner_id) on delete cascade,
  constraint beast_goal_contributions_type_check check (
    contribution_type in ('Progress', 'Recommendation', 'Milestone', 'Evidence', 'Review')
  ),
  constraint beast_goal_contributions_status_check check (
    status in ('Active', 'Dismissed', 'Archived')
  )
);

create index if not exists beast_goal_contributions_owner_goal_idx
on public.beast_goal_contributions (owner_id, goal_id, occurred_at desc);

create index if not exists beast_goal_contributions_owner_module_idx
on public.beast_goal_contributions (owner_id, source_module, contribution_type, status);

create index if not exists beast_goal_contributions_occurred_at_idx
on public.beast_goal_contributions (owner_id, occurred_at desc);

alter table public.beast_goal_contributions enable row level security;

drop policy if exists "Users manage own BeastOS goal contributions"
on public.beast_goal_contributions;

create policy "Users manage own BeastOS goal contributions"
on public.beast_goal_contributions for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
