-- Membership persistence foundation for Beast v2.
-- Stripe writes will use a trusted server/service-role path later; client users can
-- only read their own subscription and create a default Free row.

create extension if not exists pgcrypto;

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free',
  status text not null default 'active',
  billing_provider text not null default 'stripe',
  provider_customer_id text null,
  provider_subscription_id text null,
  current_period_end timestamptz null,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_user_id_key unique (user_id),
  constraint subscriptions_plan_check check (plan in ('free', 'pro')),
  constraint subscriptions_status_check check (
    status in ('active', 'trial', 'canceled', 'past_due', 'incomplete')
  ),
  constraint subscriptions_billing_provider_check check (billing_provider in ('stripe'))
);

create unique index if not exists subscriptions_provider_customer_id_idx
  on public.subscriptions (provider_customer_id)
  where provider_customer_id is not null;

create unique index if not exists subscriptions_provider_subscription_id_idx
  on public.subscriptions (provider_subscription_id)
  where provider_subscription_id is not null;

create or replace function public.set_subscriptions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_subscriptions_updated_at();

alter table public.subscriptions enable row level security;

drop policy if exists "Users can read their own subscription" on public.subscriptions;
create policy "Users can read their own subscription"
  on public.subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their Free subscription" on public.subscriptions;
create policy "Users can create their Free subscription"
  on public.subscriptions
  for insert
  with check (
    auth.uid() = user_id
    and plan = 'free'
    and status = 'active'
    and provider_customer_id is null
    and provider_subscription_id is null
    and current_period_end is null
    and cancel_at_period_end = false
  );

drop policy if exists "Admins can read all subscriptions" on public.subscriptions;
create policy "Admins can read all subscriptions"
  on public.subscriptions
  for select
  using (public.is_profile_admin());

drop policy if exists "Admins can create subscriptions" on public.subscriptions;
create policy "Admins can create subscriptions"
  on public.subscriptions
  for insert
  with check (public.is_profile_admin());

drop policy if exists "Admins can update subscriptions" on public.subscriptions;
create policy "Admins can update subscriptions"
  on public.subscriptions
  for update
  using (public.is_profile_admin())
  with check (public.is_profile_admin());

insert into public.subscriptions (user_id, plan, status, billing_provider)
select id, 'free', 'active', 'stripe'
from auth.users
on conflict (user_id) do nothing;
