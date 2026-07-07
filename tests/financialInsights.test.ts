import assert from "node:assert/strict";
import test from "node:test";
import { buildCashIntelligence } from "../src/lib/cashIntelligence";
import { buildFinancialDecision } from "../src/lib/financialDecisionEngine";
import { buildFinancialForecast } from "../src/lib/financialForecasting";
import { buildFinancialInsights } from "../src/lib/financialInsights";

const debts = [
  {
    id: "discover",
    name: "Discover",
    balance: 2400,
    minimum_payment: 120,
    interest_rate: 18,
  },
];

test("buildFinancialInsights summarizes health, savings, countdown, and progress", () => {
  const cashIntelligence = buildCashIntelligence({
    asOfDate: new Date("2026-07-01T00:00:00"),
    income: [{ amount: 3200, frequency: "monthly", next_date: "2026-07-03" }],
    bills: [{ amount: 1000, frequency: "monthly", due_date: 5 }],
    debtMinimums: debts,
    settings: {
      currentCash: 1200,
      cashBuffer: 500,
      lookaheadDays: 30,
    },
  });
  const financialDecision = buildFinancialDecision({
    cashIntelligence,
    debts,
    income: [{ amount: 3200 }],
    bills: [{ amount: 1000 }],
    strategy: "avalanche",
  });
  const financialForecast = buildFinancialForecast({
    asOfDate: new Date("2026-07-01T00:00:00"),
    cashIntelligence,
    financialDecision,
    debts,
    income: [{ amount: 3200, frequency: "monthly", next_date: "2026-07-03" }],
    bills: [{ amount: 1000, frequency: "monthly", due_date: 5 }],
    strategy: "avalanche",
    currentCash: 1200,
    cashBuffer: 500,
  });
  const insights = buildFinancialInsights({
    cashIntelligence,
    financialDecision,
    financialForecast,
    debts,
    strategy: "avalanche",
    currentCash: 1200,
    cashBuffer: 500,
    creditUtilization: 20,
    billsDueSoon: 0,
  });

  assert.equal(insights.financialHealthScore >= 70, true);
  assert.equal(insights.interestSaved > 0, true);
  assert.equal(insights.timeSavedMonths > 0, true);
  assert.equal(insights.debtReduction > 0, true);
  assert.equal(insights.cashEfficiency > 0, true);
  assert.notEqual(insights.debtFreedomCountdown, "Not projected");
  assert.equal(insights.monthlyProgress.label, "30 Days");
  assert.equal(insights.yearlyProgress.label, "1 Year");
});

test("buildFinancialInsights reports risk when cash guardrails fail", () => {
  const cashIntelligence = buildCashIntelligence({
    asOfDate: new Date("2026-07-01T00:00:00"),
    income: [],
    bills: [{ amount: 900, frequency: "monthly", due_date: 2 }],
    debtMinimums: debts,
    settings: {
      currentCash: 300,
      cashBuffer: 500,
      lookaheadDays: 30,
    },
  });
  const financialDecision = buildFinancialDecision({
    cashIntelligence,
    debts,
    bills: [{ amount: 900 }],
    strategy: "avalanche",
  });
  const financialForecast = buildFinancialForecast({
    asOfDate: new Date("2026-07-01T00:00:00"),
    cashIntelligence,
    financialDecision,
    debts,
    bills: [{ amount: 900, frequency: "monthly", due_date: 2 }],
    strategy: "avalanche",
    currentCash: 300,
    cashBuffer: 500,
  });
  const insights = buildFinancialInsights({
    cashIntelligence,
    financialDecision,
    financialForecast,
    debts,
    strategy: "avalanche",
    currentCash: 300,
    cashBuffer: 500,
    creditUtilization: 85,
    billsDueSoon: 3,
  });

  assert.equal(insights.healthBand, "risk");
  assert.equal(insights.interestSaved, 0);
  assert.equal(insights.timeSavedMonths, 0);
  assert.equal(insights.cashEfficiency, 0);
});
