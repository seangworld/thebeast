import assert from "node:assert/strict";
import test from "node:test";
import { buildCashIntelligence } from "../src/lib/cashIntelligence";
import { buildFinancialDecision } from "../src/lib/financialDecisionEngine";
import { runUnifiedStrategyEngine } from "../src/lib/unifiedStrategyEngine";

const debts = [
  {
    id: "small-card",
    name: "Small Card",
    balance: 500,
    minimum_payment: 25,
    interest_rate: 12,
  },
  {
    id: "large-card",
    name: "Large Card",
    balance: 2500,
    minimum_payment: 75,
    interest_rate: 24,
  },
];

test("runUnifiedStrategyEngine supports minimum, snowball, avalanche, and custom targets", () => {
  const minimum = runUnifiedStrategyEngine({
    debts,
    strategy: "minimum",
    extraPayment: 200,
  });
  const snowball = runUnifiedStrategyEngine({
    debts,
    strategy: "snowball",
    extraPayment: 200,
  });
  const avalanche = runUnifiedStrategyEngine({
    debts,
    strategy: "avalanche",
    extraPayment: 200,
  });
  const custom = runUnifiedStrategyEngine({
    debts,
    strategy: "custom",
    extraPayment: 200,
    customDebtOrder: ["large-card", "small-card"],
  });

  assert.equal(minimum.first_target, "—");
  assert.equal(minimum.recommended_extra_payment, 0);
  assert.equal(snowball.first_target, "Small Card");
  assert.equal(avalanche.first_target, "Large Card");
  assert.equal(custom.first_target, "Large Card");
  assert.equal(custom.payment_schedule, custom.payoff_months);
});

test("runUnifiedStrategyEngine consumes financial decision output for extra payments", () => {
  const cashIntelligence = buildCashIntelligence({
    asOfDate: new Date("2026-07-01T00:00:00"),
    income: [{ amount: 2500, frequency: "monthly", next_date: "2026-07-02" }],
    bills: [{ amount: 700, due_date: 4 }],
    debtMinimums: debts,
    settings: {
      currentCash: 900,
      cashBuffer: 400,
    },
  });
  const financialDecision = buildFinancialDecision({
    cashIntelligence,
    debts,
    income: [{ amount: 2500 }],
    bills: [{ amount: 700 }],
    strategy: "avalanche",
  });
  const result = runUnifiedStrategyEngine({
    debts,
    strategy: "avalanche",
    cashIntelligence,
    financialDecision,
    extraPayment: 9999,
  });

  assert.equal(financialDecision.suggestedExtraPayment, 400);
  assert.equal(result.recommended_extra_payment, 400);
  assert.equal(result.recommended_action, financialDecision.recommendedAction);
  assert.equal(result.safety_rating, financialDecision.safetyRating);
  assert.equal(result.confidence_score, financialDecision.confidenceScore);
});
