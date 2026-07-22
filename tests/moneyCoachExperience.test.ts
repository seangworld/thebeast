import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  answerMoneyCoachQuestion,
  buildMoneyCoachExperience,
} from "../src/lib/moneyCoachExperience";

const input = {
  ownerId: "owner-1",
  userName: "Sean Example",
  asOfDate: new Date(2026, 6, 22, 19),
  activeBillCount: 4,
  billsDueSoonCount: 1,
  monthlyBills: 1200,
  activeDebtCount: 2,
  totalDebt: 18000,
  projectedDebtReduction: 650,
  debtProgressPercent: 3.6,
  monthlyIncome: 6000,
  monthlyOutflow: 4200,
  projectedSurplus: 1800,
  currentCash: 5000,
  cashBuffer: 2500,
  utilization: 28,
  fundingSourceCount: 1,
  safeFundingSourceCapacity: 3000,
  assignedIncomePotCount: 5,
  totalObligationCount: 6,
  recommendationTitle: "Protect the next bill cycle",
  recommendationAction: "Keep the upcoming bill amount in checking.",
  recommendationWhy: "The 30-day forecast includes a bill before the next income date.",
  recommendationHref: "/dashboard/money/cashflow",
  interestSaved: 900,
  timeSavedMonths: 4,
};

test("MC-201 derives the Money Coach landing experience from current calculations", () => {
  const model = buildMoneyCoachExperience(input);

  assert.equal(model.greeting, "Good evening, Sean.");
  assert.match(model.conversationOpening, /^I noticed /);
  assert.ok(model.cards.some((card) => card.id === "upcoming-bills"));
  assert.ok(model.cards.some((card) => card.id === "debt-progress"));
  assert.ok(model.cards.some((card) => card.id === "cash-flow"));
  assert.ok(model.cards.some((card) => card.id === "income-pots"));
  assert.ok(model.cards.some((card) => card.id === "funding-sources"));
  assert.ok(model.cards.every((card) => card.explainWhy.length > 0));
  assert.equal(model.behavior.id, "beastmoney.money-coach");
  assert.ok(model.insights.every((insight) => insight.specialist === "beastmoney.money-coach"));
  assert.ok(model.insights.every((insight) => insight.ownerId === "owner-1"));
  assert.ok(model.insights.every((insight) => insight.provenance.calculationOrRule.length > 0));
  assert.ok(model.insights.every((insight) => insight.explainWhy?.limitations.length));
  assert.ok(model.suggestions.some((item) => item.label === "Review Bills"));
  assert.ok(model.suggestions.some((item) => item.label === "Review Debt Strategy"));
});

test("MC-201 handles missing financial data without inventing facts", () => {
  const model = buildMoneyCoachExperience({
    ...input,
    activeBillCount: 0,
    billsDueSoonCount: 0,
    monthlyBills: 0,
    activeDebtCount: 0,
    totalDebt: 0,
    projectedDebtReduction: 0,
    debtProgressPercent: 0,
    monthlyIncome: 0,
    monthlyOutflow: 0,
    projectedSurplus: 0,
    currentCash: 0,
    cashBuffer: 0,
    fundingSourceCount: 0,
    safeFundingSourceCapacity: 0,
    assignedIncomePotCount: 0,
    totalObligationCount: 0,
    interestSaved: 0,
    timeSavedMonths: 0,
  });

  assert.ok(model.cards.some((card) => card.id === "missing-information"));
  assert.match(model.safetyNotice, /not financial, tax, investment, legal, credit, or lending advice/);
  assert.doesNotMatch(JSON.stringify(model), /sample balance|placeholder/i);
});

test("MC-201 answers with deterministic existing calculations and Explain Why", () => {
  const response = answerMoneyCoachQuestion(
    "Can you explain my cash flow?",
    buildMoneyCoachExperience(input)
  );

  assert.equal(response.href, "/dashboard/money/cashflow");
  assert.match(response.text, /Explain Why:/);
  assert.match(response.text, /Cash Intelligence/);
});

test("MC-201 consumes the shared AgentExperience without replacing existing pages", () => {
  const component = readFileSync(
    "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
    "utf8"
  );
  const landing = readFileSync("src/app/dashboard/money/page.tsx", "utf8");

  assert.match(component, /from "@\/app\/components\/agents"/);
  assert.match(component, /<AgentExperience/);
  assert.match(component, />Explain Why</);
  assert.match(component, /AgentMemoryRecord/);
  assert.match(component, /Mark reviewed/);
  assert.match(component, /Dismiss/);
  for (const route of [
    "/dashboard/money/cashflow",
    "/dashboard/money/debts",
    "/dashboard/money/velocity",
    "/dashboard/money/retirement",
  ]) {
    assert.match(landing, new RegExp(route));
  }
});
