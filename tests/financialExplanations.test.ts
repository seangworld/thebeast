import assert from "node:assert/strict";
import test from "node:test";
import { buildCashIntelligence } from "../src/lib/cashIntelligence";
import { buildDailyFinancialAdvisor } from "../src/lib/dailyFinancialAdvisor";
import {
  buildFinancialExplanation,
  getPrimaryRisk,
  summarizeExplanation,
} from "../src/lib/financialExplanations";
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

test("buildFinancialExplanation normalizes recommendation context", () => {
  const explanation = buildFinancialExplanation({
    recommendation: "Pay Discover today.",
    reason: "Guardrails are preserved.",
    impact: "Principal goes down.",
    risks: ["Records must be current."],
    assumptions: ["Cash data is up to date."],
    affectedEntities: [{ id: "discover", name: "Discover", type: "debt" }],
  });

  assert.equal(getPrimaryRisk(explanation), "Records must be current.");
  assert.equal(summarizeExplanation(explanation).includes("Pay Discover"), true);
  assert.equal(explanation.affectedEntities[0].type, "debt");
});

test("advisor and insights expose shared explanation objects", () => {
  const cashIntelligence = buildCashIntelligence({
    asOfDate: new Date("2026-07-01T00:00:00"),
    income: [{ amount: 3200, frequency: "monthly", next_date: "2026-07-03" }],
    bills: [{ amount: 1000, frequency: "monthly", due_date: 5 }],
    debtMinimums: debts,
    settings: { currentCash: 1200, cashBuffer: 500 },
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
    currentCash: 1200,
    cashBuffer: 500,
  });
  const advisor = buildDailyFinancialAdvisor({
    cashIntelligence,
    financialDecision,
    financialForecast,
    debts,
  });
  const insights = buildFinancialInsights({
    cashIntelligence,
    financialDecision,
    financialForecast,
    debts,
    currentCash: 1200,
    cashBuffer: 500,
  });

  assert.equal(advisor.primaryRecommendation.explanation.affectedEntities[0].name, "Discover");
  assert.equal(insights.explanation.affectedEntities.some((entity) => entity.type === "forecast"), true);
});
