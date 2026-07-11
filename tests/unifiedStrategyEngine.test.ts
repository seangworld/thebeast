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

test("runUnifiedStrategyEngine applies revolving minimums and excludes debts from attack targeting", () => {
  const result = runUnifiedStrategyEngine({
    debts: [
      {
        id: "excluded-card",
        name: "Excluded Card",
        balance: 5000,
        minimum_payment: 50,
        interest_rate: 29,
        is_excluded: true,
        payment_behavior: "revolving",
        minimum_payment_rate: 3,
        minimum_payment_floor: 35,
      },
      {
        id: "active-card",
        name: "Active Card",
        balance: 2000,
        minimum_payment: 40,
        interest_rate: 18,
      },
    ],
    strategy: "custom",
    customDebtOrder: ["excluded-card", "active-card"],
    extraPayment: 200,
  });

  assert.equal(result.first_target, "Active Card");
  assert.equal(result.payment_schedule[0].required_minimum, 40);
  assert.equal(result.payment_schedule[0].extra_attack, 196.38);
  assert.equal(result.payment_schedule[0].starting_balance, 7000);
  assert.equal(result.payment_schedule[0].total_payment, 390);
});

test("runUnifiedStrategyEngine states Velocity funding source assumptions", () => {
  const result = runUnifiedStrategyEngine({
    strategy: "velocity",
    debts: [
      {
        id: "card-a",
        name: "Card A",
        balance: 5000,
        minimum_payment: 100,
        interest_rate: 24,
      },
      {
        id: "card-b",
        name: "Card B",
        balance: 1000,
        minimum_payment: 50,
        interest_rate: 12,
      },
    ],
    velocityInputSnapshot: {
      as_of_date: "2026-07-01",
      accounts: [
        {
          id: "cash",
          name: "Checking",
          type: "checking",
          current_balance: 2000,
        },
        {
          id: "source",
          name: "HELOC",
          type: "heloc",
          current_balance: 1000,
          credit_limit: 10000,
          available_credit: 9000,
          interest_rate: 8,
        },
      ],
      incomes: [
        {
          id: "income",
          name: "Paycheck",
          amount: 3200,
          frequency: "monthly",
          next_date: "2026-07-03",
        },
      ],
      bills: [
        {
          id: "mortgage",
          name: "Mortgage",
          amount: 1200,
          is_archived: false,
        },
      ],
      debts: [
        {
          id: "card-a",
          name: "Card A",
          balance: 5000,
          minimum_payment: 100,
          interest_rate: 24,
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
        cash_buffer: 500,
        max_recommended_payment: 500,
        max_source_utilization_percent: 90,
        minimum_cash_after_payment: 500,
        monthly_recovery_capacity: 250,
        recovery_months: 6,
        strategy: "aggressive",
      },
    },
  });

  assert.equal(result.first_target, "Card A");
  assert.equal(result.velocity_chunk_applied, 500);
  assert.equal(
    result.funding_source_assumptions.some((assumption) =>
      assumption.includes("HELOC") && assumption.includes("8% APR")
    ),
    true
  );
  assert.equal(
    result.funding_source_assumptions.some((assumption) =>
      assumption.includes("15% projected utilization")
    ),
    true
  );
  assert.equal(
    result.funding_source_assumptions.some((assumption) =>
      assumption.includes("250 monthly recovery capacity over 6 months")
    ),
    true
  );
  assert.equal(
    result.funding_source_assumptions.some((assumption) =>
      assumption.includes("preserve 500")
    ),
    true
  );
});
