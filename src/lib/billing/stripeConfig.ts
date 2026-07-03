import type { MembershipPlan, SubscriptionStatus } from "@/lib/membership";

export type BillingInterval = "monthly" | "annual";

export type StripeBillingConfig = {
  secretKey: string;
  publishableKey: string;
  monthlyPriceId: string;
  annualPriceId: string;
  successUrl: string;
  cancelUrl: string;
  webhookSecret?: string;
};

export type StripeBillingConfigResult =
  | { ok: true; config: StripeBillingConfig }
  | { ok: false; missing: string[] };

export function getStripeBillingConfig(
  env: Record<string, string | undefined> = process.env
): StripeBillingConfigResult {
  const values = {
    STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_PRO_MONTHLY_PRICE_ID: env.STRIPE_PRO_MONTHLY_PRICE_ID,
    STRIPE_PRO_ANNUAL_PRICE_ID: env.STRIPE_PRO_ANNUAL_PRICE_ID,
    STRIPE_SUCCESS_URL: env.STRIPE_SUCCESS_URL,
    STRIPE_CANCEL_URL: env.STRIPE_CANCEL_URL,
  };

  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return {
    ok: true,
    config: {
      secretKey: values.STRIPE_SECRET_KEY as string,
      publishableKey: values.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY as string,
      monthlyPriceId: values.STRIPE_PRO_MONTHLY_PRICE_ID as string,
      annualPriceId: values.STRIPE_PRO_ANNUAL_PRICE_ID as string,
      successUrl: values.STRIPE_SUCCESS_URL as string,
      cancelUrl: values.STRIPE_CANCEL_URL as string,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
    },
  };
}

export function normalizeBillingInterval(
  interval: unknown
): BillingInterval | null {
  return interval === "monthly" || interval === "annual" ? interval : null;
}

export function getCheckoutPriceId(
  interval: BillingInterval,
  config: Pick<StripeBillingConfig, "monthlyPriceId" | "annualPriceId">
) {
  return interval === "monthly" ? config.monthlyPriceId : config.annualPriceId;
}

export function getStripeCheckoutConfigIssue(
  config: StripeBillingConfig,
  interval?: BillingInterval
) {
  const priceIds = interval
    ? [getCheckoutPriceId(interval, config)]
    : [config.monthlyPriceId, config.annualPriceId];

  if (!config.secretKey.startsWith("sk_test_") && !config.secretKey.startsWith("sk_live_")) {
    return "Stripe secret key must be a valid test or live secret key.";
  }

  if (
    !config.publishableKey.startsWith("pk_test_") &&
    !config.publishableKey.startsWith("pk_live_")
  ) {
    return "Stripe publishable key must be a valid test or live publishable key.";
  }

  if (
    (config.secretKey.startsWith("sk_test_") && !config.publishableKey.startsWith("pk_test_")) ||
    (config.secretKey.startsWith("sk_live_") && !config.publishableKey.startsWith("pk_live_"))
  ) {
    return "Stripe secret and publishable keys must use the same test/live mode.";
  }

  if (priceIds.some((priceId) => !priceId.startsWith("price_"))) {
    return "Stripe Pro price IDs must start with price_.";
  }

  return null;
}

export function getBillingReturnUrl(
  config: Pick<StripeBillingConfig, "cancelUrl">
) {
  try {
    const url = new URL(config.cancelUrl);
    url.pathname = "/dashboard/money/billing";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "/dashboard/money/billing";
  }
}

export function mapStripeStatusToMembershipStatus(
  stripeStatus: string | null | undefined
): SubscriptionStatus {
  if (stripeStatus === "active") return "active";
  if (stripeStatus === "trialing") return "trial";
  if (stripeStatus === "canceled") return "canceled";
  if (stripeStatus === "past_due" || stripeStatus === "unpaid") {
    return "past_due";
  }

  return "incomplete";
}

export function mapStripeStatusToMembershipPlan(
  stripeStatus: string | null | undefined
): MembershipPlan {
  return stripeStatus === "active" || stripeStatus === "trialing"
    ? "pro"
    : "free";
}
