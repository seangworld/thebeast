import {
  mapStripeStatusToMembershipPlan,
  mapStripeStatusToMembershipStatus,
} from "./stripeConfig";
import type { MembershipUpdateInput } from "../membership";

export type StripeSubscriptionLike = {
  id: string;
  customer?: string | { id?: string } | null;
  status?: string | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  metadata?: Record<string, string | undefined> | null;
};

function getCustomerId(customer: StripeSubscriptionLike["customer"]) {
  if (!customer) return null;
  if (typeof customer === "string") return customer;
  return customer.id ?? null;
}

export function getCurrentPeriodEndIso(seconds: number | null | undefined) {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

export function buildMembershipUpdateFromStripeSubscription(
  subscription: StripeSubscriptionLike,
  fallbackUserId?: string | null
): MembershipUpdateInput | null {
  const userId = subscription.metadata?.user_id ?? fallbackUserId;
  if (!userId) return null;

  return {
    userId,
    plan: mapStripeStatusToMembershipPlan(subscription.status),
    status: mapStripeStatusToMembershipStatus(subscription.status),
    providerCustomerId: getCustomerId(subscription.customer),
    providerSubscriptionId: subscription.id,
    currentPeriodEnd: getCurrentPeriodEndIso(subscription.current_period_end),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  };
}
