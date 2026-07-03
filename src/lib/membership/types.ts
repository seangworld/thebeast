export const MEMBERSHIP_PLANS = ["free", "pro"] as const;
export type MembershipPlan = (typeof MEMBERSHIP_PLANS)[number];

export const SUBSCRIPTION_STATUSES = [
  "active",
  "trial",
  "canceled",
  "past_due",
  "incomplete",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "active",
  "trial",
];

export const BILLING_PROVIDERS = ["stripe"] as const;
export type BillingProvider = (typeof BILLING_PROVIDERS)[number];

export type MembershipRecord = {
  id: string;
  user_id: string;
  plan: MembershipPlan;
  status: SubscriptionStatus;
  billing_provider: BillingProvider;
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
};

export type MembershipSnapshot = {
  plan: MembershipPlan;
  status: SubscriptionStatus;
  isActive: boolean;
  source: "database" | "default";
  subscription: MembershipRecord | null;
};

export const DEFAULT_FREE_MEMBERSHIP: MembershipSnapshot = {
  plan: "free",
  status: "active",
  isActive: true,
  source: "default",
  subscription: null,
};

export function normalizeMembershipPlan(plan: unknown): MembershipPlan {
  return MEMBERSHIP_PLANS.includes(plan as MembershipPlan)
    ? (plan as MembershipPlan)
    : "free";
}

export function normalizeSubscriptionStatus(
  status: unknown
): SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.includes(status as SubscriptionStatus)
    ? (status as SubscriptionStatus)
    : "active";
}

export function normalizeBillingProvider(provider: unknown): BillingProvider {
  return BILLING_PROVIDERS.includes(provider as BillingProvider)
    ? (provider as BillingProvider)
    : "stripe";
}

export function isSubscriptionStatusActive(status: unknown) {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(
    normalizeSubscriptionStatus(status)
  );
}

export function getMembershipEntitlementPlan(
  membership: Pick<MembershipSnapshot, "plan" | "status" | "isActive"> | null | undefined
): MembershipPlan {
  if (!membership?.isActive || !isSubscriptionStatusActive(membership.status)) {
    return "free";
  }

  return normalizeMembershipPlan(membership.plan);
}
