import test from "node:test";
import assert from "node:assert/strict";
import { buildPayoffPlanDisplayRows, parsePayoffColumnPreference } from "../src/lib/payoffPlanView";
import type { UnifiedStrategyResult } from "../src/lib/unifiedStrategyEngine";

const result: UnifiedStrategyResult = {
  strategy: "snowball", months_to_payoff: 2, total_interest: 15, total_paid: 215, first_target: "Card",
  recommended_extra_payment: 50, recommended_action: "Continue", safety_rating: "safe", confidence_score: 1,
  guardrail_violations: [], funding_source_assumptions: [], velocity_chunk_applied: 0, velocity_source_interest: 0, velocity_source_paid: 0,
  payoff_months: [
    { month: 1, target: "Card", starting_balance: 200, interest_paid: 10, principal_paid: 90, total_payment: 100, remaining_debt: 110, debt_starting_balance: 200, required_minimum: 50, monthly_interest: 10, principal_reduction: 90, recommended_minimum: 50, extra_attack: 50, debt_ending_balance: 110, recovered_minimum: 0, paid_off: false, warning: "" },
    { month: 2, target: "Card", starting_balance: 110, interest_paid: 5, principal_paid: 110, total_payment: 115, remaining_debt: 0, debt_starting_balance: 110, required_minimum: 50, monthly_interest: 5, principal_reduction: 110, recommended_minimum: 50, extra_attack: 65, debt_ending_balance: 0, recovered_minimum: 50, paid_off: true, warning: "" },
  ],
  payment_schedule: [],
};

test("Payoff Plan display preserves engine calculations and derives progressive row details", () => {
  const rows = buildPayoffPlanDisplayRows(result, [{ id: "debt-1", name: "Card", interest_rate: 18 }], new Date(2026, 6, 1));
  assert.equal(rows[0].apr, 18);
  assert.equal(rows[0].total_payment, 100);
  assert.equal(rows[0].totalProjectedInterest, 15);
  assert.equal(rows[0].remainingInterest, 15);
  assert.equal(rows[1].remainingInterest, 5);
  assert.equal(rows[0].monthsRemaining, 1);
  assert.equal(rows[1].status, "Paid off");
  assert.equal(rows[0].payoffDate, "Sep 2026");
});

test("Payoff Plan column preferences accept only supported optional columns", () => {
  assert.deepEqual(parsePayoffColumnPreference('["month","remainingInterest","unsafe"]'), ["month", "remainingInterest"]);
  assert.deepEqual(parsePayoffColumnPreference("invalid"), []);
  assert.deepEqual(parsePayoffColumnPreference(null), []);
});

test("Payoff Plan uses six default columns, row details, local preferences, and phone cards", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile("src/app/dashboard/money/debts/page.tsx", "utf8");
  const css = await readFile("src/app/globals.css", "utf8");
  for (const column of ["Debt", "Balance", "APR", "Planned Payment", "Payoff Date", "Status"]) assert.match(source, new RegExp(`>${column}<`));
  for (const detail of ["Minimum payment", "Remaining interest", "Total projected interest", "Months remaining", "Funding source", "Velocity Banking details", "Scenario assumptions", "Notes"]) assert.match(source, new RegExp(detail));
  assert.match(source, /data-payoff-plan-cards/);
  assert.doesNotMatch(source, /money-payoff-table w-full min-w-/);
  assert.match(source, /PAYOFF_COLUMNS_STORAGE_KEY/);
  assert.match(css, /\.money-payoff-table[\s\S]*max-width: 100%/);
  assert.match(css, /max-width: 1279px[\s\S]*payoff-hide-laptop/);
  assert.match(css, /max-width: 1023px[\s\S]*payoff-hide-tablet/);
});
