create unique index if not exists beast_goals_id_owner_id_unique_idx
on public.beast_goals (id, owner_id);

create table if not exists public.beast_goal_references (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  reference_type text not null,
  title text not null,
  status text not null default 'Active',
  summary text,
  url text,
  reference_id text,
  reference_date date,
  source_module text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_goal_references_goal_owner_fk foreign key (goal_id, owner_id)
    references public.beast_goals (id, owner_id) on delete cascade,
  constraint beast_goal_references_type_check check (
    reference_type in ('Note', 'Document', 'Event', 'Module Record', 'Today', 'Calendar')
  ),
  constraint beast_goal_references_status_check check (
    status in ('Active', 'Archived')
  )
);

create index if not exists beast_goal_references_owner_goal_idx
on public.beast_goal_references (owner_id, goal_id, created_at desc);

create index if not exists beast_goal_references_owner_type_status_idx
on public.beast_goal_references (owner_id, reference_type, status);

create index if not exists beast_goal_references_reference_id_idx
on public.beast_goal_references (owner_id, reference_type, reference_id)
where reference_id is not null;

create index if not exists beast_goal_references_reference_date_idx
on public.beast_goal_references (owner_id, reference_date)
where reference_date is not null;

alter table public.beast_goal_references enable row level security;

drop policy if exists "Users manage own BeastOS goal references"
on public.beast_goal_references;

create policy "Users manage own BeastOS goal references"
on public.beast_goal_references for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);
