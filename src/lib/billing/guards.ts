import type { MembershipSnapshot } from "../membership";

export type BillingUser = {
  id: string;
  email?: string | null;
} | null | undefined;

export function requireBillingUser(user: BillingUser) {
  if (!user?.id) {
    return { ok: false as const, status: 401, message: "Authentication required." };
  }

  return { ok: true as const, user };
}

export function getStripeCustomerId(membership: MembershipSnapshot) {
  return membership.subscription?.provider_customer_id ?? null;
}

export function requireStripeCustomer(membership: MembershipSnapshot) {
  const customerId = getStripeCustomerId(membership);

  if (!customerId) {
    return {
      ok: false as const,
      status: 400,
      message: "A Stripe customer is required to manage billing.",
    };
  }

  return { ok: true as const, customerId };
}
