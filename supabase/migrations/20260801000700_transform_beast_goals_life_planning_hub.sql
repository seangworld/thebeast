-- BO-501: transform canonical BeastOS Goals into the shared Life Planning Hub.
-- Existing goal, milestone, support, reference, contribution, recommendation,
-- and lifecycle records remain authoritative and are not copied.

alter table public.beast_goals
  add column if not exists description text,
  add column if not exists priority text not null default 'Medium',
  add column if not exists timeline text,
  add column if not exists progress integer,
  add column if not exists notes text,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists linked_professional text,
  add column if not exists source_type text not null default 'member',
  add column if not exists source_label text not null default 'Member',
  add column if not exists source_reference text,
  add column if not exists custom_category text,
  add column if not exists archived_at timestamptz,
  add column if not exists deleted_at timestamptz;

alter table public.beast_goals
  drop constraint if exists beast_goals_category_check;
alter table public.beast_goals
  add constraint beast_goals_category_check check (
    category in ('Education', 'Career', 'Money', 'Personal', 'Project', 'Home', 'Health', 'Family', 'Other')
  );
alter table public.beast_goals
  drop constraint if exists beast_goals_priority_check;
alter table public.beast_goals
  add constraint beast_goals_priority_check check (
    priority in ('Low', 'Medium', 'High', 'Critical')
  );
alter table public.beast_goals
  drop constraint if exists beast_goals_progress_check;
alter table public.beast_goals
  add constraint beast_goals_progress_check check (
    progress is null or progress between 0 and 100
  );
alter table public.beast_goals
  drop constraint if exists beast_goals_source_type_check;
alter table public.beast_goals
  add constraint beast_goals_source_type_check check (
    source_type in ('member', 'professional', 'module', 'document', 'import', 'system')
  );
alter table public.beast_goals
  drop constraint if exists beast_goals_custom_category_check;
alter table public.beast_goals
  add constraint beast_goals_custom_category_check check (
    category <> 'Other' or custom_category is null or length(trim(custom_category)) between 1 and 100
  );

create index if not exists beast_goals_owner_planning_idx
  on public.beast_goals (owner_id, status, priority, target_date)
  where deleted_at is null;
create index if not exists beast_goals_owner_tags_idx
  on public.beast_goals using gin (tags);
create index if not exists beast_goals_owner_professional_idx
  on public.beast_goals (owner_id, linked_professional, updated_at desc)
  where linked_professional is not null and deleted_at is null;

create table if not exists public.beast_goal_field_sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  field_name text not null check (field_name in (
    'title', 'category', 'description', 'status', 'priority', 'timeline',
    'target_date', 'progress', 'current_step', 'notes', 'tags',
    'linked_professional'
  )),
  source_type text not null check (source_type in (
    'member', 'professional', 'module', 'document', 'import', 'system'
  )),
  source_label text not null check (length(trim(source_label)) between 1 and 160),
  source_module text,
  source_professional text,
  source_reference text,
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_goal_field_sources_goal_owner_fk foreign key (goal_id, owner_id)
    references public.beast_goals (id, owner_id) on delete cascade,
  unique (owner_id, goal_id, field_name)
);

create index if not exists beast_goal_field_sources_owner_goal_idx
  on public.beast_goal_field_sources (owner_id, goal_id, field_name);
create index if not exists beast_goal_field_sources_origin_idx
  on public.beast_goal_field_sources (owner_id, source_module, source_professional, updated_at desc);

alter table public.beast_goal_field_sources enable row level security;
drop policy if exists "Users manage own BeastOS goal field sources"
  on public.beast_goal_field_sources;
create policy "Users manage own BeastOS goal field sources"
  on public.beast_goal_field_sources for all to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

alter table public.beast_goal_lifecycle_events
  drop constraint if exists beast_goal_lifecycle_events_type_check;
alter table public.beast_goal_lifecycle_events
  add constraint beast_goal_lifecycle_events_type_check check (
    event_type in (
      'Completed', 'Abandoned', 'Revised', 'Archived', 'Superseded',
      'Created', 'Paused', 'Resumed', 'Merged', 'Split', 'Deleted'
    )
  );

create or replace function public.set_beast_goal_planning_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_beast_goals_planning_updated_at on public.beast_goals;
create trigger set_beast_goals_planning_updated_at
  before update on public.beast_goals
  for each row execute function public.set_beast_goal_planning_updated_at();
drop trigger if exists set_beast_goal_field_sources_updated_at on public.beast_goal_field_sources;
create trigger set_beast_goal_field_sources_updated_at
  before update on public.beast_goal_field_sources
  for each row execute function public.set_beast_goal_planning_updated_at();

comment on table public.beast_goals is
  'Canonical owner-controlled BeastOS Life Planning Hub. Specialist modules contribute without creating duplicate goal stores.';
comment on table public.beast_goal_field_sources is
  'Field-level provenance for canonical BeastOS goals. Values remain on beast_goals; this table records where each value came from.';
comment on column public.beast_goals.deleted_at is
  'Recoverable member deletion marker; records and lifecycle history remain available for audit.';

notify pgrst, 'reload schema';
