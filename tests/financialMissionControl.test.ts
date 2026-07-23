import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildFinancialMissionControl, type BuildFinancialMissionControlInput } from "../src/lib/financialMissionControl";

const input: BuildFinancialMissionControlInput = {
  ownerId: "owner-1",
  asOf: "2026-07-23T12:00:00.000Z",
  financialHealthScore: 78,
  healthBand: "stable",
  healthSummary: "Current cash flow and reserve are stable.",
  monthlyIncome: 6000,
  monthlyOutflow: 4300,
  monthlyBills: 2500,
  debtMinimums: 800,
  projectedSurplus: 1700,
  startingCash: 5000,
  cashBuffer: 2500,
  totalDebt: 16000,
  debtProgressPercent: 35,
  monthlyDebtReduction: 900,
  debtFreedomCountdown: "18 months",
  cashEfficiency: 28,
  retirementDataAvailable: false,
  scenarios: [
    { id: "avalanche", label: "Avalanche", monthsToPayoff: 18, totalInterest: 1400, monthlyCashStrain: 900, riskLevel: "low" },
    { id: "velocity", label: "Velocity", monthsToPayoff: 16, totalInterest: 1250, monthlyCashStrain: 1100, riskLevel: "moderate" },
  ],
  upcomingObligations: [{ id: "bill-1", name: "Mortgage", amount: 1800, dueLabel: "Jul 25" }],
  observations: [],
  benchmarks: [],
  recommendedFocus: { title: "Protect the reserve", action: "Keep the cash buffer intact before another payment.", why: "Upcoming obligations use most immediately available cash.", href: "/dashboard/money/cashflow" },
};

test("BM-304 builds all required explainable hero summaries from existing values", () => {
  const model = buildFinancialMissionControl(input);
  assert.deepEqual(model.heroCards.map((card) => card.label), [
    "Financial Health Score",
    "Monthly Surplus",
    "Cash Available",
    "Debt Remaining",
    "Retirement Readiness",
    "Emergency Fund Status",
  ]);
  assert.ok(model.heroCards.every((card) => card.href.startsWith("/dashboard/money")));
  assert.ok(model.heroCards.every((card) => card.explanation.evidence.length > 0));
  assert.ok(model.heroCards.every((card) => card.explanation.action?.toolId));
  assert.ok(model.heroCards.every((card) => card.explanation.authoritativeEvidenceIds.length > 0));
});

test("BM-304 keeps unavailable retirement readiness honest", () => {
  const retirement = buildFinancialMissionControl(input).heroCards.find((card) => card.id === "retirement-readiness");
  assert.equal(retirement?.value, "Not configured");
  assert.match(retirement?.explanation.limitations[0] || "", /No retirement readiness estimate/);
});

test("BM-304 provides debt cash spending savings velocity obligations and strategy data", () => {
  const model = buildFinancialMissionControl(input);
  assert.equal(model.debt.remaining, 16000);
  assert.equal(model.cashFlow.surplus, 1700);
  assert.equal(model.spending.bills, 2500);
  assert.equal(model.savings.monthlySurplus, 1700);
  assert.equal(model.velocity.available, true);
  assert.equal(model.upcomingObligations[0].name, "Mortgage");
  assert.equal(model.scenarios.length, 2);
  assert.equal(model.recommendedFocus.title, "Protect the reserve");
});

test("BM-304 dashboard view is dedicated responsive and accessible", () => {
  const source = readFileSync("src/app/dashboard/money/components/FinancialMissionControl.tsx", "utf8");
  assert.match(source, /data-financial-mission-control="true"/);
  assert.match(source, /Financial Mission Control/);
  assert.match(source, /sm:grid-cols-2/);
  assert.match(source, /xl:grid-cols-12/);
  assert.match(source, /role="progressbar"/);
  assert.match(source, /aria-labelledby/);
  assert.match(source, /focus-visible:outline/);
  assert.match(source, /min-h-\[44px\]/);
  [
    "Cash-flow trend",
    "Debt payoff progress",
    "Monthly spending",
    "Savings trend",
    "Retirement progress",
    "Velocity progress",
    "Upcoming obligations",
    "Observation Center",
    "Recommended focus",
    "Strategy comparison",
  ].forEach((title) => assert.match(source, new RegExp(title)));
});

test("BM-304 Dashboard and Money Coach retain separate render paths", () => {
  const workspace = readFileSync("src/app/dashboard/money/components/MoneyWorkspacePage.tsx", "utf8");
  const dashboardRoute = readFileSync("src/app/dashboard/money/dashboard/page.tsx", "utf8");
  const coachRoute = readFileSync("src/app/dashboard/money/page.tsx", "utf8");
  assert.match(workspace, /view === "dashboard"/);
  assert.match(workspace, /FinancialMissionControl/);
  assert.match(dashboardRoute, /view="dashboard"/);
  assert.match(coachRoute, /view="coach"/);
});

test("BM-315 gives Mission Control polished responsive loading and empty states", () => {
  const source = readFileSync("src/app/dashboard/money/components/FinancialMissionControl.tsx", "utf8");
  const workspace = readFileSync("src/app/dashboard/money/components/MoneyWorkspacePage.tsx", "utf8");

  assert.match(source, /data-financial-mission-control-loading="true"/);
  assert.match(source, /aria-busy="true"/);
  assert.match(source, /animate-pulse/);
  assert.match(source, /data-financial-mission-control-empty="true"/);
  assert.match(source, /Build your financial picture/);
  assert.match(source, /space-y-8[\s\S]*sm:space-y-10/);
  assert.match(source, /grid items-stretch gap-5/);
  assert.match(source, /transition duration-300/);
  assert.match(source, /hover:-translate-y-1/);
  assert.match(source, /sm:grid-cols-3/);
  assert.doesNotMatch(source, />Current score</);
  assert.match(workspace, /<FinancialMissionControlLoading/);
  assert.match(workspace, /data-financial-mission-control-error="true"/);
  assert.match(workspace, /role="alert"/);
});
