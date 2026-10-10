create table if not exists public.beastfusion_purchase_acceptances (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 checkout_session_id text not null unique,
 terms_version text not null,
 accepted_at timestamptz not null default now()
);
alter table public.beastfusion_purchase_acceptances enable row level security;
revoke all on public.beastfusion_purchase_acceptances from anon,authenticated;
grant select,insert on public.beastfusion_purchase_acceptances to service_role;
create index if not exists beastfusion_purchase_acceptances_user_idx on public.beastfusion_purchase_acceptances(user_id);
