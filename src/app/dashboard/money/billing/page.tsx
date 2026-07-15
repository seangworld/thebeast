"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getCheckoutStartErrorMessage,
  type CheckoutStartErrorCode,
} from "@/lib/billing/checkoutErrors";
import { useEntitlements } from "@/lib/hooks/useEntitlements";
import { BeastMoneyShell } from "@/app/dashboard/money/BeastMoneyShell";

function formatPlan(plan: string) {
  return plan === "pro" ? "Pro" : "Free";
}

function formatStatus(status: string) {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function BillingPageContent() {
  const entitlements = useEntitlements();
  const searchParams = useSearchParams();
  const billingResult = searchParams.get("billing");
  const checkoutSucceeded =
    searchParams.get("success") === "true" || billingResult === "success";
  const checkoutCanceled =
    searchParams.get("canceled") === "true" || billingResult === "canceled";
  const checkoutError = searchParams.get(
    "checkout_error"
  ) as CheckoutStartErrorCode | null;
  const customerId = entitlements.membership.subscription?.provider_customer_id;
  const canManageSubscription =
    entitlements.context.plan === "pro" && Boolean(customerId);

  if (!entitlements.loading && !entitlements.isAdmin) {
    return (
      <BeastMoneyShell
        title="Planning Experience"
        description="BeastMoney planning tools are available from the product workspace."
      >
        <div className="money-page-stack">
          <section className="money-section-card">
            <h2 className="money-section-title">Member experience</h2>
            <p className="mt-2 text-sm text-[#c7cfdb]">
              Billing controls are not part of the current Member experience.
              Continue with cash flow, debts, payoff planning, and Velocity
              Banking from BeastMoney.
            </p>
            <Link href="/dashboard/money" className="beast-button mt-5 w-fit">
              Open BeastMoney
            </Link>
          </section>
        </div>
      </BeastMoneyShell>
    );
  }

  return (
    <BeastMoneyShell
      title="Billing"
      description="Manage your Beast membership and Stripe subscription."
    >
      <div className="money-page-stack">
        {checkoutSucceeded ? (
          <section className="money-section-card border-green-400/40 bg-green-400/10">
            <p className="text-sm font-semibold text-green-200">
              {!entitlements.loading && entitlements.context.plan === "pro"
                ? "Welcome to Pro. Your membership is active and Pro features are unlocked."
                : "Checkout completed. Your membership will update after Stripe confirms the subscription."}
            </p>
          </section>
        ) : null}

        {checkoutCanceled ? (
          <section className="money-section-card border-yellow-300/40 bg-yellow-300/10">
            <p className="text-sm font-semibold text-yellow-100">
              Checkout was canceled. Your current plan has not changed.
            </p>
          </section>
        ) : null}

        {checkoutError ? (
          <section className="money-section-card border-red-400/40 bg-red-400/10">
            <p className="text-sm font-semibold text-red-100">
              {getCheckoutStartErrorMessage(checkoutError)}
            </p>
          </section>
        ) : null}

        <section className="money-section-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="money-section-title">Current Membership</h2>
              <p className="mt-1 text-sm text-[#c7cfdb]">
                Database membership is the source of truth for access.
              </p>
            </div>
            <div className="grid gap-2 text-sm md:text-right">
              <div>
                <span className="font-semibold text-[#7f8da3]">Plan: </span>
                <span className="font-bold text-white">
                  {entitlements.loading
                    ? "Checking..."
                    : formatPlan(entitlements.context.plan)}
                </span>
              </div>
              <div>
                <span className="font-semibold text-[#7f8da3]">Status: </span>
                <span className="font-bold text-white">
                  {entitlements.loading
                    ? "Checking..."
                    : formatStatus(entitlements.membership.status)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="money-section-card">
            <h2 className="money-section-title">Pro Monthly</h2>
            <p className="mt-2 text-sm text-[#c7cfdb]">
              Unlock Velocity Planner, Beast Advisor, and Pro planning tools
              with monthly billing.
            </p>
            <form action="/api/billing/checkout" method="post" className="mt-5">
              <input type="hidden" name="interval" value="monthly" />
              <button type="submit" className="beast-button w-full">
                Upgrade Monthly
              </button>
            </form>
          </div>

          <div className="money-section-card">
            <h2 className="money-section-title">Pro Annual</h2>
            <p className="mt-2 text-sm text-[#c7cfdb]">
              Get the same Pro access with annual billing through Stripe
              Checkout.
            </p>
            <form action="/api/billing/checkout" method="post" className="mt-5">
              <input type="hidden" name="interval" value="annual" />
              <button type="submit" className="beast-button w-full">
                Upgrade Annual
              </button>
            </form>
          </div>
        </section>

        <section className="money-section-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="money-section-title">Manage Subscription</h2>
              <p className="mt-1 text-sm text-[#c7cfdb]">
                Pro subscriptions are managed securely in the Stripe Customer
                Portal.
              </p>
            </div>

            {canManageSubscription ? (
              <form action="/api/billing/portal" method="post">
                <button type="submit" className="beast-button-secondary">
                  Manage Subscription
                </button>
              </form>
            ) : (
              <Link href="/dashboard/money/settings" className="beast-button-secondary w-fit">
                Back to Settings
              </Link>
            )}
          </div>
        </section>
      </div>
    </BeastMoneyShell>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <main className="beast-page">
          <div className="beast-container">
            <section className="money-section-card">
              <p className="text-sm text-[#7f8da3]">Loading billing...</p>
            </section>
          </div>
        </main>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}
