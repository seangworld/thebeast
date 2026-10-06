create table if not exists public.beastfusion_support_tickets (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 subject text not null, message text not null,
 tier smallint not null default 0, queue text not null default 'self_help',
 status text not null default 'open',
 diagnostic jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.beastfusion_support_tickets enable row level security;
grant select,insert,update on public.beastfusion_support_tickets to authenticated;
create policy "bf support select own" on public.beastfusion_support_tickets for select to authenticated using ((select auth.uid())=user_id);
create policy "bf support insert own" on public.beastfusion_support_tickets for insert to authenticated with check ((select auth.uid())=user_id);
create policy "bf support update own" on public.beastfusion_support_tickets for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
