import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildFinancialHealthScore } from "../src/lib/financialHealthScore";
import {
  answerMoneyCoachQuestion,
  buildMoneyCoachExperience,
  classifyMoneyCoachIntent,
} from "../src/lib/moneyCoachExperience";
import { buildMoneyDebtAwareness } from "../src/lib/moneyDebtAwareness";

const awareness = buildMoneyDebtAwareness({
  now: new Date(2026, 7, 10),
  debts: [
    {
      id: "visa",
      name: "Visa",
      balance: 2_000,
      minimum_payment: 125,
      interest_rate: 24,
      previous_interest_rate: 18,
      interest_rate_updated_at: "2026-08-08T12:00:00Z",
      next_due_date_after_payment: "2026-08-07",
    },
    {
      id: "car",
      name: "Car Loan",
      balance: 12_000,
      minimum_payment: 425,
      interest_rate: 6,
      next_due_date_after_payment: "2026-08-11",
    },
    {
      id: "loan",
      name: "Personal Loan",
      balance: 4_000,
      minimum_payment: 175,
      interest_rate: 10,
      next_due_date_after_payment: "2026-08-25",
    },
  ],
  payments: [
    {
      id: "visa-july",
      debt_id: "visa",
      amount: 250,
      payment_date: "2026-07-07",
      cycle_due_date: "2026-07-07",
      action_type: "custom",
    },
  ],
});

const coachInput = {
  ownerId: "owner-bm37",
  userName: "Sean",
  asOfDate: new Date(2026, 7, 10, 9),
  activeBillCount: 0,
  billsDueSoonCount: 0,
  monthlyBills: 0,
  activeDebtCount: 3,
  totalDebt: 18_000,
  projectedDebtReduction: 550,
  debtProgressPercent: 3,
  monthlyIncome: 6_000,
  monthlyOutflow: 4_500,
  projectedSurplus: 1_500,
  currentCash: 5_000,
  cashBuffer: 2_000,
  utilization: 32,
  fundingSourceCount: 1,
  safeFundingSourceCapacity: 1_000,
  assignedIncomePotCount: 2,
  totalObligationCount: 3,
  recommendationTitle: "Review Visa",
  recommendationAction: "Resolve the overdue required payment before adding another debt attack.",
  recommendationWhy: "Visa is three days late in the current debt cycle.",
  recommendationHref: "/dashboard/money/debts",
  interestSaved: 400,
  timeSavedMonths: 2,
  debtAwareness: awareness,
};

test("BM-37 recognizes debt timing, missed payments, history, interest changes, and payoff progress", () => {
  assert.equal(awareness.overdueCount, 1);
  assert.equal(awareness.missedPaymentCount, 1);
  assert.equal(awareness.dueSoonCount, 1);
  assert.equal(awareness.upcomingCount, 1);
  assert.equal(awareness.paymentCount, 1);
  assert.equal(awareness.interestChangeCount, 1);
  assert.equal(awareness.immediateAttention[0]?.name, "Visa");
  assert.equal(awareness.immediateAttention[0]?.dueDetail, "3 days late");
  assert.equal(awareness.immediateAttention[0]?.minimumDue, 125);
  assert.equal(awareness.immediateAttention[0]?.payoffProgressPercent, 11);
  assert.deepEqual(awareness.items[0]?.interestChange, {
    previousRate: 18,
    currentRate: 24,
    percentagePointChange: 6,
    changedAt: "2026-08-08T12:00:00Z",
  });
  assert.equal(awareness.immediateAttention[1]?.name, "Car Loan");
  assert.equal(awareness.immediateAttention[1]?.dueDetail, "Due tomorrow");
});

test("BM-37 makes Money Coach proactive and explains debt impacts and options", () => {
  const model = buildMoneyCoachExperience(coachInput);
  assert.match(model.conversationOpening, /Visa is overdue.*3 days late/i);
  assert.equal(model.cards[0]?.id, "debt-immediate-attention");
  assert.equal(classifyMoneyCoachIntent("What overdue debt payments did I miss?"), "debt-status");
  const response = answerMoneyCoachQuestion("Explain my debt payment history and payoff progress", model);
  assert.equal(response.intent, "debt-status");
  assert.match(response.text, /Current debt status/);
  assert.match(response.text, /Why it matters and what options exist/);
  assert.match(response.text, /Impact on payoff, Financial Health, and Velocity Banking/);
  assert.match(response.text, /Payment history/);
  assert.match(response.text, /Interest changes/);
  assert.match(response.text, /Visa/);
  assert.match(response.text, /Car Loan/);
});

test("BM-37 documents and applies the debt timeliness scoring penalty", () => {
  const result = buildFinancialHealthScore({
    monthlyIncome: 5_000,
    monthlyOutflow: 4_000,
    projectedSurplus: 1_000,
    currentCash: 6_000,
    cashBuffer: 2_000,
    totalDebt: 10_000,
    debtMinimums: 500,
    creditUtilization: 20,
    retirementProgressPercent: 60,
    goalProgressPercent: 50,
    consistencyPercent: 80,
    planningCompletenessPercent: 100,
    overdueDebtCount: 1,
    missedDebtPaymentCount: 1,
  });
  const debt = result.components.find((component) => component.id === "debt");
  assert.equal(debt?.score, 53);
  assert.equal(result.score, 74);
  assert.match(debt?.calculation || "", /10 points per overdue debt/);
  assert.match(debt?.evidence.join(" ") || "", /timeliness penalty: 25/);
  const docs = readFileSync("docs/BM-37-MONEY-COACH-DEBT-AWARENESS.md", "utf8");
  assert.match(docs, /maximum direct overall reduction[\s\S]*eight points/i);
});

test("BM-37 renders Dashboard Immediate Attention and durably tracks rate changes", () => {
  const workspace = readFileSync(
    "src/app/dashboard/money/components/MoneyWorkspacePage.tsx",
    "utf8"
  );
  assert.match(workspace, /Immediate Attention/);
  assert.match(workspace, /Minimum Due/);
  assert.match(workspace, /MISSED PAYMENT/);
  assert.match(workspace, /Review Payment Options/);
  const migration = readFileSync(
    "supabase/migrations/20260801000300_track_debt_interest_changes.sql",
    "utf8"
  );
  assert.match(migration, /previous_interest_rate/);
  assert.match(migration, /before update of interest_rate/);
  assert.match(migration, /new\.previous_interest_rate := old\.interest_rate/);
});
