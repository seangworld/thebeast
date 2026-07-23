import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildMoneyCoachExperience } from "../src/lib/moneyCoachExperience";

const workspaceSource = readFileSync("src/app/dashboard/money/components/MoneyCoachExperience.tsx", "utf8");

test("BM-306 presents a bounded personalized start state instead of a blank conversation", () => {
  assert.match(workspaceSource, /data-money-coach-new-conversation="true"/);
  assert.match(workspaceSource, /turns\.length === 0/);
  assert.match(workspaceSource, /Start a conversation/);
  assert.match(workspaceSource, /MorningFinancialBriefingPanel/);
  assert.doesNotMatch(workspaceSource, /reviewIntroduction/);
  assert.match(workspaceSource, /min-h-12/);
  assert.match(workspaceSource, /sm:grid-cols-2/);
  assert.match(workspaceSource, /xl:grid-cols-3/);
});

test("BM-306 consumes AGENT-215 personalization rather than defining another ranking engine", () => {
  assert.match(workspaceSource, /createDefaultConversationStarterEngine\(\)\.generate/);
  assert.match(workspaceSource, /observations: model\.observations/);
  assert.match(workspaceSource, /conversationHistory: threads/);
  assert.match(workspaceSource, /workspaceSuggestions/);
  assert.doesNotMatch(workspaceSource, /class MoneyCoachConversationStarter/);
});

test("BM-306 starter selection creates and starts a new persisted conversation", () => {
  assert.match(workspaceSource, /async function beginStarter\(prompt: string\)/);
  assert.match(workspaceSource, /const thread = await startConversation\(\)/);
  assert.match(workspaceSource, /await askQuestion\(prompt, thread\?\.id \|\| "", true\)/);
  assert.match(workspaceSource, /repository\.create/);
  assert.match(workspaceSource, /replaceConversation \? \[turn\]/);
  assert.match(workspaceSource, /void beginStarter\(suggestion\.prompt \|\| suggestion\.label\)/);
});

test("BM-306 supplies every requested starter group through shared metadata", () => {
  for (const group of [
    "Recommended Today",
    "Continue Previous Work",
    "Getting Started",
    "Planning",
    "Debt",
    "Savings",
    "Retirement",
    "Velocity Banking",
    "Budgeting",
    "Ask Anything",
  ]) assert.match(workspaceSource, new RegExp(`"${group}"`));

  const model = buildMoneyCoachExperience({
    ownerId: "owner-1",
    userName: "Sean",
    asOfDate: new Date("2026-07-23T12:00:00.000Z"),
    activeBillCount: 1,
    billsDueSoonCount: 1,
    monthlyBills: 1000,
    activeDebtCount: 1,
    totalDebt: 10000,
    projectedDebtReduction: 500,
    debtProgressPercent: 5,
    monthlyIncome: 5000,
    monthlyOutflow: 3500,
    projectedSurplus: 1500,
    currentCash: 4000,
    cashBuffer: 2000,
    utilization: 20,
    fundingSourceCount: 1,
    safeFundingSourceCapacity: 1500,
    assignedIncomePotCount: 1,
    totalObligationCount: 2,
    recommendationTitle: "Maintain the plan",
    recommendationAction: "Protect the reserve.",
    recommendationWhy: "Current records support it.",
    recommendationHref: "/dashboard/money/dashboard",
    interestSaved: 0,
    timeSavedMonths: 0,
  });

  assert.ok(model.suggestions.some((starter) => starter.group === "Recommended Today"));
  assert.ok(model.suggestions.some((starter) => starter.group === "Ask Anything"));
});
