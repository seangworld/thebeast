begin;
-- Private manual workflow. No schedules, account seeds, provider calls or activation.
alter table public.beast_marketing_agency_bindings
 add column expected_account_id text,
 add column expected_username text,
 add column connection_version timestamptz,
 add column metrics jsonb,
 add column metrics_checked_at timestamptz,
 add column metrics_error text;
create unique index agency_unique_provider_account on public.beast_marketing_agency_bindings(owner_id,expected_account_id) where expected_account_id is not null;
create table public.beast_marketing_agency_posts (
 id uuid primary key, owner_id uuid not null references auth.users(id) on delete cascade,
 presenter_profile_id uuid not null, content jsonb not null,
 content_hash text not null, media_hash text not null default '',
 revision integer not null default 1 check(revision>0),
 status text not null default 'draft' check(status in ('draft','approved','queued','publishing','processing','published','failed','unknown','cancelled')),
 profile_hash text not null,account_snapshot jsonb,approval_hash text,approved_at timestamptz,
 unknown_stage text check(unknown_stage in ('prepare','publish','receipt')),
 container_id text,provider_post_id text unique,published_at timestamptz,last_error text,
 metrics jsonb,metrics_checked_at timestamptz,metrics_error text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(presenter_profile_id,owner_id) references public.beast_marketing_presenter_profiles(id,owner_id) on delete restrict,
 unique(owner_id,presenter_profile_id,content_hash),
 check(status<>'published' or (provider_post_id is not null and published_at is not null))
);
alter table public.beast_marketing_agency_posts enable row level security;
revoke all on public.beast_marketing_agency_posts from public,anon,authenticated;
grant select,insert,update on public.beast_marketing_agency_posts to service_role;
-- No generic social_posts row is created: existing disabled marketing cron cannot consume Agency drafts.
commit;
