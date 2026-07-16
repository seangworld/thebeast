create unique index if not exists beast_goals_id_owner_id_unique_idx
on public.beast_goals (id, owner_id);

create table if not exists public.beast_goal_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  event_type text not null,
  title text not null,
  reason text,
  previous_status text,
  next_status text,
  superseded_by_goal_id uuid,
  source_module text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_goal_lifecycle_events_goal_owner_fk foreign key (goal_id, owner_id)
    references public.beast_goals (id, owner_id) on delete cascade,
  constraint beast_goal_lifecycle_events_superseded_owner_fk foreign key (superseded_by_goal_id, owner_id)
    references public.beast_goals (id, owner_id),
  constraint beast_goal_lifecycle_events_type_check check (
    event_type in ('Completed', 'Abandoned', 'Revised', 'Archived', 'Superseded')
  ),
  constraint beast_goal_lifecycle_events_previous_status_check check (
    previous_status is null
    or previous_status in ('Proposed', 'Active', 'Paused', 'Blocked', 'Completed', 'Archived')
  ),
  constraint beast_goal_lifecycle_events_next_status_check check (
    next_status is null
    or next_status in ('Proposed', 'Active', 'Paused', 'Blocked', 'Completed', 'Archived')
  ),
  constraint beast_goal_lifecycle_events_superseded_check check (
    (event_type = 'Superseded' and superseded_by_goal_id is not null)
    or (event_type <> 'Superseded')
  )
);

create index if not exists beast_goal_lifecycle_events_owner_goal_idx
on public.beast_goal_lifecycle_events (owner_id, goal_id, occurred_at desc);

create index if not exists beast_goal_lifecycle_events_owner_type_idx
on public.beast_goal_lifecycle_events (owner_id, event_type, occurred_at desc);

alter table public.beast_goal_lifecycle_events enable row level security;

drop policy if exists "Users manage own BeastOS goal lifecycle events"
on public.beast_goal_lifecycle_events;

create policy "Users manage own BeastOS goal lifecycle events"
on public.beast_goal_lifecycle_events for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
