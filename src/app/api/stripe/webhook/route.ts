import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  readMembershipForCustomerWithClient,
  updateMembershipWithClient,
  webhook,
} from "@/lib/membership";
import { createStripeClient } from "@/lib/membership/stripe";
import { getStripeBillingConfig } from "@/lib/billing/stripeConfig";
import {
  buildMembershipUpdateFromStripeSubscription,
  type StripeSubscriptionLike,
} from "@/lib/billing/subscriptionSync";

export const dynamic = "force-dynamic";

function getId(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value) {
    return String((value as { id?: unknown }).id ?? "");
  }
  return null;
}

async function syncSubscription(
  subscription: StripeSubscriptionLike,
  fallbackUserId?: string | null
) {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY for webhook sync.");
  }

  let userId = subscription.metadata?.user_id ?? fallbackUserId ?? null;
  const customerId = getId(subscription.customer);

  if (!userId && customerId) {
    const membership = await readMembershipForCustomerWithClient(
      admin,
      customerId
    );
    userId = membership?.subscription?.user_id ?? null;
  }

  const update = buildMembershipUpdateFromStripeSubscription(
    subscription,
    userId
  );

  if (!update) {
    throw new Error("Stripe subscription did not include a resolvable user.");
  }

  await updateMembershipWithClient(admin, update);
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature") ?? undefined;
  const configResult = getStripeBillingConfig();

  if (!configResult.ok) {
    return NextResponse.json(
      {
        error: "Stripe webhook is not fully configured.",
        missing: configResult.missing,
      },
      { status: 503 }
    );
  }

  const verified = webhook({
    payload,
    signature,
    config: configResult.config,
  });

  if (!verified.ok) {
    return NextResponse.json({ error: verified.message }, { status: 400 });
  }

  const stripe = createStripeClient(configResult.config);
  const event = verified.event;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscriptionId = getId(session.subscription);

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );
          await syncSubscription(
            subscription as StripeSubscriptionLike,
            session.metadata?.user_id ?? session.client_reference_id ?? null
          );
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(
          event.data.object as StripeSubscriptionLike,
          null
        );
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subscriptionId = getId(invoice.subscription);

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );
          await syncSubscription(subscription as StripeSubscriptionLike, null);
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to sync Stripe subscription.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
