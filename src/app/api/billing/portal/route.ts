import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { customerPortal, getMembershipForUserWithClient } from "@/lib/membership";
import { getStripeBillingConfig } from "@/lib/billing/stripeConfig";
import {
  requireBillingUser,
  requireStripeCustomer,
} from "@/lib/billing/guards";

export async function POST() {
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
  const customer = requireStripeCustomer(membership);

  if (!customer.ok) {
    return NextResponse.json(
      { error: customer.message },
      { status: customer.status }
    );
  }

  const portal = await customerPortal({
    customerId: customer.customerId,
    returnUrl: configResult.config.cancelUrl,
    config: configResult.config,
  });

  if (!portal.ok) {
    return NextResponse.json(
      { error: portal.message },
      { status: portal.status === "not_configured" ? 503 : 502 }
    );
  }

  return NextResponse.redirect(portal.url, { status: 303 });
}
