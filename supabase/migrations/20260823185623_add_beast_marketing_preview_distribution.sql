begin;

create table public.beast_marketing_ad_variants (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  placement_profile_id text not null check (placement_profile_id in ('meta_feed', 'instagram_story_reel', 'x_post', 'linkedin_feed', 'google_search', 'general_display')),
  platform text not null check (char_length(platform) between 1 and 80),
  placement text not null check (char_length(placement) between 1 and 80),
  headline text not null default '' check (char_length(headline) <= 500),
  primary_text text not null default '' check (char_length(primary_text) <= 5000),
  description text not null default '' check (char_length(description) <= 1000),
  call_to_action text not null check (char_length(call_to_action) between 1 and 80),
  destination_url text not null check (destination_url ~ '^https://'),
  media_url text check (media_url is null or media_url ~ '^https://'),
  media_type text not null default 'none' check (media_type in ('none', 'image', 'video')),
  media_alt_text text not null default '' check (char_length(media_alt_text) <= 500),
  source_facts jsonb not null default '[]'::jsonb check (jsonb_typeof(source_facts) = 'array' and jsonb_array_length(source_facts) > 0),
  limitations text[] not null default '{}',
  revision integer not null default 1 check (revision > 0),
  revision_hash text not null check (revision_hash ~ '^fnv1a32:[0-9a-f]{8}$'),
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'rejected', 'archived')),
  approved_revision integer,
  approved_revision_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  unique (id, campaign_id, owner_id),
  foreign key (campaign_id, owner_id) references public.beast_marketing_campaigns(id, owner_id) on delete cascade,
  check ((approved_revision is null and approved_revision_hash is null) or (approved_revision = revision and approved_revision_hash = revision_hash)),
  check (status = 'approved' or (approved_revision is null and approved_revision_hash is null))
);

create table public.beast_marketing_ad_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null,
  revision integer not null check (revision > 0),
  revision_hash text not null check (revision_hash ~ '^fnv1a32:[0-9a-f]{8}$'),
  decision text not null check (decision in ('approve', 'reject', 'request_changes')),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  foreign key (variant_id, owner_id) references public.beast_marketing_ad_variants(id, owner_id) on delete cascade
);

create table public.beast_marketing_distribution_plans (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null,
  variant_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  variant_revision integer not null check (variant_revision > 0),
  variant_revision_hash text not null check (variant_revision_hash ~ '^fnv1a32:[0-9a-f]{8}$'),
  platform text not null check (char_length(platform) between 1 and 80),
  placement text not null check (char_length(placement) between 1 and 80),
  planned_for timestamptz not null,
  timezone text not null check (char_length(timezone) between 1 and 100),
  status text not null default 'draft' check (status in ('draft', 'ready', 'exported', 'cancelled')),
  owner_notes text not null default '' check (char_length(owner_notes) <= 2000),
  handoff_payload jsonb check (handoff_payload is null or jsonb_typeof(handoff_payload) = 'object'),
  exported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id),
  foreign key (campaign_id, owner_id) references public.beast_marketing_campaigns(id, owner_id) on delete cascade,
  foreign key (variant_id, campaign_id, owner_id) references public.beast_marketing_ad_variants(id, campaign_id, owner_id) on delete cascade,
  check ((status = 'exported' and handoff_payload is not null and exported_at is not null) or status <> 'exported')
);

create index beast_marketing_ad_variants_campaign_updated_idx on public.beast_marketing_ad_variants (campaign_id, owner_id, updated_at desc);
create index beast_marketing_ad_decisions_variant_created_idx on public.beast_marketing_ad_decisions (variant_id, owner_id, created_at desc);
create index beast_marketing_distribution_plans_campaign_time_idx on public.beast_marketing_distribution_plans (campaign_id, owner_id, planned_for);

create function public.prepare_beast_marketing_ad_revision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if row(
    new.placement_profile_id, new.platform, new.placement, new.headline,
    new.primary_text, new.description, new.call_to_action, new.destination_url,
    new.media_url, new.media_type, new.media_alt_text, new.source_facts, new.limitations
  ) is distinct from row(
    old.placement_profile_id, old.platform, old.placement, old.headline,
    old.primary_text, old.description, old.call_to_action, old.destination_url,
    old.media_url, old.media_type, old.media_alt_text, old.source_facts, old.limitations
  ) then
    new.revision = old.revision + 1;
    new.status = 'draft';
    new.approved_revision = null;
    new.approved_revision_hash = null;
    update public.beast_marketing_distribution_plans
      set status = 'draft', handoff_payload = null, exported_at = null
      where variant_id = old.id
        and owner_id = old.owner_id
        and variant_revision = old.revision
        and variant_revision_hash = old.revision_hash
        and status in ('ready', 'exported');
  else
    new.revision = old.revision;
    new.revision_hash = old.revision_hash;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger prepare_beast_marketing_ad_revision
before update on public.beast_marketing_ad_variants
for each row execute function public.prepare_beast_marketing_ad_revision();

create trigger set_beast_marketing_distribution_plan_updated_at
before update on public.beast_marketing_distribution_plans
for each row execute function public.set_beast_marketing_updated_at();

create function public.record_beast_marketing_ad_decision(
  selected_variant_id uuid,
  selected_revision integer,
  selected_revision_hash text,
  selected_decision text,
  decision_note text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  decision_id uuid;
  next_status text;
begin
  if selected_decision not in ('approve', 'reject', 'request_changes') then
    raise exception 'Invalid BeastMarketing ad decision';
  end if;

  next_status := case when selected_decision = 'approve' then 'approved' when selected_decision = 'reject' then 'rejected' else 'draft' end;

  update public.beast_marketing_ad_variants
    set status = next_status,
        approved_revision = case when selected_decision = 'approve' then revision else null end,
        approved_revision_hash = case when selected_decision = 'approve' then revision_hash else null end
    where id = selected_variant_id
      and owner_id = (select auth.uid())
      and revision = selected_revision
      and revision_hash = selected_revision_hash;

  if not found then
    raise exception 'BeastMarketing ad revision changed or was not found';
  end if;

  insert into public.beast_marketing_ad_decisions (owner_id, variant_id, revision, revision_hash, decision, note)
  values ((select auth.uid()), selected_variant_id, selected_revision, selected_revision_hash, selected_decision, left(coalesce(decision_note, ''), 1000))
  returning id into decision_id;

  return jsonb_build_object('id', decision_id, 'variantId', selected_variant_id, 'revision', selected_revision, 'revisionHash', selected_revision_hash, 'decision', selected_decision, 'status', next_status);
end;
$$;

alter table public.beast_marketing_ad_variants enable row level security;
alter table public.beast_marketing_ad_decisions enable row level security;
alter table public.beast_marketing_distribution_plans enable row level security;

create policy "BeastMarketing ad variants are owner only" on public.beast_marketing_ad_variants
for all to authenticated
using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'))
with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

create policy "BeastMarketing ad decisions are owner only" on public.beast_marketing_ad_decisions
for all to authenticated
using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'))
with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

create policy "BeastMarketing distribution plans are owner only" on public.beast_marketing_distribution_plans
for all to authenticated
using ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'))
with check ((select auth.uid()) = owner_id and exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin'));

revoke all on table public.beast_marketing_ad_variants from public, anon, authenticated;
revoke all on table public.beast_marketing_ad_decisions from public, anon, authenticated;
revoke all on table public.beast_marketing_distribution_plans from public, anon, authenticated;
grant select, insert, update, delete on table public.beast_marketing_ad_variants to authenticated;
grant select, insert, update, delete on table public.beast_marketing_ad_decisions to authenticated;
grant select, insert, update, delete on table public.beast_marketing_distribution_plans to authenticated;

revoke all on function public.prepare_beast_marketing_ad_revision() from public, anon, authenticated;
revoke all on function public.record_beast_marketing_ad_decision(uuid, integer, text, text, text) from public, anon;
grant execute on function public.record_beast_marketing_ad_decision(uuid, integer, text, text, text) to authenticated;

commit;
