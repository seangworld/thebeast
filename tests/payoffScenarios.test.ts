import assert from "node:assert/strict";
import test from "node:test";
import { comparePayoffScenarios, normalizeScenarioOrder } from "../src/lib/payoffScenarios";
import { runUnifiedStrategyEngine } from "../src/lib/unifiedStrategyEngine";

const debts = [
  { id: "a", name: "Small", balance: 100, minimum_payment: 10, interest_rate: 0 },
  { id: "b", name: "Large", balance: 200, minimum_payment: 20, interest_rate: 0 },
];
const current = runUnifiedStrategyEngine({ debts, strategy: "minimum" });

test("cash scenarios preserve inputs and count the upfront payment exactly once", () => {
  const before = JSON.stringify(debts);
  const rows = comparePayoffScenarios({ debts, current, extraMonthly: 20, lumpSum: 75, customOrder: ["b", "a"] });
  assert.equal(JSON.stringify(debts), before);
  for (const row of rows) {
    assert.equal(row.result.initial_lump_sum_applied, 75);
    assert.equal(row.result.total_paid, 300);
    assert.equal(row.result.months_to_payoff, 5);
    assert.equal(row.monthsSaved, 5);
    assert.equal(row.result.debt_payment_schedule.reduce((sum, payment) => sum + payment.total_payment, 0), 300);
  }
  assert.equal(rows[2].result.debt_payment_schedule[0].debt_id, "b");
});

test("lump sum is capped at eligible debt and can pay all debts before monthly interest", () => {
  const result = runUnifiedStrategyEngine({ debts, strategy: "snowball", lumpSumPayment: 999 });
  assert.equal(result.payoff_complete, true);
  assert.equal(result.months_to_payoff, 0);
  assert.equal(result.total_paid, 300);
  assert.equal(result.initial_lump_sum_applied, 300);
  assert.equal(result.total_interest, 0);
});

test("unused monthly attack rolls to the next eligible debt in the same month", () => {
  const result = runUnifiedStrategyEngine({ debts, strategy: "snowball", extraPayment: 270 });
  assert.equal(result.months_to_payoff, 1);
  assert.equal(result.total_paid, 300);
  assert.equal(result.debt_payment_schedule.filter(row => row.month === 1).length, 2);
});

test("a lump sum reduces first-month interest and keeps freed minimums in the budget", () => {
  const result = runUnifiedStrategyEngine({ debts: debts.map(debt => ({ ...debt, interest_rate: 12 })), strategy: "snowball", lumpSumPayment: 100 });
  assert.equal(result.payment_schedule[0].interest_paid, 2);
  assert.equal(result.payment_schedule[0].total_payment, 30);
});

test("custom order removes missing/duplicate IDs and appends newly eligible debts", () => {
  assert.deepEqual(normalizeScenarioOrder(debts, ["gone", "b", "b"]), ["b", "a"]);
});

test("invalid amounts fail explicitly instead of fabricating estimates", () => {
  for (const value of [-1, NaN, Infinity, 1e12]) {
    assert.throws(() => comparePayoffScenarios({ debts, current, extraMonthly: value, lumpSum: 0, customOrder: [] }));
  }
});

test("incomplete payoff results never claim savings against an incomplete baseline", () => {
  const blocked = [{ ...debts[0], minimum_payment: 0, interest_rate: 24 }];
  const baseline = runUnifiedStrategyEngine({ debts: blocked, strategy: "minimum" });
  const rows = comparePayoffScenarios({ debts: blocked, current: baseline, extraMonthly: 20, lumpSum: 0, customOrder: [] });
  assert.equal(rows[0].result.payoff_complete, true);
  assert.equal(rows[0].interestSaved, null);
  assert.equal(rows[0].monthsSaved, null);
});

test("excluded debts cannot consume lump sums; minimum and velocity ignore the new option", () => {
  const result = runUnifiedStrategyEngine({ debts: [{ ...debts[0], is_excluded: true }, debts[1]], strategy: "snowball", lumpSumPayment: 300 });
  assert.equal(result.initial_lump_sum_applied, 200);
  for (const strategy of ["minimum", "velocity"] as const) {
    assert.deepEqual(runUnifiedStrategyEngine({ debts, strategy, lumpSumPayment: 100 }), runUnifiedStrategyEngine({ debts, strategy }));
  }
});
