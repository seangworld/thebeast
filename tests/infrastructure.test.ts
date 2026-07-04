import test from "node:test";
import assert from "node:assert/strict";
import {
  DEBT_STRATEGIES,
  getDebtStrategyDescription,
  getDebtStrategyLabel,
  normalizeDebtStrategy,
} from "../src/lib/debtStrategies";
import {
  ADMIN_VIEW_MODES,
  FEATURE_ENTITLEMENTS,
  hasEntitlement,
  isAdminViewSimulationActive,
  resolveEffectiveEntitlementContext,
  resolveEntitlementContext,
} from "../src/lib/entitlements";
import {
  DEFAULT_FREE_MEMBERSHIP,
  buildCheckoutSessionCreateParams,
  getMembershipEntitlementPlan,
  syncSubscription,
  type MembershipSnapshot,
} from "../src/lib/membership";
import {
  getCheckoutStartErrorMessage,
} from "../src/lib/billing/checkoutErrors";
import {
  getBillingReturnUrl,
  getCheckoutPriceId,
  getStripeCheckoutConfigIssue,
  getStripeBillingConfig,
  mapStripeStatusToMembershipPlan,
  mapStripeStatusToMembershipStatus,
} from "../src/lib/billing/stripeConfig";
import { buildResetDueDatePayload } from "../src/app/dashboard/money/cashflow/dueDateReset";
import {
  requireBillingUser,
  requireStripeCustomer,
} from "../src/lib/billing/guards";
import { buildMembershipUpdateFromStripeSubscription } from "../src/lib/billing/subscriptionSync";
import {
  formatCurrency,
  formatMonthCount,
  formatPercent,
  parseNumber,
  parseOptionalNumber,
} from "../src/lib/formatters";
import {
  calculateMonthlyRecurringTotal,
  countActiveRecurringSources,
  normalizeRecurringAmountToMonthly,
} from "../src/lib/financialMetrics";
import {
  mockLearners,
  mockLearningAchievements,
  mockLearningCourses,
  mockLearningGoals,
  mockLearningPlan,
  mockLearningProgress,
  mockLearningQuickActions,
  mockLearningSessions,
  mockLearningSignals,
} from "../src/lib/learning/mockData";
import { generateLearningPlan } from "../src/lib/learning/planGenerator";
import {
  buildBeastOSIntelligence,
  buildLearningFoundationIntelligence,
  buildMoneyIntelligence,
  sortRecommendations,
} from "../src/lib/platform/recommendationEngine";
import type { PlatformRecommendation } from "../src/lib/platform/types";
import {
  DEFAULT_VELOCITY_SETTINGS,
  mapVelocitySettingsRow,
  mergeStoredVelocitySettings,
  velocitySettingsToUpsertPayload,
} from "../src/lib/velocity/settings";

test("debt strategy registry includes existing strategy options", () => {
  assert.deepEqual(
    DEBT_STRATEGIES.map((strategy) => strategy.value),
    ["minimum", "snowball", "avalanche", "velocity"]
  );
  assert.equal(getDebtStrategyLabel("velocity"), "Velocity");
  assert.equal(
    getDebtStrategyDescription("minimum"),
    "Minimum payments only. No extra attack or rollover."
  );
  assert.equal(normalizeDebtStrategy("unknown"), "snowball");
});

test("shared formatters preserve current formatting semantics", () => {
  assert.equal(formatCurrency(1234.5), "$1,234.50");
  assert.equal(formatPercent(7.125), "7.13%");
  assert.equal(formatMonthCount(1), "1 Month");
  assert.equal(formatMonthCount(2.1), "3 Months");
  assert.equal(parseNumber(""), 0);
  assert.equal(parseNumber("12.5"), 12.5);
  assert.equal(parseOptionalNumber(""), null);
  assert.equal(parseOptionalNumber("12.5"), 12.5);
});

test("financial metrics normalize recurring income to monthly amounts", () => {
  assert.equal(normalizeRecurringAmountToMonthly(1200, "monthly"), 1200);
  assert.equal(normalizeRecurringAmountToMonthly(600, "semi-monthly"), 1200);
  assert.equal(normalizeRecurringAmountToMonthly(12000, "annual"), 1000);
  assert.equal(normalizeRecurringAmountToMonthly(12000, "yearly"), 1000);
  assert.equal(normalizeRecurringAmountToMonthly(0, "weekly"), 0);
  assert.ok(
    Math.abs(normalizeRecurringAmountToMonthly(1000, "weekly") - 4333.3333) <
      0.01
  );
  assert.ok(
    Math.abs(normalizeRecurringAmountToMonthly(2000, "biweekly") - 4333.3333) <
      0.01
  );
});

test("financial metrics include active recurring income sources only", () => {
  const monthlyIncome = calculateMonthlyRecurringTotal([
    { amount: 2000, frequency: "biweekly" }, // Employment
    { amount: 1200, frequency: "monthly" }, // VA
    { amount: 300, frequency: "weekly" }, // Other recurring
    { amount: 500, frequency: "monthly", is_active: false },
    { amount: 700, frequency: "monthly", is_archived: true },
  ]);

  assert.ok(Math.abs(monthlyIncome - 6833.3333) < 0.01);
  assert.equal(
    countActiveRecurringSources([
      { amount: 2000, frequency: "biweekly" },
      { amount: 1200, frequency: "monthly" },
      { amount: 300, frequency: "weekly" },
      { amount: 500, frequency: "monthly", is_active: false },
      { amount: 700, frequency: "monthly", is_archived: true },
    ]),
    3
  );
});

test("recommendation engine sorts by priority", () => {
  const recommendations = [
    { id: "low", priority: "Low", title: "Low" },
    { id: "critical", priority: "Critical", title: "Critical" },
    { id: "medium", priority: "Medium", title: "Medium" },
    { id: "high", priority: "High", title: "High" },
  ].map(
    (item) =>
      ({
        ...item,
        module: "money",
        severity: "info",
        summary: item.title,
        reason: item.title,
        recommendedAction: item.title,
        confidence: "reserved",
        dismissible: true,
        completed: false,
      } as PlatformRecommendation)
  );

  assert.deepEqual(
    sortRecommendations(recommendations).map((item) => item.priority),
    ["Critical", "High", "Medium", "Low"]
  );
});

test("money intelligence generates live structured recommendations", () => {
  const result = buildMoneyIntelligence({
    now: new Date("2026-07-03T12:00:00.000Z"),
    startingCash: 100,
    buffer: 500,
    monthlyIncome: 3000,
    monthlyBills: 3500,
    debtMinimums: 200,
    activeBills: [
      {
        id: "amex",
        name: "AMEX",
        amount: 250,
        due_date: 5,
      },
    ],
    activeDebts: [
      {
        id: "card",
        name: "Credit Card",
        balance: 1200,
        minimum_payment: 75,
        due_date: 12,
      },
    ],
    billPayments: [{ id: "bill-payment", amount_paid: 50 }],
    debtPayments: [{ id: "debt-payment", amount: 75 }],
  });

  assert.equal(result.recommendations[0].priority, "Critical");
  assert.equal(
    result.recommendations.some((item) => item.title.includes("AMEX")),
    true
  );
  assert.equal(
    result.notifications.some((item) => item.id === "money-buffer-alert"),
    true
  );
  assert.equal(result.activities.length >= 2, true);
  assert.equal(result.moduleSummaries[0].module, "money");
});

test("beastos intelligence has all-clear recommendations and module extension points", () => {
  const result = buildBeastOSIntelligence({
    now: new Date("2026-07-03T12:00:00.000Z"),
    startingCash: 2000,
    buffer: 500,
    monthlyIncome: 5000,
    monthlyBills: 1000,
    debtMinimums: 0,
    activeBills: [],
    activeDebts: [],
  });

  assert.equal(result.recommendations.length, 0);
  assert.equal(
    result.moduleSummaries.some((summary) => summary.module === "money"),
    true
  );
  assert.equal(
    result.moduleSummaries.some((summary) => summary.module === "health"),
    true
  );
  assert.equal(
    result.moduleSummaries.some(
      (summary) =>
        summary.module === "learning" &&
        summary.status === "ready" &&
        summary.href === "/dashboard/learning"
    ),
    true
  );
});

test("learning foundation uses shared platform intelligence contracts", () => {
  const result = buildLearningFoundationIntelligence(
    new Date("2026-07-03T12:00:00.000Z")
  );

  assert.equal(result.moduleSummaries[0].module, "learning");
  assert.equal(result.moduleSummaries[0].status, "ready");
  assert.equal(result.recommendations[0].module, "learning");
  assert.equal(result.recommendations[0].confidence, "reserved");
  assert.equal(result.notifications[0].module, "learning");
  assert.equal(result.activities[0].module, "learning");
  assert.equal(result.timelineEvents[0].module, "learning");
});

test("learning mock data satisfies the domain model foundation", () => {
  assert.equal(mockLearners.some((learner) => learner.active), true);
  assert.equal(mockLearningGoals.every((goal) => goal.learnerId), true);
  assert.equal(
    mockLearningCourses.some(
      (course) => course.id === mockLearningPlan.currentCourseId
    ),
    true
  );
  assert.equal(mockLearningPlan.weeklySessionTarget, 5);
  assert.equal(mockLearningSessions.every((session) => session.status), true);
  assert.equal(mockLearningProgress.some((progress) => progress.id === "mastery"), true);
  assert.equal(
    mockLearningAchievements.some((achievement) => achievement.earned),
    true
  );
  assert.equal(mockLearningSignals[0].kind, "goal");
  assert.equal(
    mockLearningQuickActions.some((action) => action.label === "Continue Learning"),
    true
  );
});

test("learning plan generator creates deterministic starter plans", () => {
  const plan = generateLearningPlan({
    learningObjective: "Security+",
    motivation: "Career growth",
    targetOutcome: "Pass the exam",
    timeline: "8 weeks",
    currentLevel: "Beginner",
    studyPace: "Focused: 5 sessions per week",
  });

  assert.equal(plan.title, "Security+ starter plan");
  assert.equal(plan.recommendedSessions.length, 3);
  assert.equal(plan.weeklyRhythm[0], "5 study sessions per week");
  assert.equal(plan.recommendedSessions[0].duration, "35 min");
  assert.equal(plan.readinessSignal.label, "Starter-ready");
  assert.equal(plan.readinessSignal.confidence, "reserved");
  assert.equal(
    plan.skillCheckpoints.some((checkpoint) =>
      checkpoint.includes("core vocabulary")
    ),
    true
  );
  assert.equal(
    plan.suggestedNextAction,
    "Schedule the first 35 min foundation scan for Security+."
  );
});

test("velocity settings helpers map persisted and stored values", () => {
  const mapped = mapVelocitySettingsRow({
    velocity_source_type: "ploc",
    credit_limit: 10000,
    current_balance: 2500,
    source_apr: 8.5,
    allow_super_velocity: true,
  });

  assert.equal(mapped.velocity_source_type, "ploc");
  assert.equal(mapped.credit_limit, "10000");
  assert.equal(mapped.max_utilization_percent, "66");
  assert.equal(mapped.recovery_months, "6");
  assert.equal(mapped.allow_super_velocity, true);

  const merged = mergeStoredVelocitySettings(
    JSON.stringify({ credit_limit: "5000" })
  );
  assert.deepEqual(merged, {
    ...DEFAULT_VELOCITY_SETTINGS,
    credit_limit: "5000",
  });

  assert.deepEqual(velocitySettingsToUpsertPayload(mapped), {
    velocity_source_type: "ploc",
    credit_limit: 10000,
    current_balance: 2500,
    source_apr: 8.5,
    max_utilization_percent: 66,
    recovery_months: 6,
    emergency_reserve_amount: null,
    allow_super_velocity: true,
  });
});

test("entitlement helpers resolve plans and roles", () => {
  const proMembership: MembershipSnapshot = {
    ...DEFAULT_FREE_MEMBERSHIP,
    plan: "pro",
    source: "database",
  };

  assert.equal(FEATURE_ENTITLEMENTS.velocity_planner.requiredPlan, "pro");
  assert.deepEqual(resolveEntitlementContext(null), {
    plan: "free",
    role: "user",
  });
  assert.deepEqual(
    resolveEntitlementContext({ role: "user", membership: proMembership }),
    {
      plan: "pro",
      role: "user",
    }
  );
  assert.deepEqual(resolveEntitlementContext({ role: "beta" }), {
    plan: "pro",
    role: "beta",
  });
});

test("hasEntitlement gates pro features while keeping free features open", () => {
  const proMembership: MembershipSnapshot = {
    ...DEFAULT_FREE_MEMBERSHIP,
    plan: "pro",
    source: "database",
  };

  assert.equal(
    hasEntitlement(
      { role: "user", membership: DEFAULT_FREE_MEMBERSHIP },
      "cashflow"
    ),
    true
  );
  assert.equal(
    hasEntitlement(
      { role: "user", membership: DEFAULT_FREE_MEMBERSHIP },
      "velocity_planner"
    ),
    false
  );
  assert.equal(
    hasEntitlement(
      { role: "user", membership: proMembership },
      "velocity_planner"
    ),
    true
  );
  assert.equal(hasEntitlement({ role: "admin" }, "beast_advisor"), true);
  assert.equal(hasEntitlement({ role: "beta" }, "scenario_planning"), true);
});

test("admin view mode changes effective entitlements without changing real context", () => {
  assert.deepEqual([...ADMIN_VIEW_MODES], ["admin", "pro", "free"]);

  const adminProfile = { role: "admin", membership: DEFAULT_FREE_MEMBERSHIP };

  assert.deepEqual(resolveEntitlementContext(adminProfile), {
    plan: "pro",
    role: "admin",
  });
  assert.deepEqual(resolveEffectiveEntitlementContext(adminProfile, "admin"), {
    plan: "pro",
    role: "admin",
  });
  assert.deepEqual(resolveEffectiveEntitlementContext(adminProfile, "pro"), {
    plan: "pro",
    role: "user",
  });
  assert.deepEqual(resolveEffectiveEntitlementContext(adminProfile, "free"), {
    plan: "free",
    role: "user",
  });
  assert.equal(isAdminViewSimulationActive(adminProfile, "free"), true);
  assert.equal(isAdminViewSimulationActive(adminProfile, "admin"), false);
});

test("admin view mode has priority over database membership", () => {
  const databaseProMembership: MembershipSnapshot = {
    ...DEFAULT_FREE_MEMBERSHIP,
    plan: "pro",
    status: "active",
    isActive: true,
    source: "database",
  };
  const adminProfile = {
    role: "admin",
    membership: databaseProMembership,
  };

  assert.deepEqual(resolveEffectiveEntitlementContext(adminProfile, "free"), {
    plan: "free",
    role: "user",
  });
  assert.deepEqual(resolveEffectiveEntitlementContext(adminProfile, "pro"), {
    plan: "pro",
    role: "user",
  });
});

test("admin view mode is ignored for non-admin users", () => {
  const proMembership: MembershipSnapshot = {
    ...DEFAULT_FREE_MEMBERSHIP,
    plan: "pro",
    source: "database",
  };
  const proUser = { role: "user", membership: proMembership };

  assert.deepEqual(resolveEffectiveEntitlementContext(proUser, "free"), {
    plan: "pro",
    role: "user",
  });
  assert.equal(isAdminViewSimulationActive(proUser, "free"), false);
});

test("membership entitlement plan falls back to Free for inactive subscriptions", () => {
  assert.equal(getMembershipEntitlementPlan(DEFAULT_FREE_MEMBERSHIP), "free");
  assert.equal(
    getMembershipEntitlementPlan({
      ...DEFAULT_FREE_MEMBERSHIP,
      plan: "pro",
      status: "trial",
      isActive: true,
    }),
    "pro"
  );
  assert.equal(
    getMembershipEntitlementPlan({
      ...DEFAULT_FREE_MEMBERSHIP,
      plan: "pro",
      status: "canceled",
      isActive: false,
    }),
    "free"
  );
});

test("Stripe billing config and price selection fail safely", () => {
  const stripeConfig = {
    secretKey: "sk_test_123",
    publishableKey: "pk_test_123",
    monthlyPriceId: "price_monthly",
    annualPriceId: "price_annual",
    successUrl: "http://localhost:3000/dashboard/money/billing?success=true",
    cancelUrl: "http://localhost:3000/dashboard/money/billing?canceled=true",
    webhookSecret: "whsec_123",
  };

  assert.deepEqual(
    getStripeBillingConfig({
      STRIPE_SECRET_KEY: "sk_test_123",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      STRIPE_PRO_MONTHLY_PRICE_ID: "price_monthly",
      STRIPE_PRO_ANNUAL_PRICE_ID: "price_annual",
      STRIPE_SUCCESS_URL: "http://localhost:3000/dashboard/money/billing?success=true",
      STRIPE_CANCEL_URL: "http://localhost:3000/dashboard/money/billing?canceled=true",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
    }),
    {
      ok: true,
      config: stripeConfig,
    }
  );

  const config = {
    monthlyPriceId: "price_monthly",
    annualPriceId: "price_annual",
  };
  assert.equal(getCheckoutPriceId("monthly", config), "price_monthly");
  assert.equal(getCheckoutPriceId("annual", config), "price_annual");
  assert.equal(
    getBillingReturnUrl(stripeConfig),
    "http://localhost:3000/dashboard/money/billing"
  );

  const missing = getStripeBillingConfig({});
  assert.equal(missing.ok, false);
  assert.ok(
    !missing.ok && missing.missing.includes("STRIPE_SECRET_KEY")
  );
});

test("Stripe checkout config validation catches unsafe setup", () => {
  const validConfig = {
    secretKey: "sk_test_123",
    publishableKey: "pk_test_123",
    monthlyPriceId: "price_monthly",
    annualPriceId: "price_annual",
    successUrl: "http://localhost:3000/dashboard/money/billing?success=true",
    cancelUrl: "http://localhost:3000/dashboard/money/billing?canceled=true",
    webhookSecret: "whsec_123",
  };

  assert.equal(getStripeCheckoutConfigIssue(validConfig), null);
  assert.equal(
    getStripeCheckoutConfigIssue({
      ...validConfig,
      publishableKey: "pk_live_123",
    }),
    "Stripe secret and publishable keys must use the same test/live mode."
  );
  assert.equal(
    getStripeCheckoutConfigIssue({
      ...validConfig,
      monthlyPriceId: "prod_123",
    }),
    "Stripe Pro price IDs must start with price_."
  );
  assert.match(
    getCheckoutStartErrorMessage("invalid_price"),
    /same Stripe test\/live mode/
  );
});

test("Checkout session params use monthly and annual Stripe prices", () => {
  const stripeConfig = {
    secretKey: "sk_test_123",
    publishableKey: "pk_test_123",
    monthlyPriceId: "price_monthly",
    annualPriceId: "price_annual",
    successUrl: "http://localhost:3000/dashboard/money/billing?success=true",
    cancelUrl: "http://localhost:3000/dashboard/money/billing?canceled=true",
    webhookSecret: "whsec_123",
  };

  const monthly = buildCheckoutSessionCreateParams({
    userId: "user-1",
    interval: "monthly",
    customerId: "cus_123",
    config: stripeConfig,
  });
  const annual = buildCheckoutSessionCreateParams({
    userId: "user-1",
    interval: "annual",
    customerId: "cus_123",
    config: stripeConfig,
  });

  assert.equal(monthly.mode, "subscription");
  assert.deepEqual(monthly.line_items, [
    { price: "price_monthly", quantity: 1 },
  ]);
  assert.equal(monthly.metadata?.user_id, "user-1");
  assert.equal(monthly.subscription_data?.metadata?.user_id, "user-1");
  assert.deepEqual(annual.line_items, [
    { price: "price_annual", quantity: 1 },
  ]);
});

test("billing guards require authentication and customer ID", () => {
  assert.deepEqual(requireBillingUser(null), {
    ok: false,
    status: 401,
    message: "Authentication required.",
  });
  assert.deepEqual(requireBillingUser({ id: "user-1" }), {
    ok: true,
    user: { id: "user-1" },
  });
  assert.deepEqual(requireStripeCustomer(DEFAULT_FREE_MEMBERSHIP), {
    ok: false,
    status: 400,
    message: "A Stripe customer is required to manage billing.",
  });
  assert.deepEqual(
    requireStripeCustomer({
      ...DEFAULT_FREE_MEMBERSHIP,
      source: "database",
      subscription: {
        id: "sub-row-1",
        user_id: "user-1",
        plan: "pro",
        status: "active",
        billing_provider: "stripe",
        provider_customer_id: "cus_123",
        provider_subscription_id: "sub_123",
        current_period_end: null,
        cancel_at_period_end: false,
        created_at: "2026-07-02T00:00:00.000Z",
        updated_at: "2026-07-02T00:00:00.000Z",
      },
    }),
    { ok: true, customerId: "cus_123" }
  );
});

test("Stripe subscription sync maps paid and unsafe statuses to membership", () => {
  assert.equal(mapStripeStatusToMembershipPlan("active"), "pro");
  assert.equal(mapStripeStatusToMembershipPlan("trialing"), "pro");
  assert.equal(mapStripeStatusToMembershipPlan("canceled"), "free");
  assert.equal(mapStripeStatusToMembershipPlan("incomplete_expired"), "free");
  assert.equal(mapStripeStatusToMembershipPlan("past_due"), "free");
  assert.equal(mapStripeStatusToMembershipStatus("trialing"), "trial");
  assert.equal(mapStripeStatusToMembershipStatus("unpaid"), "past_due");
  assert.equal(
    mapStripeStatusToMembershipStatus("incomplete_expired"),
    "incomplete"
  );

  assert.deepEqual(
    buildMembershipUpdateFromStripeSubscription({
      id: "sub_123",
      customer: "cus_123",
      status: "active",
      current_period_end: 1782950400,
      cancel_at_period_end: false,
      metadata: { user_id: "user-1" },
    }),
    {
      userId: "user-1",
      plan: "pro",
      status: "active",
      providerCustomerId: "cus_123",
      providerSubscriptionId: "sub_123",
      currentPeriodEnd: "2026-07-02T00:00:00.000Z",
      cancelAtPeriodEnd: false,
    }
  );

  assert.deepEqual(
    buildMembershipUpdateFromStripeSubscription({
      id: "sub_123",
      customer: "cus_123",
      status: "past_due",
      metadata: { user_id: "user-1" },
    })?.plan,
    "free"
  );
  assert.deepEqual(
    buildMembershipUpdateFromStripeSubscription({
      id: "sub_123",
      customer: { id: "cus_123" },
      status: "canceled",
      metadata: { user_id: "user-1" },
    })?.status,
    "canceled"
  );
});

test("legacy syncSubscription interface no longer performs direct Stripe writes", async () => {
  assert.equal(
    (await syncSubscription({ userId: "user-1" })).message,
    "Subscription sync is handled by the Stripe webhook endpoint."
  );
});

test("due date reset payload only clears projected override date", () => {
  assert.deepEqual(buildResetDueDatePayload(), {
    next_due_date_after_payment: null,
  });
  assert.equal("assigned_paycheck" in buildResetDueDatePayload(), false);
  assert.equal("funding_source_id" in buildResetDueDatePayload(), false);
});
