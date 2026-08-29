-- BHM-002: private member-owned home inventory records.
alter table public.beast_admin_member_module_access
  drop constraint if exists beast_admin_member_module_access_module_check;
alter table public.beast_admin_member_module_access
  add constraint beast_admin_member_module_access_module_check
  check (module_id in ('money', 'learning', 'home'));

create or replace function public.is_beast_home_member_eligible()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles profile
    where profile.id = auth.uid()
      and (profile.role = 'admin' or profile.birthday <= current_date - interval '18 years')
      and (
        profile.role = 'admin'
        or not exists (
          select 1 from public.beast_admin_member_module_access access
          where access.member_id = profile.id and access.module_id = 'home' and access.enabled = false
        )
      )
  );
$$;
revoke all on function public.is_beast_home_member_eligible() from public, anon;
grant execute on function public.is_beast_home_member_eligible() to authenticated;

create table if not exists public.beast_home_inventories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My home inventory' check (char_length(name) between 1 and 120),
  inventory_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table if not exists public.beast_home_inventory_rooms (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_home_inventory_rooms_inventory_owner_fk foreign key (inventory_id, owner_id)
    references public.beast_home_inventories(id, owner_id) on delete cascade,
  unique (id, owner_id),
  unique (id, inventory_id, owner_id)
);

create table if not exists public.beast_home_inventory_items (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null,
  room_id uuid not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  quantity integer not null default 1 check (quantity between 1 and 9999),
  details text null check (details is null or char_length(details) <= 500),
  estimated_value_cents bigint null check (estimated_value_cents is null or estimated_value_cents between 0 and 100000000000),
  receipt_document_id uuid null,
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint beast_home_inventory_items_inventory_owner_fk foreign key (inventory_id, owner_id)
    references public.beast_home_inventories(id, owner_id) on delete cascade,
  constraint beast_home_inventory_items_room_inventory_owner_fk foreign key (room_id, inventory_id, owner_id)
    references public.beast_home_inventory_rooms(id, inventory_id, owner_id) on delete cascade,
  constraint beast_home_inventory_items_receipt_owner_fk foreign key (receipt_document_id, owner_id)
    references public.beast_documents(id, owner_id) on delete set null (receipt_document_id)
);

create index if not exists beast_home_inventories_owner_date_idx on public.beast_home_inventories(owner_id, inventory_date desc);
create index if not exists beast_home_rooms_owner_inventory_idx on public.beast_home_inventory_rooms(owner_id, inventory_id, name);
create index if not exists beast_home_items_owner_room_idx on public.beast_home_inventory_items(owner_id, room_id, name);

alter table public.beast_home_inventories enable row level security;
alter table public.beast_home_inventory_rooms enable row level security;
alter table public.beast_home_inventory_items enable row level security;

create policy "Members manage own home inventories" on public.beast_home_inventories for all to authenticated
  using (owner_id = auth.uid() and public.is_beast_home_member_eligible()) with check (owner_id = auth.uid() and public.is_beast_home_member_eligible());
create policy "Members manage own home inventory rooms" on public.beast_home_inventory_rooms for all to authenticated
  using (owner_id = auth.uid() and public.is_beast_home_member_eligible()) with check (owner_id = auth.uid() and public.is_beast_home_member_eligible());
create policy "Members manage own home inventory items" on public.beast_home_inventory_items for all to authenticated
  using (owner_id = auth.uid() and public.is_beast_home_member_eligible()) with check (owner_id = auth.uid() and public.is_beast_home_member_eligible());

revoke all on public.beast_home_inventories, public.beast_home_inventory_rooms, public.beast_home_inventory_items from anon;
grant select, insert, update, delete on public.beast_home_inventories, public.beast_home_inventory_rooms, public.beast_home_inventory_items to authenticated;

alter table public.beast_telemetry_events drop constraint if exists beast_telemetry_events_event_name_check;
alter table public.beast_telemetry_events add constraint beast_telemetry_events_event_name_check check (event_name in (
  'onboarding_completed','bill_created','debt_created','payment_recorded','payoff_plan_viewed','education_goal_created','education_activity_completed','education_course_created','health_workspace_opened','health_record_added','appointment_record_added','goal_created','goal_completed','document_uploaded','document_processed','document_viewed','professional_turn_started','professional_turn_completed','professional_turn_failed','api_failure','database_command_failed','home_inventory_opened','home_inventory_started','home_inventory_confirmed','home_inventory_exported'
));
alter table public.beast_telemetry_events drop constraint if exists beast_telemetry_events_module_id_check;
alter table public.beast_telemetry_events add constraint beast_telemetry_events_module_id_check check (module_id in ('beastos','money','education','health','goals','documents','admin','home'));

alter function public.get_beast_admin_first_party_telemetry(integer, text) rename to get_beast_admin_first_party_telemetry_without_home_inventory;
revoke all on function public.get_beast_admin_first_party_telemetry_without_home_inventory(integer, text) from public, anon, authenticated;
create function public.get_beast_admin_first_party_telemetry(reporting_days integer default 30, telemetry_environment text default 'production')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare base_result jsonb; actor_count integer; home_result jsonb;
begin
  base_result := public.get_beast_admin_first_party_telemetry_without_home_inventory(reporting_days, telemetry_environment);
  select count(distinct actor_id)::integer into actor_count from public.beast_telemetry_events where environment = telemetry_environment and module_id = 'home' and expires_at > now() and occurred_at >= now() - make_interval(days => reporting_days);
  if actor_count < 5 then home_result := jsonb_build_object('status','insufficient_data','minimumCohort',5);
  else select jsonb_build_object('status','available','members',actor_count,'opens',count(*) filter (where event_name='home_inventory_opened'),'starts',count(*) filter (where event_name='home_inventory_started'),'confirmations',count(*) filter (where event_name='home_inventory_confirmed'),'exports',count(*) filter (where event_name='home_inventory_exported')) into home_result from public.beast_telemetry_events where environment = telemetry_environment and module_id='home' and expires_at > now() and occurred_at >= now() - make_interval(days => reporting_days); end if;
  return jsonb_set(base_result,'{homeInventory}',home_result,true);
end; $$;
revoke all on function public.get_beast_admin_first_party_telemetry(integer, text) from public, anon;
grant execute on function public.get_beast_admin_first_party_telemetry(integer, text) to authenticated;
