import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildMoneyCoachExperience } from "../src/lib/moneyCoachExperience";

const source = readFileSync("src/app/dashboard/money/components/MoneyCoachExperience.tsx", "utf8");

test("BM-305 provides a ChatGPT-style left conversation navigation", () => {
  assert.match(source, /data-money-coach-left-navigation="true"/);
  assert.match(source, /Money Coach conversation navigation/);
  assert.match(source, /New Conversation/);
  assert.match(source, /Pinned Conversations/);
  assert.match(source, /Recent Conversations/);
  assert.match(source, /Search/);
  assert.match(source, /Archived/);
  assert.match(source, /Rename/);
  assert.match(source, /Unpin/);
  assert.match(source, /Archive/);
  assert.match(source, /Delete/);
  assert.match(source, /lg:grid-cols-\[18rem_minmax\(0,1fr\)\]/);
});

test("BM-305 keeps persistence resume and automatic title behavior", () => {
  assert.match(source, /ServerAgentConversationRepository/);
  assert.match(source, /SupabaseAgentConversationStore/);
  assert.match(source, /repository\.create/);
  assert.match(source, /repository\.append/);
  assert.match(source, /repository\.summarize/);
  assert.match(source, /setConversationTitle\(updated\.title\)/);
  assert.match(source, /restoreThread/);
  assert.match(source, /openThread/);
  assert.match(source, /titles update automatically/i);
});

test("BM-305 keeps conversation primary with streaming and a modern composer", () => {
  assert.match(source, /data-money-coach-conversation-workspace="true"/);
  assert.match(source, /composerPlacement="before-cards"/);
  assert.match(source, /AgentStreamingResponseArea/);
  assert.match(source, /streamingTurnId/);
  assert.match(source, /role="log"/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /min-h-\[44px\]/);
  assert.match(source, /focus-visible:outline/);
  assert.doesNotMatch(source, /FinancialMissionControl|MoneyDashboardCharts|BeastMoney Dashboard/);
});

test("BM-305 groups AGENT-215 starters into all supported workspace categories", () => {
  for (const label of [
    "Recommended Today",
    "Getting Started",
    "Continue Previous Work",
    "Planning",
    "Debt",
    "Savings",
    "Retirement",
    "Velocity Banking",
    "Budgeting",
    "Observation Follow-up",
    "Upcoming Events",
    "Ask Anything",
  ]) assert.match(source, new RegExp(label));
  assert.match(source, /data-agent-215-starter-groups="true"/);
  assert.match(source, /suggestion\.group/);
});

test("BM-305 carries AGENT-215 category metadata into Money Coach suggestions", () => {
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
  assert.ok(model.suggestions.some((item) => item.category === "recommended-today"));
  assert.ok(model.suggestions.some((item) => item.category === "ask-anything" && item.intent === "ask"));
});
