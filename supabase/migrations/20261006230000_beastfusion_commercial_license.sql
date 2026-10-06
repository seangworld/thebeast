create table if not exists public.beastfusion_licenses (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 license_id text not null unique,
 edition text not null default 'professional',
 status text not null default 'active',
 updates_until date,
 issued_at timestamptz not null default now()
);
create index if not exists beastfusion_licenses_user_idx on public.beastfusion_licenses(user_id);
alter table public.beastfusion_licenses enable row level security;
grant select on public.beastfusion_licenses to authenticated;
create policy "bf license select own" on public.beastfusion_licenses for select to authenticated using ((select auth.uid())=user_id);
