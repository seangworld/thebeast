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
import { requireBillingUser } from "@/lib/billing/guards";

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
  const interval = await readInterval(request);
  if (!interval) {
    return NextResponse.json(
      { error: "Choose monthly or annual billing." },
      { status: 400 }
    );
  }

  const configResult = getStripeBillingConfig();
  if (!configResult.ok) {
    return NextResponse.json(
      {
        error: "Stripe billing is not fully configured.",
        missing: configResult.missing,
      },
      { status: 503 }
    );
  }

  const supabase = createRouteClient();
  const { data } = await supabase.auth.getUser();
  const auth = requireBillingUser(data.user);

  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
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
    return NextResponse.json(
      { error: checkout.message },
      { status: checkout.status === "not_configured" ? 503 : 502 }
    );
  }

  if (checkout.customerId && checkout.customerId !== customerId) {
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
  }

  return NextResponse.redirect(checkout.url, { status: 303 });
}
