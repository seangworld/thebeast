"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEntitlements } from "@/lib/hooks/useEntitlements";

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
  const customerId = entitlements.membership.subscription?.provider_customer_id;
  const canManageSubscription =
    entitlements.context.plan === "pro" && Boolean(customerId);

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div>
            <p className="beast-kicker">The Beast</p>
            <h1 className="beast-title">Billing</h1>
            <p className="beast-subtitle">
              Manage your Beast membership and Stripe subscription.
            </p>
          </div>
        </section>

        {checkoutSucceeded ? (
          <section className="beast-card border-green-400/40 bg-green-400/10">
            <p className="text-sm font-semibold text-green-200">
              {!entitlements.loading && entitlements.context.plan === "pro"
                ? "Welcome to Pro. Your membership is active and Pro features are unlocked."
                : "Checkout completed. Your membership will update after Stripe confirms the subscription."}
            </p>
          </section>
        ) : null}

        {checkoutCanceled ? (
          <section className="beast-card border-yellow-300/40 bg-yellow-300/10">
            <p className="text-sm font-semibold text-yellow-100">
              Checkout was canceled. Your current plan has not changed.
            </p>
          </section>
        ) : null}

        <section className="beast-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Current Membership</h2>
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
          <div className="beast-card">
            <h2 className="text-xl font-bold">Pro Monthly</h2>
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

          <div className="beast-card">
            <h2 className="text-xl font-bold">Pro Annual</h2>
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

        <section className="beast-card">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Manage Subscription</h2>
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
    </main>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <main className="beast-page">
          <div className="beast-container">
            <section className="beast-card">
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
