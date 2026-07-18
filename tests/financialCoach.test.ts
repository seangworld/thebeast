import assert from "node:assert/strict";
import test from "node:test";
import { buildCashIntelligence } from "../src/lib/cashIntelligence";
import { buildDailyFinancialAdvisor } from "../src/lib/dailyFinancialAdvisor";
import { buildFinancialCoach } from "../src/lib/financialCoach";
import { buildFinancialDecision } from "../src/lib/financialDecisionEngine";
import { buildFinancialForecast } from "../src/lib/financialForecasting";
import { buildFinancialInsights } from "../src/lib/financialInsights";
import { compareFinancialScenarios } from "../src/lib/financialScenarios";

const debts = [
  { id: "card-a", name: "Card A", balance: 2400, minimum_payment: 120, interest_rate: 18 },
];

test("buildFinancialCoach summarizes existing engine outputs", () => {
  const cashIntelligence = buildCashIntelligence({
    income: [{ amount: 3200, frequency: "monthly" }],
    bills: [{ amount: 1000, frequency: "monthly" }],
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
  const forecast = buildFinancialForecast({
    cashIntelligence,
    financialDecision,
    debts,
    income: [{ amount: 3200, frequency: "monthly" }],
    bills: [{ amount: 1000, frequency: "monthly" }],
    currentCash: 1200,
    cashBuffer: 500,
  });
  const advisor = buildDailyFinancialAdvisor({
    cashIntelligence,
    financialDecision,
    financialForecast: forecast,
    debts,
  });
  const insights = buildFinancialInsights({
    cashIntelligence,
    financialDecision,
    financialForecast: forecast,
    debts,
    currentCash: 1200,
    cashBuffer: 500,
  });
  const scenarios = compareFinancialScenarios({
    debts,
    cashIntelligence,
    financialDecision,
  });
  const coach = buildFinancialCoach({
    advisor,
    forecast,
    insights,
    scenarios,
    currentCash: 1200,
    cashBuffer: 500,
    creditUtilization: 24,
  });

  assert.equal(coach.title, "BeastMoney Coach");
  assert.equal(coach.whatToDoToday.length > 0, true);
  assert.equal(coach.progressMade.length >= 3, true);
  assert.equal(coach.upcomingRisks.length > 0, true);
  assert.equal(coach.bestNextAction.length > 0, true);
  assert.equal(coach.whyThisAction, advisor.primaryRecommendation.why);
  assert.equal(coach.assumptions.length > 0, true);
  assert.ok(Array.isArray(coach.warnings));
  assert.deepEqual(
    coach.scenarioQuestions.map((question) => question.input),
    ["current_cash", "cash_buffer", "credit_utilization"]
  );
  assert.equal(coach.scenarioQuestions[0].currentValue, 1200);
  assert.equal(coach.scenarioQuestions[1].currentValue, 500);
  assert.equal(coach.scenarioQuestions[2].currentValue, 24);
  assert.equal(coach.assumptions.some((assumption) => assumption.includes("Available cash assumption: 1200")), true);
  assert.equal(
    coach.assumptions.some((assumption) => assumption.includes("current records")),
    true
  );
  assert.deepEqual(coach.upcomingRisks, [
    ...new Set([
      ...forecast.upcomingRisks,
      ...advisor.primaryRecommendation.explanation.risks,
    ]),
  ].slice(0, 4));
  assert.equal(coach.disclaimer.includes("legal, tax, or investment advice"), true);
});

test("buildFinancialCoach returns actionable cash-flow, debt, utilization, and goal warnings", () => {
  const cashIntelligence = buildCashIntelligence({
    income: [{ amount: 1000, frequency: "monthly" }],
    bills: [{ amount: 1400, frequency: "monthly" }],
    debtMinimums: debts,
    settings: { currentCash: 100, cashBuffer: 500 },
  });
  const financialDecision = buildFinancialDecision({
    cashIntelligence,
    debts,
    income: [{ amount: 1000 }],
    bills: [{ amount: 1400 }],
    strategy: "avalanche",
  });
  const forecast = buildFinancialForecast({
    cashIntelligence,
    financialDecision,
    debts,
    income: [{ amount: 1000, frequency: "monthly" }],
    bills: [{ amount: 1400, frequency: "monthly" }],
    currentCash: 100,
    cashBuffer: 500,
  });
  const advisor = buildDailyFinancialAdvisor({
    cashIntelligence,
    financialDecision,
    financialForecast: forecast,
    debts,
  });
  const insights = buildFinancialInsights({
    cashIntelligence,
    financialDecision,
    financialForecast: forecast,
    debts,
    creditUtilization: 82,
    currentCash: 100,
    cashBuffer: 500,
  });
  const stalledInsights = {
    ...insights,
    monthlyProgress: {
      ...insights.monthlyProgress,
      debtReduction: 0,
      progressPercent: 0,
    },
  };
  const scenarios = compareFinancialScenarios({
    debts,
    cashIntelligence,
    financialDecision,
  });
  const coach = buildFinancialCoach({
    advisor,
    forecast,
    insights: stalledInsights,
    scenarios,
    creditUtilization: 82,
  });

  assert.deepEqual(
    coach.warnings.map((warning) => warning.category),
    ["cash_flow", "debt", "utilization", "goal"]
  );
  for (const warning of coach.warnings) {
    assert.ok(warning.message.length > 0);
    assert.ok(warning.action.length > 0);
    assert.match(warning.href, /^\/dashboard\/money\//);
  }
  assert.equal(coach.warnings.find((warning) => warning.category === "utilization")?.severity, "critical");
});
