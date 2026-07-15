create unique index if not exists beast_goals_id_owner_id_unique_idx
on public.beast_goals (id, owner_id);

create table if not exists public.beast_goal_recommendations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  source_module text,
  recommendation_type text not null,
  status text not null default 'Suggested',
  title text not null,
  reason text not null,
  action_label text,
  action_url text,
  review_due_date date,
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_goal_recommendations_goal_owner_fk foreign key (goal_id, owner_id)
    references public.beast_goals (id, owner_id) on delete cascade,
  constraint beast_goal_recommendations_type_check check (
    recommendation_type in ('Next Action', 'Review', 'Milestone', 'Risk', 'Opportunity')
  ),
  constraint beast_goal_recommendations_status_check check (
    status in ('Suggested', 'Accepted', 'Dismissed', 'Completed', 'Archived')
  ),
  constraint beast_goal_recommendations_dismissed_check check (
    (status = 'Dismissed' and dismissed_at is not null)
    or (status <> 'Dismissed')
  )
);

create index if not exists beast_goal_recommendations_owner_goal_idx
on public.beast_goal_recommendations (owner_id, goal_id, created_at desc);

create index if not exists beast_goal_recommendations_owner_status_idx
on public.beast_goal_recommendations (owner_id, status, recommendation_type);

create index if not exists beast_goal_recommendations_review_due_idx
on public.beast_goal_recommendations (owner_id, review_due_date)
where review_due_date is not null;

alter table public.beast_goal_recommendations enable row level security;

drop policy if exists "Users manage own BeastOS goal recommendations"
on public.beast_goal_recommendations;

create policy "Users manage own BeastOS goal recommendations"
on public.beast_goal_recommendations for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
