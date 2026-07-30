import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildMoneyCoachExperience } from "../src/lib/moneyCoachExperience";

const source = readFileSync("src/app/dashboard/money/components/MoneyCoachExperience.tsx", "utf8");
const workspace = readFileSync(
  "src/app/components/agents/ProfessionalConversationWorkspace.tsx",
  "utf8"
);
const framework = readFileSync(
  "src/app/components/agents/ProfessionalExperienceFramework.tsx",
  "utf8"
);

test("Money Coach provides persisted conversation history and optional shortcuts", () => {
  assert.match(source, /<ProfessionalConversationHistory/);
  assert.match(framework, /conversation navigation/);
  assert.match(framework, /New conversation/);
  assert.match(source, /Try a conversation starter/);
  assert.match(framework, /Pinned conversations/);
  assert.match(framework, /Recent conversations/);
  assert.match(framework, /Search/);
  assert.match(framework, /Archived/);
  assert.match(framework, /Rename/);
  assert.match(framework, /Unpin/);
  assert.match(framework, /Archive/);
  assert.match(framework, /Delete/);
  assert.match(workspace, /lg:grid-cols-\[18rem_minmax\(0,1fr\)\]/);
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
});

test("Money Coach keeps structured responses and a direct composer", () => {
  assert.match(workspace, /data-professional-conversation-workspace="true"/);
  assert.match(source, /AgentStreamingResponseArea/);
  assert.match(source, /streamingTurnId/);
  assert.match(source, /AgentConversationInput/);
  assert.match(source, /Message your Money Coach/);
  assert.doesNotMatch(source, /Structured guidance only/);
  assert.match(workspace, /role="log"/);
  assert.match(workspace, /aria-live="polite"/);
  assert.match(workspace, /min-h-\[44px\]/);
  assert.match(workspace, /focus-visible:outline/);
  assert.doesNotMatch(source, /FinancialMissionControl|MoneyDashboardCharts|BeastMoney Dashboard/);
});

test("Money Coach keeps shared suggestions optional and typing primary", () => {
  assert.match(source, /workspaceSuggestions\.slice\(0, 8\)/);
  assert.match(source, /suggestion\.prompt \|\| suggestion\.label/);
  assert.match(source, /intent !== "ask"/);
  assert.match(source, /type your own question at any time/);
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
