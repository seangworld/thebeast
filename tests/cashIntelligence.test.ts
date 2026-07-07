import assert from "node:assert/strict";
import test from "node:test";
import { buildCashIntelligence } from "../src/lib/cashIntelligence";

test("buildCashIntelligence returns a complete available cash snapshot", () => {
  const result = buildCashIntelligence({
    asOfDate: new Date("2026-07-01T00:00:00"),
    income: [
      {
        id: "income-1",
        name: "Paycheck",
        amount: 1500,
        frequency: "monthly",
        next_date: "2026-07-05",
      },
    ],
    bills: [
      {
        id: "bill-1",
        name: "Rent",
        amount: 400,
        frequency: "monthly",
        due_date: 3,
      },
    ],
    debtMinimums: [
      {
        id: "debt-1",
        name: "Card",
        minimum_payment: 100,
        due_date: 4,
      },
    ],
    scheduledTransfers: [
      {
        id: "transfer-1",
        name: "Savings transfer",
        amount: 50,
        frequency: "monthly",
        due_date: 2,
      },
    ],
    savings: [
      {
        id: "savings-1",
        name: "Emergency reserve",
        target_reserve: 300,
        monthly_contribution: 25,
        is_emergency_reserve: true,
      },
    ],
    fundingSources: [
      {
        id: "source-1",
        current_balance: 500,
        credit_limit: 2000,
        max_utilization_percent: 50,
      },
    ],
    settings: {
      currentCash: 1000,
      cashBuffer: 200,
      emergencyReserveAmount: 150,
      lookaheadDays: 30,
    },
  });

  assert.equal(result.emergencyReserve, 300);
  assert.equal(result.requiredCash, 550);
  assert.equal(result.currentAvailableCash, 150);
  assert.equal(result.nextPaydayCash, 1650);
  assert.equal(result.monthlyAvailableCash, 925);
  assert.equal(result.projectedCashBalance, 1950);
  assert.equal(result.projectedAvailableCash, 1650);
  assert.equal(result.safeFundingSourceCapacity, 200);
  assert.equal(result.safeAttackAmount, 200);
  assert.equal(result.incomeExpected, 1500);
  assert.equal(result.billsDue, 550);
});

test("buildCashIntelligence ignores inactive rows and respects attack caps", () => {
  const result = buildCashIntelligence({
    asOfDate: new Date("2026-07-01T00:00:00"),
    income: [
      {
        amount: 1000,
        frequency: "monthly",
        next_date: "2026-07-02",
        is_active: false,
      },
    ],
    bills: [
      {
        amount: 200,
        due_date: 2,
        is_archived: true,
      },
    ],
    fundingSources: [
      {
        current_balance: 0,
        credit_limit: 5000,
        max_utilization_percent: 80,
      },
    ],
    settings: {
      currentCash: 1200,
      cashBuffer: 250,
      emergencyReserveAmount: 250,
    },
    guardrails: {
      maxAttackAmount: 600,
    },
  });

  assert.equal(result.incomeExpected, 0);
  assert.equal(result.billsDue, 0);
  assert.equal(result.currentAvailableCash, 950);
  assert.equal(result.safeFundingSourceCapacity, 3750);
  assert.equal(result.safeAttackAmount, 600);
});
