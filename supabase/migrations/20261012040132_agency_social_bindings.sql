begin;
-- Review-only candidate. No talent names, account IDs, tokens, seeds, or grants to public clients.
create table public.beast_marketing_agency_bindings (
  owner_id uuid not null references auth.users(id) on delete cascade,
  presenter_profile_id uuid not null,
  connection_id uuid not null,
  channel text not null check (channel in ('instagram', 'facebook_page', 'x')),
  created_at timestamptz not null default now(),
  primary key (owner_id, presenter_profile_id, channel),
  unique (owner_id, connection_id),
  foreign key (presenter_profile_id, owner_id)
    references public.beast_marketing_presenter_profiles(id, owner_id) on delete cascade,
  foreign key (connection_id, owner_id)
    references public.beast_marketing_social_connections(id, owner_id) on delete restrict
);
alter table public.beast_marketing_agency_bindings enable row level security;
revoke all on public.beast_marketing_agency_bindings from public, anon, authenticated;
grant select, insert, update, delete on public.beast_marketing_agency_bindings to service_role;
-- This table is preparation metadata only. The existing publisher does not consume it.
commit;
