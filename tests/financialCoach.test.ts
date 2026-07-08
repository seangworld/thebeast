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
  const coach = buildFinancialCoach({ advisor, forecast, insights, scenarios });

  assert.equal(coach.title, "BeastMoney Coach");
  assert.equal(coach.whatToDoToday.length > 0, true);
  assert.equal(coach.progressMade.length >= 3, true);
  assert.equal(coach.upcomingRisks.length > 0, true);
  assert.equal(coach.bestNextAction.length > 0, true);
  assert.equal(coach.disclaimer.includes("legal, tax, or investment advice"), true);
});
