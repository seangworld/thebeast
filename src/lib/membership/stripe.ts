import type { MembershipPlan, SubscriptionStatus } from "./types";

export type StripeReadinessResult = {
  ok: false;
  status: "not_configured";
  message: string;
};

export type CreateCheckoutSessionInput = {
  userId: string;
  plan: Extract<MembershipPlan, "pro">;
  successUrl?: string;
  cancelUrl?: string;
};

export type CustomerPortalInput = {
  userId: string;
  returnUrl?: string;
};

export type WebhookInput = {
  payload: string;
  signature?: string;
};

export type SyncSubscriptionInput = {
  userId: string;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
  plan?: MembershipPlan;
  status?: SubscriptionStatus;
};

const STRIPE_PLACEHOLDER_RESULT: StripeReadinessResult = {
  ok: false,
  status: "not_configured",
  message: "Stripe integration is not connected yet.",
};

export async function createCheckoutSession(
  _input: CreateCheckoutSessionInput
): Promise<StripeReadinessResult> {
  return STRIPE_PLACEHOLDER_RESULT;
}

export async function customerPortal(
  _input: CustomerPortalInput
): Promise<StripeReadinessResult> {
  return STRIPE_PLACEHOLDER_RESULT;
}

export async function webhook(
  _input: WebhookInput
): Promise<StripeReadinessResult> {
  return STRIPE_PLACEHOLDER_RESULT;
}

export async function syncSubscription(
  _input: SyncSubscriptionInput
): Promise<StripeReadinessResult> {
  return STRIPE_PLACEHOLDER_RESULT;
}
