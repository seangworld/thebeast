-- Additive only. Keep existing owner-scoped debt_settings RLS unchanged.
alter table public.debt_settings
  add column if not exists custom_debt_order text[] not null default '{}';

alter table public.debt_settings
  add constraint debt_settings_custom_order_valid check (
    cardinality(custom_debt_order) <= 1000
    and array_position(custom_debt_order, null) is null
  );

comment on column public.debt_settings.custom_debt_order is
  'Ordered debt IDs for the custom payoff strategy. Consumers intersect with current owner-visible eligible debts. Unlisted debts follow in stable ID order.';
