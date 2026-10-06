create table if not exists public.beastfusion_setup_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_step text not null default 'welcome',
  completed_steps jsonb not null default '[]'::jsonb,
  workspace_name text,
  github_repository text,
  ai_provider text,
  authority jsonb not null default '{}'::jsonb,
  budget jsonb not null default '{}'::jsonb,
  verification jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.beastfusion_setup_state enable row level security;
create policy "bf setup select own" on public.beastfusion_setup_state for select using (auth.uid()=user_id);
create policy "bf setup insert own" on public.beastfusion_setup_state for insert with check (auth.uid()=user_id);
create policy "bf setup update own" on public.beastfusion_setup_state for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
