import Stripe from "stripe";
import {
  getBillingReturnUrl,
  getCheckoutPriceId,
  getStripeBillingConfig,
  type BillingInterval,
  type StripeBillingConfig,
} from "../billing/stripeConfig";

export type StripeFailureResult = {
  ok: false;
  status: "not_configured" | "stripe_error";
  message: string;
  missing?: string[];
};

export type StripeCheckoutResult =
  | {
      ok: true;
      sessionId: string;
      url: string;
      customerId: string | null;
    }
  | StripeFailureResult;

export type StripePortalResult =
  | {
      ok: true;
      url: string;
    }
  | StripeFailureResult;

export type CreateCheckoutSessionInput = {
  userId: string;
  email?: string | null;
  interval: BillingInterval;
  customerId?: string | null;
  config?: StripeBillingConfig;
};

export type CustomerPortalInput = {
  customerId: string;
  returnUrl?: string;
  config?: StripeBillingConfig;
};

export type WebhookInput = {
  payload: string;
  signature?: string;
  config?: StripeBillingConfig;
};

export type SyncSubscriptionInput = {
  userId: string;
  providerCustomerId?: string | null;
  providerSubscriptionId?: string | null;
};

function getConfig(config?: StripeBillingConfig) {
  if (config) return { ok: true as const, config };

  return getStripeBillingConfig();
}

export function createStripeClient(config: StripeBillingConfig) {
  return new Stripe(config.secretKey);
}

export function buildCheckoutSessionCreateParams(input: {
  userId: string;
  interval: BillingInterval;
  customerId: string;
  config: StripeBillingConfig;
}): Stripe.Checkout.SessionCreateParams {
  const priceId = getCheckoutPriceId(input.interval, input.config);

  return {
    mode: "subscription",
    customer: input.customerId,
    client_reference_id: input.userId,
    success_url: input.config.successUrl,
    cancel_url: input.config.cancelUrl,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: {
      user_id: input.userId,
      interval: input.interval,
    },
    subscription_data: {
      metadata: {
        user_id: input.userId,
        interval: input.interval,
      },
    },
  };
}

export async function createCheckoutSession(
  input: CreateCheckoutSessionInput
): Promise<StripeCheckoutResult> {
  const configResult = getConfig(input.config);
  if (!configResult.ok) {
    return {
      ok: false,
      status: "not_configured",
      message: "Stripe billing is not fully configured.",
      missing: configResult.missing,
    };
  }

  const stripe = createStripeClient(configResult.config);

  try {
    const customerId =
      input.customerId ??
      (
        await stripe.customers.create({
          email: input.email ?? undefined,
          metadata: { user_id: input.userId },
        })
      ).id;

    const session = await stripe.checkout.sessions.create(
      buildCheckoutSessionCreateParams({
        userId: input.userId,
        interval: input.interval,
        customerId,
        config: configResult.config,
      })
    );

    return {
      ok: true,
      sessionId: session.id,
      url: session.url ?? configResult.config.cancelUrl,
      customerId,
    };
  } catch (error) {
    return {
      ok: false,
      status: "stripe_error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to create Stripe Checkout session.",
    };
  }
}

export async function customerPortal(
  input: CustomerPortalInput
): Promise<StripePortalResult> {
  const configResult = getConfig(input.config);
  if (!configResult.ok) {
    return {
      ok: false,
      status: "not_configured",
      message: "Stripe billing is not fully configured.",
      missing: configResult.missing,
    };
  }

  const stripe = createStripeClient(configResult.config);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: input.customerId,
      return_url: input.returnUrl ?? getBillingReturnUrl(configResult.config),
    });

    return { ok: true, url: session.url };
  } catch (error) {
    return {
      ok: false,
      status: "stripe_error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to create Stripe Customer Portal session.",
    };
  }
}

export function webhook(input: WebhookInput) {
  const configResult = getConfig(input.config);
  if (!configResult.ok) {
    return {
      ok: false as const,
      status: "not_configured" as const,
      message: "Stripe webhook signing secret is not configured.",
      missing: configResult.missing,
    };
  }

  if (!input.signature) {
    return {
      ok: false as const,
      status: "stripe_error" as const,
      message: "Missing Stripe signature.",
    };
  }

  if (!configResult.config.webhookSecret) {
    return {
      ok: false as const,
      status: "not_configured" as const,
      message: "Stripe webhook signing secret is not configured.",
      missing: ["STRIPE_WEBHOOK_SECRET"],
    };
  }

  const stripe = createStripeClient(configResult.config);

  try {
    return {
      ok: true as const,
      event: stripe.webhooks.constructEvent(
        input.payload,
        input.signature,
        configResult.config.webhookSecret
      ),
    };
  } catch (error) {
    return {
      ok: false as const,
      status: "stripe_error" as const,
      message:
        error instanceof Error
          ? error.message
          : "Unable to verify Stripe webhook signature.",
    };
  }
}

export async function syncSubscription(
  _input: SyncSubscriptionInput
): Promise<StripeFailureResult> {
  return {
    ok: false,
    status: "not_configured",
    message: "Subscription sync is handled by the Stripe webhook endpoint.",
  };
}
