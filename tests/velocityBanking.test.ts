import assert from "node:assert/strict";
import test from "node:test";
import { runVelocityBankingEngine } from "../src/lib/velocity";
import type { VelocityInputSnapshot } from "../src/lib/velocity";

function baseVelocityInput(
  overrides: Partial<VelocityInputSnapshot> = {}
): VelocityInputSnapshot {
  return {
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
    ...overrides,
  };
}

test("runVelocityBankingEngine produces a ready schedule and chunk calendar", () => {
  const result = runVelocityBankingEngine({
    velocityInputSnapshot: baseVelocityInput(),
  });

  assert.equal(result.status, "ready");
  assert.equal(result.optimalChunkAmount, 500);
  assert.equal(result.automaticTargetDebt?.id, "card-a");
  assert.equal(result.fundingSourceSelection?.id, "source");
  assert.equal(result.paymentSchedule.length > 0, true);
  assert.equal(result.chunkCalendar[0].type, "chunk");
  assert.equal(result.chunkCalendar[0].amount, 500);
  assert.equal(result.recoveryTimeline?.status, "Within Guardrails");
  assert.equal(result.readyRecommendation?.includes("Card A"), true);
});

test("runVelocityBankingEngine models both sides of a Velocity chunk", () => {
  const result = runVelocityBankingEngine({
    velocityInputSnapshot: baseVelocityInput(),
  });

  assert.equal(result.postChunkTargetDebtBalance, 4500);
  assert.equal(result.postChunkFundingSourceBalance, 1500);
  assert.equal(result.postChunkFundingSourceUtilization, 15);
  assert.equal(result.postChunkNetDebt, 7000);
  assert.equal(result.netWorthImpact, 0);
  assert.equal(result.strategyResult.velocity_chunk_applied, 500);
});

test("runVelocityBankingEngine delays the next chunk until recovery completes", () => {
  const result = runVelocityBankingEngine({
    velocityInputSnapshot: baseVelocityInput(),
  });

  assert.equal(result.nextChunkEligibleMonth, 3);
  assert.equal(result.recoveryDetected, true);
  assert.equal(
    result.nextChunkWaitReason?.includes("month 3 recovery completes"),
    true
  );
  assert.equal(
    result.paymentSchedule.some(
      (row) =>
        Number(row.velocity_source_payment || 0) > 0 &&
        Number(row.velocity_source_balance || 0) > 0
    ),
    true
  );
});

test("runVelocityBankingEngine recommends waiting when guardrails block the chunk", () => {
  const result = runVelocityBankingEngine({
    velocityInputSnapshot: baseVelocityInput({
      accounts: [
        {
          id: "cash",
          name: "Checking",
          type: "checking",
          current_balance: 500,
        },
        {
          id: "source",
          name: "HELOC",
          type: "heloc",
          current_balance: 4500,
          credit_limit: 5000,
          available_credit: 500,
          interest_rate: 8,
        },
      ],
      settings: {
        cash_buffer: 500,
        max_recommended_payment: null,
        max_source_utilization_percent: 80,
        minimum_cash_after_payment: 500,
        monthly_recovery_capacity: 0,
        recovery_months: 0,
        strategy: "aggressive",
      },
    }),
  });

  assert.equal(result.status, "wait");
  assert.equal(result.optimalChunkAmount, 0);
  assert.equal(result.waitRecommendation !== null, true);
  assert.equal(result.chunkCalendar[0].type, "wait");
});
