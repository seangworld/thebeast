import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import {
  createCheckoutSession,
  getMembershipForUserWithClient,
  updateMembershipWithClient,
} from "@/lib/membership";
import {
  getStripeBillingConfig,
  normalizeBillingInterval,
} from "@/lib/billing/stripeConfig";
import {
  getCheckoutStartErrorMessage,
  type CheckoutStartErrorCode,
} from "@/lib/billing/checkoutErrors";
import { requireBillingUser } from "@/lib/billing/guards";

function wantsJsonResponse(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  return (
    contentType.includes("application/json") ||
    (request.headers.get("accept") ?? "").includes("application/json")
  );
}

function checkoutErrorResponse(
  request: Request,
  code: CheckoutStartErrorCode,
  status: number,
  detail?: string | string[]
) {
  const message = getCheckoutStartErrorMessage(code);

  if (wantsJsonResponse(request)) {
    return NextResponse.json(
      {
        error: message,
        code,
        detail,
      },
      { status }
    );
  }

  const url = new URL("/dashboard/money/billing", request.url);
  url.searchParams.set("checkout_error", code);
  return NextResponse.redirect(url, { status: 303 });
}

async function readInterval(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    return normalizeBillingInterval(body.interval);
  }

  const formData = await request.formData();
  return normalizeBillingInterval(formData.get("interval"));
}

export async function POST(request: Request) {
  try {
    const interval = await readInterval(request);
    if (!interval) {
      return checkoutErrorResponse(request, "configuration", 400);
    }

    const configResult = getStripeBillingConfig();
    if (!configResult.ok) {
      return checkoutErrorResponse(
        request,
        "configuration",
        503,
        configResult.missing
      );
    }

    const supabase = createRouteClient();
    const { data } = await supabase.auth.getUser();
    const auth = requireBillingUser(data.user);

    if (!auth.ok) {
      return checkoutErrorResponse(request, "authentication", auth.status);
    }

    const membership = await getMembershipForUserWithClient(
      supabase,
      auth.user.id
    );
    const customerId = membership.subscription?.provider_customer_id ?? null;
    const checkout = await createCheckoutSession({
      userId: auth.user.id,
      email: auth.user.email,
      interval,
      customerId,
      config: configResult.config,
    });

    if (!checkout.ok) {
      const isPriceConfigError = checkout.message
        .toLowerCase()
        .includes("price");
      return checkoutErrorResponse(
        request,
        isPriceConfigError ? "invalid_price" : "stripe",
        checkout.status === "not_configured" ? 503 : 502,
        checkout.message
      );
    }

    if (checkout.customerId && checkout.customerId !== customerId) {
      try {
        await updateMembershipWithClient(supabase, {
          userId: auth.user.id,
          plan: membership.subscription?.plan ?? membership.plan,
          status: membership.status,
          providerCustomerId: checkout.customerId,
          providerSubscriptionId:
            membership.subscription?.provider_subscription_id ?? null,
          currentPeriodEnd: membership.subscription?.current_period_end ?? null,
          cancelAtPeriodEnd: membership.subscription?.cancel_at_period_end ?? false,
        });
      } catch (error) {
        console.error("Unable to persist Stripe customer before checkout.", error);
      }
    }

    return NextResponse.redirect(checkout.url, { status: 303 });
  } catch (error) {
    console.error("Unable to start Stripe Checkout.", error);
    return checkoutErrorResponse(request, "unexpected", 500);
  }
}
