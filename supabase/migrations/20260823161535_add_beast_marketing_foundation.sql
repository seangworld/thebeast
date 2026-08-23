begin;

create table public.beast_marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  objective text not null check (char_length(objective) between 1 and 1000),
  audience text not null check (char_length(audience) between 1 and 500),
  offer text not null check (char_length(offer) between 1 and 500),
  channels text[] not null default '{}',
  call_to_action text not null check (char_length(call_to_action) between 1 and 500),
  source_facts jsonb not null default '[]'::jsonb check (jsonb_typeof(source_facts) = 'array'),
  success_measures text[] not null default '{}',
  limitations text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'scheduled', 'active', 'paused', 'completed', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table public.beast_marketing_assets (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  asset_type text not null check (char_length(asset_type) between 1 and 80),
  channel text not null check (char_length(channel) between 1 and 80),
  body text not null check (char_length(body) between 1 and 12000),
  source_facts jsonb not null default '[]'::jsonb check (jsonb_typeof(source_facts) = 'array'),
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'rejected', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (campaign_id, owner_id) references public.beast_marketing_campaigns(id, owner_id) on delete cascade
);

create table public.beast_marketing_outcomes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  metric text not null check (metric in ('visits', 'downloads', 'registrations', 'activations', 'retained_users')),
  value numeric not null check (value >= 0),
  measured_at timestamptz not null default now(),
  source_label text not null check (char_length(source_label) between 1 and 240),
  source_url text check (source_url is null or source_url ~ '^https://'),
  notes text not null default '' check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  foreign key (campaign_id, owner_id) references public.beast_marketing_campaigns(id, owner_id) on delete cascade
);

create table public.beast_marketing_recommendations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  decision text not null check (decision in ('continue', 'modify', 'stop')),
  confidence text not null check (confidence in ('low', 'moderate', 'high')),
  rationale text[] not null default '{}',
  evidence text[] not null default '{}',
  limitations text[] not null default '{}',
  created_at timestamptz not null default now(),
  foreign key (campaign_id, owner_id) references public.beast_marketing_campaigns(id, owner_id) on delete cascade
);

create table public.beast_marketing_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (entity_type in ('campaign', 'asset')),
  entity_id uuid not null,
  decision text not null check (decision in ('approve', 'reject', 'request_changes')),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create index beast_marketing_campaigns_owner_updated_idx on public.beast_marketing_campaigns (owner_id, updated_at desc);
create index beast_marketing_assets_campaign_status_idx on public.beast_marketing_assets (campaign_id, owner_id, status);
create index beast_marketing_outcomes_campaign_measured_idx on public.beast_marketing_outcomes (campaign_id, owner_id, measured_at desc);
create index beast_marketing_recommendations_campaign_created_idx on public.beast_marketing_recommendations (campaign_id, owner_id, created_at desc);
create index beast_marketing_decisions_entity_created_idx on public.beast_marketing_decisions (owner_id, entity_type, entity_id, created_at desc);

create function public.set_beast_marketing_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_beast_marketing_campaign_updated_at
before update on public.beast_marketing_campaigns
for each row execute function public.set_beast_marketing_updated_at();

create trigger set_beast_marketing_asset_updated_at
before update on public.beast_marketing_assets
for each row execute function public.set_beast_marketing_updated_at();

alter table public.beast_marketing_campaigns enable row level security;
alter table public.beast_marketing_assets enable row level security;
alter table public.beast_marketing_outcomes enable row level security;
alter table public.beast_marketing_recommendations enable row level security;
alter table public.beast_marketing_decisions enable row level security;

create policy "BeastMarketing campaigns are owner only" on public.beast_marketing_campaigns
for all to authenticated
using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'))
with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

create policy "BeastMarketing assets are owner only" on public.beast_marketing_assets
for all to authenticated
using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'))
with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

create policy "BeastMarketing outcomes are owner only" on public.beast_marketing_outcomes
for all to authenticated
using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'))
with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

create policy "BeastMarketing recommendations are owner only" on public.beast_marketing_recommendations
for all to authenticated
using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'))
with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

create policy "BeastMarketing decisions are owner only" on public.beast_marketing_decisions
for all to authenticated
using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'))
with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

revoke all on table public.beast_marketing_campaigns from anon;
revoke all on table public.beast_marketing_assets from anon;
revoke all on table public.beast_marketing_outcomes from anon;
revoke all on table public.beast_marketing_recommendations from anon;
revoke all on table public.beast_marketing_decisions from anon;
grant select, insert, update, delete on table public.beast_marketing_campaigns to authenticated;
grant select, insert, update, delete on table public.beast_marketing_assets to authenticated;
grant select, insert, update, delete on table public.beast_marketing_outcomes to authenticated;
grant select, insert, update, delete on table public.beast_marketing_recommendations to authenticated;
grant select, insert, update, delete on table public.beast_marketing_decisions to authenticated;

create function public.record_beast_marketing_decision(
  selected_entity_type text,
  selected_entity_id uuid,
  selected_decision text,
  selected_status text,
  decision_note text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  decision_id uuid;
begin
  if selected_decision not in ('approve', 'reject', 'request_changes') then
    raise exception 'Invalid BeastMarketing decision';
  end if;

  if selected_entity_type = 'campaign' then
    if selected_status not in ('draft', 'review', 'approved', 'scheduled', 'active', 'paused', 'completed', 'archived') then
      raise exception 'Invalid campaign status';
    end if;
    update public.beast_marketing_campaigns
      set status = selected_status
      where id = selected_entity_id and owner_id = (select auth.uid());
  elsif selected_entity_type = 'asset' then
    if selected_status not in ('draft', 'review', 'approved', 'rejected', 'archived') then
      raise exception 'Invalid asset status';
    end if;
    update public.beast_marketing_assets
      set status = selected_status
      where id = selected_entity_id and owner_id = (select auth.uid());
  else
    raise exception 'Invalid BeastMarketing entity';
  end if;

  if not found then
    raise exception 'BeastMarketing record not found';
  end if;

  insert into public.beast_marketing_decisions (owner_id, entity_type, entity_id, decision, note)
  values ((select auth.uid()), selected_entity_type, selected_entity_id, selected_decision, left(coalesce(decision_note, ''), 1000))
  returning id into decision_id;

  return jsonb_build_object('id', decision_id, 'entityType', selected_entity_type, 'entityId', selected_entity_id, 'decision', selected_decision, 'status', selected_status);
end;
$$;

revoke all on function public.set_beast_marketing_updated_at() from public, anon, authenticated;
revoke all on function public.record_beast_marketing_decision(text, uuid, text, text, text) from public, anon;
grant execute on function public.record_beast_marketing_decision(text, uuid, text, text, text) to authenticated;

commit;
