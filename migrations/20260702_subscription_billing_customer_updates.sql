-- Allow authenticated users to attach a Stripe customer ID created by Checkout
-- while preventing client-side plan/status promotion. Trusted Stripe webhook
-- syncs continue to use the server service-role path.

create or replace function public.prevent_subscription_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.is_profile_admin() then
    return new;
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'Subscription user cannot be changed';
  end if;

  if new.plan is distinct from old.plan then
    raise exception 'Only trusted billing sync can change subscription plan';
  end if;

  if new.status is distinct from old.status then
    raise exception 'Only trusted billing sync can change subscription status';
  end if;

  if new.provider_subscription_id is distinct from old.provider_subscription_id then
    raise exception 'Only trusted billing sync can change Stripe subscription IDs';
  end if;

  if new.current_period_end is distinct from old.current_period_end then
    raise exception 'Only trusted billing sync can change subscription period';
  end if;

  if new.cancel_at_period_end is distinct from old.cancel_at_period_end then
    raise exception 'Only trusted billing sync can change cancellation state';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_subscription_privilege_escalation on public.subscriptions;
create trigger prevent_subscription_privilege_escalation
  before update on public.subscriptions
  for each row
  execute function public.prevent_subscription_privilege_escalation();

drop policy if exists "Users can update their billing customer ID" on public.subscriptions;
create policy "Users can update their billing customer ID"
  on public.subscriptions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
