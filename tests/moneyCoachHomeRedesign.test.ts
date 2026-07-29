import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const coach = readFileSync(
  "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
  "utf8"
);
const briefing = readFileSync(
  "src/app/dashboard/money/components/MorningFinancialBriefing.tsx",
  "utf8"
);
const dashboard = readFileSync(
  "src/app/dashboard/money/components/FinancialMissionControl.tsx",
  "utf8"
);
const cashFlow = readFileSync(
  "src/app/dashboard/money/cashflow/components/CashFlowOverview.tsx",
  "utf8"
);

test("BP-230 makes Dashboard the concise primary BeastMoney experience", () => {
  assert.match(dashboard, /BeastMoney Dashboard/);
  assert.match(dashboard, /Executive Briefing/);
  assert.match(dashboard, /Financial Health Score/);
  assert.match(briefing, /Daily Briefing/);
  assert.match(dashboard, /Recommended next step/);
  assert.match(dashboard, /Important alerts/);
  assert.match(dashboard, /Discuss with Money Coach/);
  assert.doesNotMatch(dashboard, /Strategy comparison|Observation Center/);
});

test("BP-230 makes Money Coach a typing-first conversation workspace", () => {
  for (const label of [
    "AgentConversationInput",
    "Message your Money Coach",
    "Try a conversation starter",
    "Accept recommendation",
    "Decide later",
    "Decline",
    "What Money Coach learns from your feedback",
  ]) {
    assert.match(coach, new RegExp(label));
  }
  assert.doesNotMatch(coach, /Structured guidance only|Suggested Questions|Executive Briefing/);
  assert.ok(
    coach.indexOf("<ProfessionalConversationTimeline") <
      coach.indexOf("<AgentConversationInput")
  );
});

test("BP-230 gives Cash Flow the approved generic summary", () => {
  for (const label of [
    "Checking Balance",
    "Protected Cash Buffer",
    "Available Credit",
    "Monthly Cash Flow",
    "Monthly Surplus",
  ]) {
    assert.match(cashFlow, new RegExp(label));
  }
  assert.match(cashFlow, /not specific to Velocity/);
});

test("BP-230 keeps the record-backed Daily Briefing in Dashboard", () => {
  assert.match(briefing, /data-money-morning-briefing="true"/);
  assert.match(briefing, /Since your last review/);
  assert.match(briefing, /Daily Briefing/);
  assert.match(briefing, /sm:grid-cols-2/);
  assert.match(briefing, /briefing\.items/);
  assert.match(briefing, /briefing\.recommendedFocus/);
  assert.match(briefing, /briefing\.freshness/);
});
