-- Persistent execution history for BeastAgents and Digital Professionals.
-- Additive only. Rollback: drop the RPCs, trigger/function, indexes, and the
-- execution_* / recommendation_* tables in reverse dependency order.

create table if not exists public.execution_requests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  professional_id text not null check (length(trim(professional_id)) > 0),
  request_type text not null check (length(trim(request_type)) > 0),
  title text not null check (length(trim(title)) > 0),
  status text not null default 'queued' check (status in (
    'queued', 'analyzing', 'awaiting_context', 'awaiting_approval', 'approved',
    'executing', 'completed', 'partially_completed', 'blocked', 'failed', 'canceled'
  )),
  action_classification text not null check (action_classification in (
    'informational', 'recommendation_only', 'member_confirmed', 'owner_approved', 'prohibited'
  )),
  context_references jsonb not null default '[]'::jsonb check (jsonb_typeof(context_references) = 'array'),
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.execution_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.execution_requests(id) on delete cascade,
  revision integer not null default 1 check (revision > 0),
  summary text not null check (length(trim(summary)) > 0),
  confidence jsonb not null,
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  supporting_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(supporting_evidence) = 'array'),
  created_at timestamptz not null default now(),
  unique (request_id, revision)
);

create table if not exists public.execution_steps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.execution_requests(id) on delete cascade,
  plan_id uuid not null references public.execution_plans(id) on delete cascade,
  position integer not null check (position > 0),
  title text not null check (length(trim(title)) > 0),
  status text not null default 'queued' check (status in (
    'queued', 'analyzing', 'awaiting_context', 'awaiting_approval', 'approved',
    'executing', 'completed', 'partially_completed', 'blocked', 'failed', 'canceled'
  )),
  action_classification text not null check (action_classification in (
    'informational', 'recommendation_only', 'member_confirmed', 'owner_approved', 'prohibited'
  )),
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  supporting_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(supporting_evidence) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, position)
);

create table if not exists public.execution_approvals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.execution_requests(id) on delete cascade,
  step_id uuid references public.execution_steps(id) on delete cascade,
  decision_scope text not null check (decision_scope in ('member', 'owner')),
  decision text not null check (decision in ('approved', 'declined', 'deferred', 'revoked')),
  decided_by uuid not null references auth.users(id),
  reason text,
  limitations_acknowledged jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations_acknowledged) = 'array'),
  decided_at timestamptz not null default now()
);

create table if not exists public.execution_results (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.execution_requests(id) on delete cascade,
  step_id uuid references public.execution_steps(id) on delete cascade,
  result_status text not null check (result_status in (
    'completed', 'partially_completed', 'blocked', 'failed', 'canceled'
  )),
  summary text not null check (length(trim(summary)) > 0),
  output jsonb not null default '{}'::jsonb,
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  supporting_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(supporting_evidence) = 'array'),
  external_action_verified boolean not null default false,
  recorded_at timestamptz not null default now()
);

create table if not exists public.execution_outcomes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.execution_requests(id) on delete cascade,
  result_id uuid references public.execution_results(id) on delete set null,
  outcome_status text not null check (outcome_status in ('successful', 'neutral', 'unsuccessful', 'inconclusive')),
  expected_result jsonb not null,
  actual_result jsonb,
  member_learning jsonb not null default '[]'::jsonb check (jsonb_typeof(member_learning) = 'array'),
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  supporting_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(supporting_evidence) = 'array'),
  observed_at timestamptz,
  recorded_at timestamptz not null default now()
);

create table if not exists public.execution_recommendations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.execution_requests(id) on delete cascade,
  professional_id text not null,
  supersedes_id uuid references public.execution_recommendations(id) on delete set null,
  title text not null check (length(trim(title)) > 0),
  recommendation text not null check (length(trim(recommendation)) > 0),
  status text not null default 'proposed' check (status in (
    'proposed', 'accepted', 'declined', 'deferred', 'superseded', 'completed'
  )),
  confidence jsonb not null,
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  supporting_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(supporting_evidence) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recommendation_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  recommendation_id uuid not null references public.execution_recommendations(id) on delete cascade,
  previous_status text,
  status text not null check (status in (
    'proposed', 'accepted', 'declined', 'deferred', 'superseded', 'completed'
  )),
  decision_scope text check (decision_scope in ('member', 'owner', 'system')),
  decided_by uuid references auth.users(id),
  reason text,
  occurred_at timestamptz not null default now()
);

create table if not exists public.execution_confidence_history (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.execution_requests(id) on delete cascade,
  recommendation_id uuid references public.execution_recommendations(id) on delete cascade,
  confidence jsonb not null,
  limitations jsonb not null default '[]'::jsonb check (jsonb_typeof(limitations) = 'array'),
  supporting_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(supporting_evidence) = 'array'),
  reason text not null check (length(trim(reason)) > 0),
  recorded_at timestamptz not null default now()
);

create table if not exists public.execution_follow_ups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.execution_requests(id) on delete cascade,
  recommendation_id uuid references public.execution_recommendations(id) on delete set null,
  outcome_id uuid references public.execution_outcomes(id) on delete set null,
  status text not null check (status in ('scheduled', 'due', 'completed', 'canceled')),
  purpose text not null check (length(trim(purpose)) > 0),
  due_at timestamptz,
  completed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.execution_audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.execution_requests(id) on delete cascade,
  actor_id uuid references auth.users(id),
  actor_type text not null check (actor_type in ('member', 'owner', 'professional', 'system')),
  event_type text not null check (length(trim(event_type)) > 0),
  previous_status text,
  status text,
  decision jsonb not null default '{}'::jsonb,
  supporting_evidence jsonb not null default '[]'::jsonb check (jsonb_typeof(supporting_evidence) = 'array'),
  occurred_at timestamptz not null default now()
);

create index if not exists execution_requests_owner_status_updated_idx
  on public.execution_requests (owner_id, status, updated_at desc);
create index if not exists execution_steps_request_position_idx
  on public.execution_steps (request_id, position);
create index if not exists execution_approvals_request_decided_idx
  on public.execution_approvals (request_id, decided_at desc);
create index if not exists execution_results_request_recorded_idx
  on public.execution_results (request_id, recorded_at desc);
create index if not exists execution_outcomes_request_recorded_idx
  on public.execution_outcomes (request_id, recorded_at desc);
create index if not exists execution_recommendations_owner_status_updated_idx
  on public.execution_recommendations (owner_id, status, updated_at desc);
create index if not exists recommendation_lifecycle_recommendation_time_idx
  on public.recommendation_lifecycle_events (recommendation_id, occurred_at);
create index if not exists execution_confidence_request_time_idx
  on public.execution_confidence_history (request_id, recorded_at);
create index if not exists execution_follow_ups_owner_status_due_idx
  on public.execution_follow_ups (owner_id, status, due_at);
create index if not exists execution_audit_request_time_idx
  on public.execution_audit_events (request_id, occurred_at);

alter table public.execution_requests enable row level security;
alter table public.execution_plans enable row level security;
alter table public.execution_steps enable row level security;
alter table public.execution_approvals enable row level security;
alter table public.execution_results enable row level security;
alter table public.execution_outcomes enable row level security;
alter table public.execution_recommendations enable row level security;
alter table public.recommendation_lifecycle_events enable row level security;
alter table public.execution_confidence_history enable row level security;
alter table public.execution_follow_ups enable row level security;
alter table public.execution_audit_events enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'execution_requests', 'execution_plans', 'execution_steps', 'execution_approvals',
    'execution_results', 'execution_outcomes', 'execution_recommendations',
    'recommendation_lifecycle_events', 'execution_confidence_history',
    'execution_follow_ups', 'execution_audit_events'
  ]
  loop
    execute format(
      'create policy "Members read own %1$s" on public.%1$I for select using (auth.uid() = owner_id)',
      table_name
    );
    if table_name not in (
      'execution_approvals', 'recommendation_lifecycle_events',
      'execution_confidence_history', 'execution_audit_events'
    ) then
      execute format(
        'create policy "Members create own %1$s" on public.%1$I for insert with check (auth.uid() = owner_id)',
        table_name
      );
    end if;
    execute format(
      'create policy "BeastAdmin reads all %1$s" on public.%1$I for select using (exists (select 1 from public.profiles where id = auth.uid() and role = ''admin''))',
      table_name
    );
  end loop;
end $$;

create policy "Members create member-scoped approvals"
  on public.execution_approvals for insert
  with check (
    auth.uid() = owner_id
    and auth.uid() = decided_by
    and decision_scope = 'member'
  );

create policy "BeastAdmin creates owner-scoped approvals"
  on public.execution_approvals for insert
  with check (
    decision_scope = 'owner'
    and decided_by = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Members update own execution steps"
  on public.execution_steps for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create or replace function public.prevent_execution_history_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  raise exception 'Execution history records are immutable';
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'execution_approvals', 'execution_results', 'execution_outcomes',
    'recommendation_lifecycle_events', 'execution_confidence_history',
    'execution_follow_ups', 'execution_audit_events'
  ]
  loop
    execute format('drop trigger if exists protect_%1$s_history on public.%1$I', table_name);
    execute format(
      'create trigger protect_%1$s_history before update or delete on public.%1$I for each row execute function public.prevent_execution_history_mutation()',
      table_name
    );
  end loop;
end $$;

create or replace function public.record_initial_recommendation_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.recommendation_lifecycle_events (
    owner_id, recommendation_id, previous_status, status, decision_scope
  ) values (new.owner_id, new.id, null, new.status, 'system');
  insert into public.execution_confidence_history (
    owner_id, request_id, recommendation_id, confidence, limitations,
    supporting_evidence, reason
  ) values (
    new.owner_id, new.request_id, new.id, new.confidence, new.limitations,
    new.supporting_evidence, 'Initial recommendation confidence'
  );
  insert into public.execution_audit_events (
    owner_id, request_id, actor_type, event_type, status, decision,
    supporting_evidence
  ) values (
    new.owner_id, new.request_id, 'professional', 'recommendation_proposed',
    new.status, jsonb_build_object('recommendationId', new.id),
    new.supporting_evidence
  );
  return new;
end;
$$;

drop trigger if exists record_initial_recommendation_history
  on public.execution_recommendations;
create trigger record_initial_recommendation_history
  after insert on public.execution_recommendations
  for each row execute function public.record_initial_recommendation_history();

create or replace function public.record_execution_evidence_audit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'execution_approvals' then
    insert into public.execution_audit_events (
      owner_id, request_id, actor_id, actor_type, event_type, decision
    ) values (
      new.owner_id, new.request_id, new.decided_by,
      case when new.decision_scope = 'owner' then 'owner' else 'member' end,
      'approval_recorded',
      jsonb_build_object('scope', new.decision_scope, 'decision', new.decision, 'reason', new.reason)
    );
  elsif tg_table_name = 'execution_results' then
    insert into public.execution_audit_events (
      owner_id, request_id, actor_type, event_type, status, decision,
      supporting_evidence
    ) values (
      new.owner_id, new.request_id, 'professional', 'result_recorded',
      new.result_status,
      jsonb_build_object('resultId', new.id, 'externalActionVerified', new.external_action_verified),
      new.supporting_evidence
    );
  elsif tg_table_name = 'execution_outcomes' then
    insert into public.execution_audit_events (
      owner_id, request_id, actor_type, event_type, decision,
      supporting_evidence
    ) values (
      new.owner_id, new.request_id, 'system', 'outcome_recorded',
      jsonb_build_object('outcomeId', new.id, 'outcomeStatus', new.outcome_status),
      new.supporting_evidence
    );
  end if;
  return new;
end;
$$;

drop trigger if exists audit_execution_approval on public.execution_approvals;
create trigger audit_execution_approval after insert on public.execution_approvals
  for each row execute function public.record_execution_evidence_audit();
drop trigger if exists audit_execution_result on public.execution_results;
create trigger audit_execution_result after insert on public.execution_results
  for each row execute function public.record_execution_evidence_audit();
drop trigger if exists audit_execution_outcome on public.execution_outcomes;
create trigger audit_execution_outcome after insert on public.execution_outcomes
  for each row execute function public.record_execution_evidence_audit();

create or replace function public.create_execution_request(
  selected_professional_id text,
  selected_request_type text,
  selected_title text,
  selected_action_classification text,
  selected_context_references jsonb default '[]'::jsonb,
  selected_limitations jsonb default '[]'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare created_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  insert into public.execution_requests (
    owner_id, professional_id, request_type, title, action_classification,
    context_references, limitations
  ) values (
    auth.uid(), selected_professional_id, selected_request_type, selected_title,
    selected_action_classification, selected_context_references, selected_limitations
  ) returning id into created_id;
  insert into public.execution_audit_events (
    owner_id, request_id, actor_id, actor_type, event_type, status, decision
  ) values (
    auth.uid(), created_id, auth.uid(), 'member', 'request_created', 'queued',
    jsonb_build_object('actionClassification', selected_action_classification)
  );
  return created_id;
end;
$$;

create or replace function public.transition_execution_request(
  selected_request_id uuid,
  next_status text,
  selected_actor_type text,
  selected_decision jsonb default '{}'::jsonb,
  selected_supporting_evidence jsonb default '[]'::jsonb
) returns public.execution_requests
language plpgsql security definer set search_path = public as $$
declare current_request public.execution_requests%rowtype;
declare allowed boolean := false;
declare prior_status text;
declare verified_actor_type text;
begin
  select * into current_request from public.execution_requests
  where id = selected_request_id and owner_id = auth.uid() for update;
  if not found then raise exception 'Execution request is not available for this owner'; end if;
  prior_status := current_request.status;
  verified_actor_type := case when exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then 'owner' else 'member' end;
  if selected_actor_type not in ('member', 'owner') or selected_actor_type <> verified_actor_type then
    raise exception 'Execution actor type does not match the authenticated role';
  end if;
  allowed := case current_request.status
    when 'queued' then next_status in ('analyzing', 'canceled')
    when 'analyzing' then next_status in ('awaiting_context', 'awaiting_approval', 'approved', 'blocked', 'failed', 'canceled')
    when 'awaiting_context' then next_status in ('analyzing', 'blocked', 'canceled')
    when 'awaiting_approval' then next_status in ('approved', 'blocked', 'canceled')
    when 'approved' then next_status in ('executing', 'canceled')
    when 'executing' then next_status in ('completed', 'partially_completed', 'blocked', 'failed')
    else false end;
  if not allowed then raise exception 'Invalid execution status transition'; end if;
  update public.execution_requests
  set status = next_status, updated_at = now()
  where id = selected_request_id returning * into current_request;
  insert into public.execution_audit_events (
    owner_id, request_id, actor_id, actor_type, event_type,
    previous_status, status, decision, supporting_evidence
  ) values (
    current_request.owner_id, current_request.id, auth.uid(), verified_actor_type,
    'status_transition', prior_status, next_status,
    selected_decision, selected_supporting_evidence
  );
  return current_request;
end;
$$;

create or replace function public.transition_execution_recommendation(
  selected_recommendation_id uuid,
  next_status text,
  selected_reason text default null,
  selected_confidence jsonb default null,
  selected_limitations jsonb default null,
  selected_supporting_evidence jsonb default null
) returns public.execution_recommendations
language plpgsql security definer set search_path = public as $$
declare current_recommendation public.execution_recommendations%rowtype;
declare prior_status text;
declare decision_scope text;
begin
  select * into current_recommendation
  from public.execution_recommendations
  where id = selected_recommendation_id and owner_id = auth.uid()
  for update;
  if not found then raise exception 'Recommendation is not available for this owner'; end if;
  prior_status := current_recommendation.status;
  if not (
    (prior_status = 'proposed' and next_status in ('accepted', 'declined', 'deferred', 'superseded')) or
    (prior_status = 'deferred' and next_status in ('accepted', 'declined', 'superseded')) or
    (prior_status = 'accepted' and next_status in ('completed', 'superseded'))
  ) then raise exception 'Invalid recommendation status transition'; end if;
  decision_scope := case when exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then 'owner' else 'member' end;
  update public.execution_recommendations set
    status = next_status,
    confidence = coalesce(selected_confidence, confidence),
    limitations = coalesce(selected_limitations, limitations),
    supporting_evidence = coalesce(selected_supporting_evidence, supporting_evidence),
    updated_at = now()
  where id = selected_recommendation_id
  returning * into current_recommendation;
  insert into public.recommendation_lifecycle_events (
    owner_id, recommendation_id, previous_status, status,
    decision_scope, decided_by, reason
  ) values (
    current_recommendation.owner_id, current_recommendation.id, prior_status,
    next_status, decision_scope, auth.uid(), selected_reason
  );
  if selected_confidence is not null then
    insert into public.execution_confidence_history (
      owner_id, request_id, recommendation_id, confidence, limitations,
      supporting_evidence, reason
    ) values (
      current_recommendation.owner_id, current_recommendation.request_id,
      current_recommendation.id, current_recommendation.confidence,
      current_recommendation.limitations, current_recommendation.supporting_evidence,
      coalesce(nullif(trim(selected_reason), ''), 'Recommendation confidence updated')
    );
  end if;
  return current_recommendation;
end;
$$;

revoke all on function public.create_execution_request(text, text, text, text, jsonb, jsonb) from public;
revoke all on function public.transition_execution_request(uuid, text, text, jsonb, jsonb) from public;
revoke all on function public.transition_execution_recommendation(uuid, text, text, jsonb, jsonb, jsonb) from public;
revoke update, delete on public.execution_requests from authenticated;
revoke update, delete on public.execution_recommendations from authenticated;
revoke update, delete on public.execution_follow_ups from authenticated;
grant execute on function public.create_execution_request(text, text, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.transition_execution_request(uuid, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.transition_execution_recommendation(uuid, text, text, jsonb, jsonb, jsonb) to authenticated;
