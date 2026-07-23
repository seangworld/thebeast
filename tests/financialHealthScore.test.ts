import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildFinancialHealthScore,
  type FinancialHealthScoreInput,
} from "../src/lib/financialHealthScore";
import {
  answerMoneyCoachQuestion,
  buildMoneyCoachExperience,
  classifyMoneyCoachIntent,
} from "../src/lib/moneyCoachExperience";

const completeInput: FinancialHealthScoreInput = {
  monthlyIncome: 5000,
  monthlyOutflow: 4000,
  projectedSurplus: 1000,
  currentCash: 6000,
  cashBuffer: 2000,
  totalDebt: 10000,
  debtMinimums: 500,
  creditUtilization: 20,
  retirementProgressPercent: 60,
  goalProgressPercent: 50,
  consistencyPercent: 80,
  planningCompletenessPercent: 100,
};

test("BM-312 calculates the wellness score from eight disclosed weighted dimensions", () => {
  const result = buildFinancialHealthScore(completeInput);

  assert.equal(result.score, 79);
  assert.equal(result.availableWeight, 100);
  assert.deepEqual(result.components.map((component) => component.label), [
    "Cash Flow",
    "Debt",
    "Savings",
    "Emergency Fund",
    "Retirement Progress",
    "Goal Progress",
    "Consistency",
    "Planning Completeness",
  ]);
  assert.equal(
    Math.round(result.components.reduce((sum, component) => sum + component.weightedPoints, 0)),
    result.score
  );
  assert.match(result.formula, /component score × component weight/);
  assert.match(result.disclaimer, /not a credit score/i);
  assert.ok(result.components.every((component) => component.calculation && component.evidence.length));
});

test("BM-312 excludes unavailable dimensions instead of inventing values", () => {
  const result = buildFinancialHealthScore({
    ...completeInput,
    retirementProgressPercent: undefined,
    goalProgressPercent: undefined,
    consistencyPercent: undefined,
  });

  assert.equal(result.availableWeight, 75);
  assert.equal(result.components.find((component) => component.id === "retirement-progress")?.available, false);
  assert.equal(result.components.find((component) => component.id === "goal-progress")?.weightedPoints, 0);
  assert.match(result.components.find((component) => component.id === "consistency")?.evidence[0] || "", /not enough/i);
});

test("BM-312 explains score direction from versioned component changes", () => {
  const prior = buildFinancialHealthScore(completeInput);
  const current = buildFinancialHealthScore({
    ...completeInput,
    projectedSurplus: 250,
    previous: prior,
  });

  assert.equal(current.change.direction, "decreased");
  assert.ok(Number(current.change.points) < 0);
  assert.ok(current.change.drivers.some((driver) => /Cash Flow fell/));
  assert.ok(current.change.drivers.some((driver) => /Savings fell/));
  assert.ok(current.change.drivers.every((driver) => /weighted point/));
  assert.match(current.change.explanation, /exactly which weighted components/i);
});

test("BM-312 Money Coach explains the current score, change evidence, and improvement", () => {
  const financialHealth = buildFinancialHealthScore(completeInput);
  const model = buildMoneyCoachExperience({
    ownerId: "owner-health",
    userName: "Sean",
    asOfDate: new Date("2026-07-23T12:00:00Z"),
    activeBillCount: 1,
    billsDueSoonCount: 0,
    monthlyBills: 3500,
    activeDebtCount: 1,
    totalDebt: 10000,
    projectedDebtReduction: 500,
    debtProgressPercent: 5,
    monthlyIncome: 5000,
    monthlyOutflow: 4000,
    projectedSurplus: 1000,
    currentCash: 6000,
    cashBuffer: 2000,
    utilization: 20,
    fundingSourceCount: 1,
    safeFundingSourceCapacity: 1000,
    assignedIncomePotCount: 1,
    totalObligationCount: 2,
    recommendationTitle: "Protect the plan",
    recommendationAction: "Keep current records updated.",
    recommendationWhy: "Current planning inputs drive the score.",
    recommendationHref: "/dashboard/money",
    interestSaved: 0,
    timeSavedMonths: 0,
    financialHealth,
  });

  assert.equal(classifyMoneyCoachIntent("Why did my financial health score change?"), "financial-health");
  const response = answerMoneyCoachQuestion("How can I improve my financial health score?", model);
  assert.equal(response.intent, "financial-health");
  assert.match(response.text, /79 out of 100/);
  assert.match(response.text, /not a credit score/i);
  assert.match(response.text, /How it is calculated/);
  assert.match(response.text, /Why it changed/);
  assert.match(response.text, /How to improve it/);
  assert.equal(response.href, "/dashboard/money/dashboard#financial-health-score");
});

test("BM-312 Mission Control renders the transparent calculation accessibly", () => {
  const source = readFileSync(
    "src/app/dashboard/money/components/FinancialMissionControl.tsx",
    "utf8"
  );
  assert.match(source, /id="financial-health-score"/);
  assert.match(source, /How your Financial Health Score is calculated/);
  assert.match(source, /model\.financialHealth\.formula/);
  assert.match(source, /model\.financialHealth\.disclaimer/);
  assert.match(source, /<table/);
  assert.match(source, /<th scope="row"/);
  assert.match(source, /Why it changed/);
  assert.match(source, /Best improvement opportunity/);
  assert.match(source, /data-financial-health-hero/);
  assert.match(source, /text-5xl sm:text-6xl/);
  assert.match(source, /Financial Health Score components/);
  assert.match(source, /md:hidden/);
  assert.match(source, /Calculation and evidence/);
});
