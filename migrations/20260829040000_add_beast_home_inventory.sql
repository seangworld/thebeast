-- BHM-002: private member-owned home inventory records.
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
  unique (id, owner_id)
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
  constraint beast_home_inventory_items_room_owner_fk foreign key (room_id, owner_id)
    references public.beast_home_inventory_rooms(id, owner_id) on delete cascade,
  constraint beast_home_inventory_items_receipt_owner_fk foreign key (receipt_document_id, owner_id)
    references public.beast_documents(id, owner_id) on delete set null
);

create index if not exists beast_home_inventories_owner_date_idx on public.beast_home_inventories(owner_id, inventory_date desc);
create index if not exists beast_home_rooms_owner_inventory_idx on public.beast_home_inventory_rooms(owner_id, inventory_id, name);
create index if not exists beast_home_items_owner_room_idx on public.beast_home_inventory_items(owner_id, room_id, name);

alter table public.beast_home_inventories enable row level security;
alter table public.beast_home_inventory_rooms enable row level security;
alter table public.beast_home_inventory_items enable row level security;

create policy "Members manage own home inventories" on public.beast_home_inventories for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Members manage own home inventory rooms" on public.beast_home_inventory_rooms for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "Members manage own home inventory items" on public.beast_home_inventory_items for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

revoke all on public.beast_home_inventories, public.beast_home_inventory_rooms, public.beast_home_inventory_items from anon;
grant select, insert, update, delete on public.beast_home_inventories, public.beast_home_inventory_rooms, public.beast_home_inventory_items to authenticated;
