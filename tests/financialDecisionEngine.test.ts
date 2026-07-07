import assert from "node:assert/strict";
import test from "node:test";
import { buildCashIntelligence } from "../src/lib/cashIntelligence";
import { buildFinancialDecision } from "../src/lib/financialDecisionEngine";

test("buildFinancialDecision recommends a safe extra payment and debt target", () => {
  const cashIntelligence = buildCashIntelligence({
    asOfDate: new Date("2026-07-01T00:00:00"),
    income: [
      {
        amount: 2500,
        frequency: "monthly",
        next_date: "2026-07-02",
      },
    ],
    bills: [
      {
        amount: 700,
        due_date: 4,
      },
    ],
    debtMinimums: [
      {
        id: "card-a",
        name: "Card A",
        balance: 2000,
        minimum_payment: 100,
        interest_rate: 19,
      },
      {
        id: "card-b",
        name: "Card B",
        balance: 1000,
        minimum_payment: 50,
        interest_rate: 12,
      },
    ],
    settings: {
      currentCash: 900,
      cashBuffer: 400,
    },
  });

  const decision = buildFinancialDecision({
    cashIntelligence,
    debts: [
      {
        id: "card-a",
        name: "Card A",
        balance: 2000,
        minimum_payment: 100,
        interest_rate: 19,
      },
      {
        id: "card-b",
        name: "Card B",
        balance: 1000,
        minimum_payment: 50,
        interest_rate: 12,
      },
    ],
    income: [{ amount: 2500 }],
    bills: [{ amount: 700 }],
    strategy: "avalanche",
  });

  assert.equal(decision.action, "make_extra_payment");
  assert.equal(decision.shouldWait, false);
  assert.equal(decision.safetyRating, "safe");
  assert.equal(decision.targetDebt?.id, "card-a");
  assert.equal(decision.suggestedExtraPayment, 350);
  assert.equal(
    decision.reason,
    "This payment preserves the cash reserve and current planning guardrails."
  );
});

test("buildFinancialDecision recommends waiting when guardrails fail", () => {
  const cashIntelligence = buildCashIntelligence({
    asOfDate: new Date("2026-07-01T00:00:00"),
    income: [],
    bills: [
      {
        amount: 900,
        due_date: 2,
      },
    ],
    debtMinimums: [
      {
        id: "card-a",
        name: "Card A",
        balance: 2000,
        minimum_payment: 150,
      },
    ],
    settings: {
      currentCash: 700,
      cashBuffer: 500,
    },
  });

  const decision = buildFinancialDecision({
    cashIntelligence,
    debts: [
      {
        id: "card-a",
        name: "Card A",
        balance: 2000,
        minimum_payment: 150,
      },
    ],
  });

  assert.equal(decision.action, "restore_buffer");
  assert.equal(decision.shouldWait, true);
  assert.equal(decision.safetyRating, "unsafe");
  assert.equal(decision.suggestedExtraPayment, 0);
  assert.ok(decision.guardrailViolations.length > 0);
});

test("buildFinancialDecision maintains plan when no active debt exists", () => {
  const cashIntelligence = buildCashIntelligence({
    settings: {
      currentCash: 1500,
      cashBuffer: 500,
    },
  });

  const decision = buildFinancialDecision({
    cashIntelligence,
    debts: [],
  });

  assert.equal(decision.action, "maintain");
  assert.equal(decision.shouldWait, false);
  assert.equal(decision.suggestedExtraPayment, 0);
  assert.equal(decision.targetDebt, null);
});
