create table if not exists public.beastfusion_setup_attestations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 gate text not null check (gate in ('workspace','github','repositories','byok','authority','budget')),
 verified_at timestamptz not null default now(),
 expires_at timestamptz not null,
 evidence jsonb not null default '{}'::jsonb,
 unique(user_id,gate)
);
alter table public.beastfusion_setup_attestations enable row level security;
revoke all on public.beastfusion_setup_attestations from anon,authenticated;
create index if not exists beastfusion_setup_attestations_user_idx on public.beastfusion_setup_attestations(user_id);
