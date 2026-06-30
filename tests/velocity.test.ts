import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVelocityAdvisorResult,
  buildVelocityInputSnapshot,
  runVelocityEngine,
} from "../src/lib/velocity";
import { simulatePayoffPlan } from "../src/lib/payoffPlan";
import type { VelocityInputSnapshot } from "../src/lib/velocity";

function baseInput(overrides: Partial<VelocityInputSnapshot> = {}): VelocityInputSnapshot {
  return {
    as_of_date: "2026-06-30",
    accounts: [
      {
        id: "cash",
        name: "Checking",
        type: "checking",
        current_balance: 2000,
      },
    ],
    incomes: [
      {
        id: "income-1",
        name: "Paycheck",
        amount: 3000,
        frequency: "monthly",
        next_date: "2026-07-01",
      },
    ],
    bills: [
      {
        id: "bill-1",
        name: "Rent",
        amount: 1000,
        due_date: 1,
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
      minimum_cash_after_payment: 500,
      monthly_recovery_capacity: 250,
      recovery_months: 6,
      strategy: "aggressive",
    },
    ...overrides,
  };
}

test("buildVelocityInputSnapshot maps debts, income, bills, and settings", () => {
  const snapshot = buildVelocityInputSnapshot({
    as_of_date: "2026-07-01",
    debts: [
      {
        id: "debt-1",
        name: "Rewards Card",
        balance: "2400.50",
        minimum_payment: "80",
        interest_rate: "19.99",
        due_date: "15",
        is_archived: false,
      },
    ],
    incomes: [
      {
        id: "income-1",
        name: "Primary Paycheck",
        amount: "2500",
        next_date: "2026-07-03",
        frequency: "biweekly",
      },
    ],
    bills: [
      {
        id: "bill-1",
        name: "Mortgage",
        amount: "1200",
        due_date: "1",
        next_due_date_after_payment: "2026-08-01",
        frequency: "monthly",
        is_archived: false,
      },
    ],
    velocity_settings: {
      velocity_source_type: "heloc",
      credit_limit: "5000",
      current_balance: "1000",
      source_apr: "8.5",
      max_utilization_percent: "50",
      recovery_months: "6",
      emergency_reserve_amount: "200",
      allow_super_velocity: false,
    },
    starting_balance: "1800",
    cash_buffer: "500",
    extra_attack: "450",
  });

  assert.equal(snapshot.as_of_date, "2026-07-01");
  assert.equal(snapshot.accounts[0].current_balance, 1800);
  assert.equal(snapshot.accounts[1].type, "heloc");
  assert.equal(snapshot.accounts[1].available_credit, 4000);
  assert.deepEqual(snapshot.debts[0], {
    id: "debt-1",
    name: "Rewards Card",
    balance: 2400.5,
    minimum_payment: 80,
    interest_rate: 19.99,
    due_date: 15,
    is_archived: false,
  });
  assert.deepEqual(snapshot.incomes[0], {
    id: "income-1",
    name: "Primary Paycheck",
    amount: 2500,
    next_date: "2026-07-03",
    frequency: "biweekly",
  });
  assert.deepEqual(snapshot.bills[0], {
    id: "bill-1",
    name: "Mortgage",
    amount: 1200,
    due_date: 1,
    next_due_date: "2026-08-01",
    is_archived: false,
  });
  assert.equal(snapshot.settings.cash_buffer, 500);
  assert.equal(snapshot.settings.minimum_cash_after_payment, 200);
  assert.equal(snapshot.settings.max_recommended_payment, 1300);
  assert.equal(snapshot.settings.max_source_utilization_percent, 50);
  assert.equal(snapshot.settings.monthly_recovery_capacity, 1300);
  assert.equal(snapshot.settings.recovery_months, 6);
  assert.equal(snapshot.settings.strategy, "conservative");
});

test("runVelocityEngine recommends a safe highest APR payment", () => {
  const result = runVelocityEngine(baseInput());

  assert.equal(result.is_valid, true);
  assert.equal(result.target_debt?.id, "card-a");
  assert.equal(result.recommendation?.kind, "highest_apr");
  assert.equal(result.recommendation?.debt_id, "card-a");
  assert.equal(result.recommendation?.payment_amount, 500);
  assert.equal(result.chunk_recommendation?.recommended_chunk, 500);
  assert.equal(result.chunk_recommendation?.limiting_constraint_id, "safe_source_capacity");
  assert.equal(result.cashflow_projection?.projected_income, 3000);
  assert.equal(result.cashflow_projection?.projected_bills, 1000);
  assert.equal(result.cashflow_projection?.projected_minimum_payments, 150);
  assert.deepEqual(result.recovery_timeline, {
    months_required: 2,
    recovery_months: 6,
    monthly_recovery_capacity: 250,
    status: "Within Guardrails",
    completion_date: "August 2026",
  });
  assert.equal(result.interest_savings?.target_debt_id, "card-a");
  assert.equal(result.interest_savings?.velocity_payment_amount, 500);
  assert.equal(
    Number(result.interest_savings?.projected_interest_saved || 0) > 0,
    true
  );
  assert.equal(
    Number(result.interest_savings?.baseline_total_interest || 0) >
      Number(result.interest_savings?.velocity_total_interest || 0),
    true
  );
  assert.equal(result.interest_savings?.gross_interest_saved, result.interest_savings?.net_interest_saved);
  assert.equal(result.interest_savings?.velocity_source_interest_cost, 0);
  assert.equal(result.interest_savings?.assumptions.length, 5);
});

test("runVelocityEngine subtracts low APR Velocity source cost from gross savings", () => {
  const result = runVelocityEngine(
    baseInput({
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
          interest_rate: 6,
        },
      ],
    })
  );

  assert.equal(result.interest_savings?.source_apr, 6);
  assert.equal(result.interest_savings?.source_starting_balance, 1000);
  assert.equal(result.interest_savings?.source_balance_after_velocity_payment, 1500);
  assert.equal(result.interest_savings?.monthly_source_repayment, 250);
  assert.equal(result.interest_savings?.source_repayment_completed, true);
  assert.equal(
    Number(result.interest_savings?.velocity_source_interest_cost || 0) > 0,
    true
  );
  assert.equal(
    Number(result.interest_savings?.gross_interest_saved || 0) >
      Number(result.interest_savings?.net_interest_saved || 0),
    true
  );
  assert.equal(
    Number(result.interest_savings?.net_interest_saved || 0) > 0,
    true
  );
  assert.equal(
    result.interest_savings?.projected_interest_saved,
    result.interest_savings?.net_interest_saved
  );
});

test("runVelocityEngine holds cash when projected net savings are negative", () => {
  const result = runVelocityEngine(
    baseInput({
      accounts: [
        {
          id: "cash",
          name: "Checking",
          type: "checking",
          current_balance: 2000,
        },
        {
          id: "source",
          name: "High APR Source",
          type: "credit_card",
          current_balance: 1000,
          credit_limit: 10000,
          available_credit: 9000,
          interest_rate: 120,
        },
      ],
      settings: {
        cash_buffer: 500,
        max_recommended_payment: 500,
        max_source_utilization_percent: 100,
        minimum_cash_after_payment: 500,
        monthly_recovery_capacity: 10,
        recovery_months: 6,
        strategy: "aggressive",
      },
    })
  );

  assert.equal(result.chunk_recommendation?.hold_reason, "positive_net_savings");
  assert.equal(
    Number(result.chunk_recommendation?.projected_net_savings || 0) < 0,
    true
  );
  assert.equal(result.recommendation?.kind, "hold_cash");
  assert.equal(result.recommendation?.payment_amount, 0);
  assert.equal(result.interest_savings?.source_apr, 120);
  assert.equal(
    result.interest_savings?.projected_interest_saved,
    0
  );
});

test("runVelocityEngine limits the chunk by source utilization capacity", () => {
  const result = runVelocityEngine(
    baseInput({
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
          credit_limit: 3000,
          available_credit: 2000,
          interest_rate: 6,
        },
      ],
      settings: {
        cash_buffer: 500,
        max_recommended_payment: null,
        max_source_utilization_percent: 50,
        minimum_cash_after_payment: 200,
        monthly_recovery_capacity: 500,
        recovery_months: 6,
        strategy: "aggressive",
      },
    })
  );

  assert.equal(result.recommendation?.kind, "highest_apr");
  assert.equal(result.recommendation?.payment_amount, 300);
  assert.equal(result.chunk_recommendation?.recommended_chunk, 300);
  assert.equal(
    result.chunk_recommendation?.limiting_constraint_id,
    "safe_source_capacity"
  );
});

test("runVelocityEngine limits the chunk by recovery capacity", () => {
  const result = runVelocityEngine(
    baseInput({
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
          current_balance: 500,
          credit_limit: 10000,
          available_credit: 9500,
          interest_rate: 0,
        },
      ],
      settings: {
        cash_buffer: 500,
        max_recommended_payment: null,
        max_source_utilization_percent: 90,
        minimum_cash_after_payment: 500,
        monthly_recovery_capacity: 100,
        recovery_months: 3,
        strategy: "aggressive",
      },
    })
  );

  assert.equal(result.recommendation?.kind, "highest_apr");
  assert.equal(result.recommendation?.payment_amount, 300);
  assert.equal(result.chunk_recommendation?.recommended_chunk, 300);
  assert.equal(result.chunk_recommendation?.limiting_constraint_id, "recovery_window");
  assert.equal(result.recovery_timeline?.months_required, 3);
  assert.equal(result.recovery_timeline?.status, "Within Guardrails");
});

test("runVelocityEngine holds cash when upcoming bills consume liquidity", () => {
  const result = runVelocityEngine(
    baseInput({
      accounts: [
        {
          id: "cash",
          name: "Checking",
          type: "checking",
          current_balance: 1000,
        },
        {
          id: "source",
          name: "HELOC",
          type: "heloc",
          current_balance: 0,
          credit_limit: 10000,
          available_credit: 10000,
          interest_rate: 6,
        },
      ],
      incomes: [],
      bills: [
        {
          id: "large-bill",
          name: "Insurance",
          amount: 900,
          is_archived: false,
        },
      ],
      settings: {
        cash_buffer: 500,
        max_recommended_payment: null,
        max_source_utilization_percent: 90,
        minimum_cash_after_payment: 500,
        monthly_recovery_capacity: 300,
        recovery_months: 6,
        strategy: "aggressive",
      },
    })
  );

  assert.equal(result.cashflow_projection?.projected_cash_before_velocity_payment, -50);
  assert.equal(result.chunk_recommendation?.recommended_chunk, 0);
  assert.equal(result.chunk_recommendation?.hold_reason, "liquidity_floor");
  assert.equal(result.recommendation?.kind, "hold_cash");
  assert.equal(result.recommendation?.payment_amount, 0);
});

test("runVelocityEngine returns chunk rationale for the limiting constraint", () => {
  const result = runVelocityEngine(baseInput());

  assert.equal(
    result.chunk_recommendation?.constraints.some(
      (constraint) => constraint.id === "positive_net_savings"
    ),
    true
  );
  assert.equal(
    result.chunk_recommendation?.rationale.some((line) =>
      line.includes("limiting_constraint:safe_source_capacity")
    ),
    true
  );
});

test("runVelocityEngine selects hold cash when no safe payment capacity remains", () => {
  const result = runVelocityEngine(
    baseInput({
      accounts: [
        {
          id: "cash",
          name: "Checking",
          type: "checking",
          current_balance: 600,
        },
      ],
      incomes: [],
      bills: [],
      debts: [],
      settings: {
        cash_buffer: 600,
        max_recommended_payment: 500,
        minimum_cash_after_payment: 600,
        monthly_recovery_capacity: 0,
        recovery_months: 6,
        strategy: "conservative",
      },
    })
  );

  assert.equal(result.available_cash_above_buffer, 0);
  assert.equal(result.recommendation?.kind, "hold_cash");
  assert.equal(result.recommendation?.payment_amount, 0);
  assert.equal(result.recovery_timeline?.status, "Not Available");
  assert.equal(result.interest_savings?.projected_interest_saved, 0);
  assert.equal(result.interest_savings?.velocity_payment_amount, 0);
  assert.equal(result.risk_summary.warnings.includes("No cash above buffer is available for a velocity payment."), true);
});

test("runVelocityEngine keeps recovery timeline within guardrails by limiting the chunk", () => {
  const result = runVelocityEngine(
    baseInput({
      settings: {
        cash_buffer: 500,
        max_recommended_payment: 500,
        minimum_cash_after_payment: 500,
        monthly_recovery_capacity: 100,
        recovery_months: 3,
        strategy: "aggressive",
      },
    })
  );

  assert.equal(result.chunk_recommendation?.recommended_chunk, 300);
  assert.equal(result.chunk_recommendation?.limiting_constraint_id, "recovery_window");
  assert.equal(result.recovery_timeline?.months_required, 3);
  assert.equal(result.recovery_timeline?.status, "Within Guardrails");
  assert.equal(result.recovery_timeline?.completion_date, "September 2026");
});

test("runVelocityEngine excludes archived debts from targets and candidates", () => {
  const result = runVelocityEngine(
    baseInput({
      debts: [
        {
          id: "archived-card",
          name: "Archived Card",
          balance: 9000,
          minimum_payment: 200,
          interest_rate: 35,
          is_archived: true,
        },
        {
          id: "active-card",
          name: "Active Card",
          balance: 1500,
          minimum_payment: 60,
          interest_rate: 14,
        },
      ],
    })
  );

  assert.equal(result.target_debt?.id, "active-card");
  assert.notEqual(result.recommendation?.debt_id, "archived-card");
  assert.equal(
    result.candidate_evaluations?.some(
      (candidate) => candidate.debt_id === "archived-card"
    ),
    false
  );
});

test("runVelocityEngine uses highest APR as the target debt", () => {
  const result = runVelocityEngine(
    baseInput({
      debts: [
        {
          id: "lower-apr",
          name: "Lower APR",
          balance: 200,
          minimum_payment: 25,
          interest_rate: 9,
        },
        {
          id: "higher-apr",
          name: "Higher APR",
          balance: 3000,
          minimum_payment: 90,
          interest_rate: 29,
        },
      ],
    })
  );

  assert.equal(result.target_debt?.id, "higher-apr");
});

test("buildVelocityAdvisorResult formats all advisor sections", () => {
  const engineResult = runVelocityEngine(baseInput());
  const advisorResult = buildVelocityAdvisorResult(engineResult);

  assert.deepEqual(Object.keys(advisorResult.sections), [
    "recommendation",
    "why",
    "expected_result",
    "risks",
    "alternatives",
  ]);
  assert.equal(advisorResult.sections.recommendation.title, "Recommendation");
  assert.equal(advisorResult.sections.why.title, "Why");
  assert.equal(advisorResult.sections.expected_result.title, "Expected Result");
  assert.equal(advisorResult.sections.risks.title, "Risks");
  assert.equal(advisorResult.sections.alternatives.title, "Alternatives");
  assert.ok(advisorResult.sections.recommendation.facts.length > 0);
  assert.ok(advisorResult.sections.expected_result.facts.length > 0);
  assert.deepEqual(
    advisorResult.sections.risks.facts,
    [
      { label: "Risk level", value: "High" },
      { label: "Confidence", value: "High" },
    ]
  );
  assert.equal(advisorResult.validation_errors.length, 0);
});

test("simulatePayoffPlan preserves snowball and avalanche targeting", () => {
  const debts = [
    {
      id: "small-low-apr",
      name: "Small Low APR",
      balance: 500,
      minimum_payment: 25,
      interest_rate: 5,
    },
    {
      id: "large-high-apr",
      name: "Large High APR",
      balance: 2500,
      minimum_payment: 75,
      interest_rate: 24,
    },
  ];

  const snowball = simulatePayoffPlan({
    debts,
    strategy: "snowball",
    extraPayment: 100,
  });
  const avalanche = simulatePayoffPlan({
    debts,
    strategy: "avalanche",
    extraPayment: 100,
  });

  assert.equal(snowball.first_target, "Small Low APR");
  assert.equal(avalanche.first_target, "Large High APR");
});

test("simulatePayoffPlan uses Velocity engine target with income and bill snapshot data", () => {
  const debts = [
    {
      id: "small-low-apr",
      name: "Small Low APR",
      balance: 500,
      minimum_payment: 25,
      interest_rate: 5,
    },
    {
      id: "large-high-apr",
      name: "Large High APR",
      balance: 2500,
      minimum_payment: 75,
      interest_rate: 24,
    },
  ];
  const velocityInputSnapshot = baseInput({
    debts,
    incomes: [
      {
        id: "paycheck",
        name: "Paycheck",
        amount: 3200,
        frequency: "monthly",
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
    settings: {
      cash_buffer: 500,
      max_recommended_payment: 400,
      minimum_cash_after_payment: 500,
      monthly_recovery_capacity: 200,
      recovery_months: 6,
      strategy: "aggressive",
    },
  });
  const engineResult = runVelocityEngine(velocityInputSnapshot);

  const result = simulatePayoffPlan({
    debts,
    strategy: "velocity",
    extraPayment: 100,
    velocityInputSnapshot,
  });

  assert.equal(engineResult.cashflow_projection?.projected_income, 3200);
  assert.equal(engineResult.cashflow_projection?.projected_bills, 1200);
  assert.equal(result.first_target, "Large High APR");
});
