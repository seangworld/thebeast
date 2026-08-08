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

test("canonical schedule drives payoff months and records exact per-debt monthly math", () => {
  const result = runUnifiedStrategyEngine({
    debts: [{ id: "card", name: "Card", balance: 100, minimum_payment: 60, interest_rate: 0 }],
    strategy: "minimum",
  });

  assert.equal(result.payoff_complete, true);
  assert.equal(result.months_to_payoff, result.payment_schedule.length);
  assert.equal(result.months_to_payoff, 2);
  assert.deepEqual(result.debt_payment_schedule, [
    { month: 1, debt_id: "card", debt_name: "Card", opening_balance: 100, interest: 0, required_payment: 60, additional_payment: 0, total_payment: 60, principal_reduction: 60, closing_balance: 40, paid_off: false },
    { month: 2, debt_id: "card", debt_name: "Card", opening_balance: 40, interest: 0, required_payment: 40, additional_payment: 0, total_payment: 40, principal_reduction: 40, closing_balance: 0, paid_off: true },
  ]);
});

test("rollover, zero-interest, exclusions, and changed authoritative inputs stay deterministic", () => {
  const base = [
    { id: "small", name: "Small", balance: 50, minimum_payment: 50, interest_rate: 0 },
    { id: "large", name: "Large", balance: 300, minimum_payment: 50, interest_rate: 12 },
  ];
  const result = runUnifiedStrategyEngine({ debts: base, strategy: "snowball", extraPayment: 50 });
  assert.equal(result.debt_payment_schedule.find((row) => row.month === 1 && row.debt_id === "large")?.additional_payment, 50);
  assert.equal(result.debt_payment_schedule.find((row) => row.month === 2 && row.debt_id === "large")?.additional_payment, 100);

  const afterOutsidePayment = runUnifiedStrategyEngine({ debts: [{ ...base[1], balance: 200 }], strategy: "avalanche", extraPayment: 50 });
  const afterReversal = runUnifiedStrategyEngine({ debts: [{ ...base[1], balance: 250 }], strategy: "avalanche", extraPayment: 50 });
  const afterAprChange = runUnifiedStrategyEngine({ debts: [{ ...base[1], balance: 250, interest_rate: 24 }], strategy: "avalanche", extraPayment: 50 });
  const afterCashFlowChange = runUnifiedStrategyEngine({ debts: [{ ...base[1], balance: 250 }], strategy: "avalanche", extraPayment: 100 });
  assert.ok(afterOutsidePayment.total_interest < afterReversal.total_interest);
  assert.ok(afterAprChange.total_interest > afterReversal.total_interest);
  assert.ok(afterCashFlowChange.months_to_payoff < afterReversal.months_to_payoff);
});

test("zero balances are complete and Velocity includes source recovery in payoff duration", () => {
  const empty = runUnifiedStrategyEngine({ debts: [{ id: "paid", name: "Paid", balance: 0, minimum_payment: 25, interest_rate: 20 }], strategy: "snowball" });
  assert.equal(empty.payoff_complete, true);
  assert.equal(empty.months_to_payoff, 0);

  const result = runUnifiedStrategyEngine({
    debts: [{ id: "card", name: "Card", balance: 500, minimum_payment: 100, interest_rate: 24 }],
    strategy: "velocity",
    velocityEngineResult: {
      target_debt: { id: "card", name: "Card", balance: 500, minimum_payment: 100, interest_rate: 24 },
      chunk_recommendation: { recommended_chunk: 500 } as never,
      interest_savings: { source_apr: 0 } as never,
      recovery_timeline: { monthly_recovery_capacity: 100 } as never,
      recommendation: { debt_id: "card" } as never,
    } as never,
  });
  assert.equal(result.payoff_complete, true);
  assert.equal(result.months_to_payoff, 5);
  assert.equal(result.payment_schedule[0].remaining_debt, 400);
  assert.equal(result.payment_schedule.at(-1)?.remaining_debt, 0);
});
