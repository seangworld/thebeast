-- BE-201: durable Education & Career planning records.
-- Historical learning data remains untouched. New records are owner-scoped and
-- document-derived proposals require explicit member approval.

create table if not exists public.education_career_profile_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  phase text not null check (phase in ('past', 'present', 'goal')),
  category text not null check (category in (
    'school', 'degree', 'coursework', 'certification', 'license', 'training',
    'military', 'employment', 'project', 'volunteer', 'leadership',
    'career_change', 'outcome', 'role', 'qualification', 'skill', 'strength',
    'interest', 'schedule', 'budget', 'family', 'geography', 'work_environment',
    'accessibility', 'occupation', 'employer_type', 'income', 'education_goal',
    'career_goal', 'timeline', 'constraint', 'other'
  )),
  label text not null check (length(trim(label)) between 1 and 200),
  value text not null check (length(trim(value)) between 1 and 4000),
  source_type text not null default 'member' check (source_type in (
    'member', 'conversation', 'form', 'document', 'goal', 'outcome', 'research'
  )),
  source_reference text,
  verification_status text not null default 'member_reported' check (
    verification_status in ('verified', 'member_reported', 'proposed', 'rejected')
  ),
  confidence numeric(4,3) not null default 1 check (confidence between 0 and 1),
  occurred_on date,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (id, owner_id)
);

create index if not exists education_career_profile_items_owner_phase_idx
  on public.education_career_profile_items (owner_id, phase, category, updated_at desc)
  where archived_at is null;

create table if not exists public.education_career_paths (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid,
  title text not null check (length(trim(title)) between 1 and 240),
  path_type text not null default 'other' check (path_type in (
    'promotion', 'federal', 'contractor', 'private_sector', 'college',
    'graduate_degree', 'certification', 'trade', 'licensure',
    'entrepreneurship', 'alternative_occupation', 'other'
  )),
  status text not null default 'candidate' check (
    status in ('candidate', 'preferred', 'rejected', 'archived')
  ),
  comparison jsonb not null default '{}'::jsonb check (jsonb_typeof(comparison) = 'object'),
  rationale text,
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  source_url text,
  source_name text,
  source_effective_on date,
  source_retrieved_at timestamptz,
  jurisdiction text,
  limitations text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_career_paths_goal_owner_fk foreign key (goal_id, owner_id)
    references public.beast_goals (id, owner_id) on delete set null (goal_id),
  unique (id, owner_id)
);

create index if not exists education_career_paths_owner_status_idx
  on public.education_career_paths (owner_id, status, updated_at desc);

create table if not exists public.education_career_roadmaps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid,
  preferred_path_id uuid,
  title text not null check (length(trim(title)) between 1 and 240),
  destination text not null default '',
  starting_point text not null default '',
  gap_summary text not null default '',
  status text not null default 'draft' check (
    status in ('draft', 'active', 'paused', 'completed', 'archived')
  ),
  version integer not null default 1 check (version > 0),
  progress integer not null default 0 check (progress between 0 and 100),
  pending_material_change jsonb,
  approved_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_career_roadmaps_goal_owner_fk foreign key (goal_id, owner_id)
    references public.beast_goals (id, owner_id) on delete set null (goal_id),
  constraint education_career_roadmaps_path_owner_fk foreign key (preferred_path_id, owner_id)
    references public.education_career_paths (id, owner_id) on delete set null (preferred_path_id),
  constraint education_career_roadmaps_pending_change_check check (
    pending_material_change is null or jsonb_typeof(pending_material_change) = 'object'
  ),
  unique (id, owner_id)
);

create table if not exists public.education_career_roadmap_steps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  roadmap_id uuid not null,
  goal_milestone_id uuid,
  title text not null check (length(trim(title)) between 1 and 240),
  description text not null default '',
  step_type text not null default 'action' check (step_type in (
    'education', 'certification', 'license', 'experience', 'project',
    'application', 'networking', 'resume', 'interview', 'decision', 'action'
  )),
  status text not null default 'not_started' check (
    status in ('not_started', 'in_progress', 'blocked', 'completed', 'skipped')
  ),
  sort_order integer not null default 0,
  target_date date,
  estimated_time text,
  estimated_cost text,
  dependencies jsonb not null default '[]'::jsonb check (jsonb_typeof(dependencies) = 'array'),
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  risks text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint education_career_roadmap_steps_roadmap_owner_fk foreign key (roadmap_id, owner_id)
    references public.education_career_roadmaps (id, owner_id) on delete cascade,
  constraint education_career_roadmap_steps_milestone_owner_fk foreign key (goal_milestone_id, owner_id)
    references public.beast_goal_milestones (id, owner_id) on delete set null (goal_milestone_id)
);

create index if not exists education_career_roadmap_steps_owner_order_idx
  on public.education_career_roadmap_steps (owner_id, roadmap_id, sort_order);

create table if not exists public.education_career_document_extractions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  document_id uuid not null references public.beast_documents(id) on delete cascade,
  content_fingerprint text not null check (content_fingerprint ~ '^[a-f0-9]{64}$'),
  extraction_version text not null,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  summary text check (summary is null or length(summary) <= 1000),
  error_message text check (error_message is null or length(error_message) <= 500),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (owner_id, document_id, content_fingerprint, extraction_version),
  unique (id, owner_id)
);

create table if not exists public.education_career_document_extraction_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  extraction_id uuid not null,
  phase text not null check (phase in ('past', 'present', 'goal')),
  category text not null check (category in (
    'school', 'degree', 'coursework', 'certification', 'license', 'training',
    'military', 'employment', 'project', 'volunteer', 'leadership',
    'career_change', 'outcome', 'role', 'qualification', 'skill', 'strength',
    'interest', 'schedule', 'budget', 'family', 'geography', 'work_environment',
    'accessibility', 'occupation', 'employer_type', 'income', 'education_goal',
    'career_goal', 'timeline', 'constraint', 'other'
  )),
  label text not null check (length(trim(label)) between 1 and 200),
  value text not null check (length(trim(value)) between 1 and 4000),
  occurred_on date,
  source_excerpt text check (source_excerpt is null or length(source_excerpt) <= 1000),
  confidence numeric(4,3) check (confidence is null or confidence between 0 and 1),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'merged')),
  approved_profile_item_id uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint education_career_extraction_items_extraction_owner_fk foreign key (extraction_id, owner_id)
    references public.education_career_document_extractions (id, owner_id) on delete cascade,
  constraint education_career_extraction_items_profile_owner_fk foreign key (approved_profile_item_id, owner_id)
    references public.education_career_profile_items (id, owner_id) on delete set null (approved_profile_item_id)
);

create index if not exists education_career_document_review_idx
  on public.education_career_document_extraction_items (owner_id, extraction_id, status, created_at);

create table if not exists public.education_career_outcomes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid,
  roadmap_id uuid,
  path_id uuid,
  event_type text not null check (event_type in (
    'path_considered', 'recommendation', 'decision', 'goal_created',
    'roadmap_approved', 'application', 'enrollment', 'credential_attempt',
    'credential_earned', 'interview', 'offer', 'promotion', 'rejection',
    'deferral', 'direction_change', 'reflection'
  )),
  title text not null check (length(trim(title)) between 1 and 240),
  detail text not null default '',
  occurred_at timestamptz not null default now(),
  source_type text not null default 'member',
  source_reference text,
  evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence) = 'array'),
  created_at timestamptz not null default now(),
  constraint education_career_outcomes_goal_owner_fk foreign key (goal_id, owner_id)
    references public.beast_goals (id, owner_id) on delete set null (goal_id),
  constraint education_career_outcomes_roadmap_owner_fk foreign key (roadmap_id, owner_id)
    references public.education_career_roadmaps (id, owner_id) on delete set null (roadmap_id),
  constraint education_career_outcomes_path_owner_fk foreign key (path_id, owner_id)
    references public.education_career_paths (id, owner_id) on delete set null (path_id)
);

create index if not exists education_career_outcomes_owner_time_idx
  on public.education_career_outcomes (owner_id, occurred_at desc);

alter table public.education_career_profile_items enable row level security;
alter table public.education_career_paths enable row level security;
alter table public.education_career_roadmaps enable row level security;
alter table public.education_career_roadmap_steps enable row level security;
alter table public.education_career_document_extractions enable row level security;
alter table public.education_career_document_extraction_items enable row level security;
alter table public.education_career_outcomes enable row level security;

create or replace function public.set_education_career_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_education_career_profile_items_updated_at
  before update on public.education_career_profile_items
  for each row execute function public.set_education_career_updated_at();
create trigger set_education_career_paths_updated_at
  before update on public.education_career_paths
  for each row execute function public.set_education_career_updated_at();
create trigger set_education_career_roadmaps_updated_at
  before update on public.education_career_roadmaps
  for each row execute function public.set_education_career_updated_at();
create trigger set_education_career_roadmap_steps_updated_at
  before update on public.education_career_roadmap_steps
  for each row execute function public.set_education_career_updated_at();

create policy "Members manage own education career profile items"
  on public.education_career_profile_items for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Members manage own education career paths"
  on public.education_career_paths for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Members manage own education career roadmaps"
  on public.education_career_roadmaps for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Members manage own education career roadmap steps"
  on public.education_career_roadmap_steps for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Members manage own education career document extractions"
  on public.education_career_document_extractions for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Members manage own education career document extraction items"
  on public.education_career_document_extraction_items for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Outcomes are append-only for members. Historical records cannot be rewritten.
create policy "Members read own education career outcomes"
  on public.education_career_outcomes for select to authenticated
  using (auth.uid() = owner_id);
create policy "Members append own education career outcomes"
  on public.education_career_outcomes for insert to authenticated
  with check (auth.uid() = owner_id);

create or replace function public.approve_education_career_document_item(
  requested_item_id uuid,
  merge_profile_item_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  proposed public.education_career_document_extraction_items%rowtype;
  extraction public.education_career_document_extractions%rowtype;
  source_document public.beast_documents%rowtype;
  result_id uuid;
begin
  select * into proposed from public.education_career_document_extraction_items
  where id = requested_item_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Education extraction proposal not found'; end if;
  if proposed.status <> 'pending' then raise exception 'Only pending proposals can be reviewed'; end if;

  select * into extraction from public.education_career_document_extractions
  where id = proposed.extraction_id and owner_id = auth.uid() and status = 'ready';
  if not found then raise exception 'Ready education extraction not found'; end if;
  select * into source_document from public.beast_documents
  where id = extraction.document_id and owner_id = auth.uid();
  if not found then raise exception 'Source document not found'; end if;

  if merge_profile_item_id is not null then
    update public.education_career_profile_items set
      value = proposed.value,
      occurred_on = coalesce(proposed.occurred_on, occurred_on),
      source_type = 'document',
      source_reference = source_document.id::text,
      verification_status = 'verified',
      confidence = coalesce(proposed.confidence, confidence),
      details = details || jsonb_build_object(
        'document_id', source_document.id,
        'extraction_id', extraction.id,
        'source_excerpt', proposed.source_excerpt,
        'owner_approved', true
      ),
      updated_at = now()
    where id = merge_profile_item_id and owner_id = auth.uid()
    returning id into result_id;
    if result_id is null then raise exception 'Merge target not found'; end if;
  else
    insert into public.education_career_profile_items (
      owner_id, phase, category, label, value, source_type, source_reference,
      verification_status, confidence, occurred_on, details
    ) values (
      auth.uid(), proposed.phase, proposed.category, proposed.label, proposed.value,
      'document', source_document.id::text, 'verified', coalesce(proposed.confidence, 1),
      proposed.occurred_on, jsonb_build_object(
        'document_id', source_document.id,
        'extraction_id', extraction.id,
        'extraction_item_id', proposed.id,
        'source_excerpt', proposed.source_excerpt,
        'owner_approved', true
      )
    ) returning id into result_id;
  end if;

  update public.education_career_document_extraction_items set
    status = case when merge_profile_item_id is null then 'approved' else 'merged' end,
    approved_profile_item_id = result_id,
    reviewed_at = now()
  where id = proposed.id and owner_id = auth.uid();
  return result_id;
end;
$$;

revoke all on function public.approve_education_career_document_item(uuid, uuid)
  from public, anon;
grant execute on function public.approve_education_career_document_item(uuid, uuid)
  to authenticated;

comment on table public.education_career_profile_items is
  'Durable owner-scoped Past, Present, and Goals facts with provenance and verification state.';
comment on table public.education_career_paths is
  'Candidate education and career paths with explicit comparison evidence, freshness, jurisdiction, and limitations.';
comment on table public.education_career_roadmaps is
  'Versioned member-approved plans. Guidance Counselor material changes remain pending until approval.';
comment on table public.education_career_outcomes is
  'Append-only education and career decisions and outcomes; later guidance may learn from but never rewrite them.';
comment on function public.approve_education_career_document_item(uuid, uuid) is
  'Accepts or merges one reviewed document proposal into the authoritative owner profile.';

notify pgrst, 'reload schema';
