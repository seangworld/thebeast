import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildMoneyCoachExperience } from "../src/lib/moneyCoachExperience";
import {
  buildMoneyCoachNotifications,
  buildMoneyCoachOutcomeLearning,
  buildMoneyCoachRecommendations,
} from "../src/lib/moneyCoachOnline";
import type { ProfessionalExecutionHistory } from "../src/lib/platform/agents";

function model() {
  return buildMoneyCoachExperience({
    ownerId: "owner-1",
    userName: "Sean",
    asOfDate: new Date("2026-07-28T12:00:00.000Z"),
    lastVisitedAt: "2026-07-27T12:00:00.000Z",
    activeBillCount: 2,
    billsDueSoonCount: 1,
    monthlyBills: 1200,
    activeDebtCount: 1,
    totalDebt: 8000,
    projectedDebtReduction: 400,
    debtProgressPercent: 5,
    monthlyIncome: 5000,
    monthlyOutflow: 3500,
    projectedSurplus: 1500,
    currentCash: 3000,
    cashBuffer: 2000,
    utilization: 25,
    fundingSourceCount: 1,
    safeFundingSourceCapacity: 1000,
    assignedIncomePotCount: 2,
    totalObligationCount: 3,
    recommendationTitle: "Protect the reserve",
    recommendationAction: "Keep the protected cash buffer in place.",
    recommendationWhy: "Current cash is above the saved buffer.",
    recommendationHref: "/dashboard/money/cashflow",
    interestSaved: 0,
    timeSavedMonths: 0,
  });
}

test("Money Coach recommendations retain deterministic evidence and confidence", () => {
  const recommendations = buildMoneyCoachRecommendations(model());
  assert.ok(recommendations.length > 0);
  assert.ok(recommendations.length <= 4);
  assert.equal(recommendations[0]?.confidence.label, "high");
  assert.ok((recommendations[0]?.confidence.score || 0) > 0);
  assert.ok((recommendations[0]?.limitations.length || 0) > 0);
  assert.ok((recommendations[0]?.supportingEvidence.length || 0) > 0);
});

test("Money Coach joins recommendations to durable lifecycle history by source insight", () => {
  const experience = model();
  const sourceInsightId = experience.insights[0]?.id || "";
  const history: ProfessionalExecutionHistory = {
    requests: [],
    outcomes: [],
    recommendations: [{
      id: "recommendation-1",
      ownerId: "owner-1",
      requestId: "request-1",
      professionalId: "beastmoney.money-coach",
      title: "Review bills",
      recommendation: "Review the current due dates.",
      status: "accepted",
      confidence: { label: "high" },
      limitations: [],
      supportingEvidence: [{ sourceInsightId }],
      createdAt: "2026-07-28T12:00:00.000Z",
      updatedAt: "2026-07-28T12:00:00.000Z",
    }],
  };
  assert.equal(
    buildMoneyCoachRecommendations(experience, history)[0]?.lifecycle?.status,
    "accepted"
  );
});

test("outcome learning only reflects persisted member-reported outcomes", () => {
  const history: ProfessionalExecutionHistory = {
    requests: [],
    recommendations: [{
      id: "recommendation-1",
      ownerId: "owner-1",
      requestId: "request-1",
      professionalId: "beastmoney.money-coach",
      title: "Protect the reserve",
      recommendation: "Keep the buffer in place.",
      status: "completed",
      confidence: { label: "high" },
      limitations: [],
      supportingEvidence: [],
      createdAt: "2026-07-28T12:00:00.000Z",
      updatedAt: "2026-07-28T12:00:00.000Z",
    }],
    outcomes: [{
      id: "outcome-1",
      requestId: "request-1",
      outcomeStatus: "successful",
      expectedResult: {},
      actualResult: { source: "member_report" },
      memberLearning: ["Member reported that this recommendation helped."],
      limitations: ["Not independently verified."],
      supportingEvidence: [],
      observedAt: "2026-07-28T12:00:00.000Z",
      recordedAt: "2026-07-28T12:00:00.000Z",
    }],
  };
  const learning = buildMoneyCoachOutcomeLearning(history);
  assert.equal(learning[0]?.recommendationTitle, "Protect the reserve");
  assert.match(learning[0]?.learning[0] || "", /Member reported/);
});

test("notifications are derived from real briefing and insight records", () => {
  const notifications = buildMoneyCoachNotifications(model());
  assert.ok(notifications.length > 0);
  assert.ok(notifications.every((item) => item.title && item.detail));
});

test("Money Coach UI is bounded to suggested questions and explicit lifecycle decisions", () => {
  const source = readFileSync(
    "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
    "utf8"
  );
  assert.doesNotMatch(source, /AgentConversationInput/);
  assert.match(source, /does not provide an unrestricted chat input/);
  assert.match(source, /Recommendation Cards/);
  assert.match(source, /MorningFinancialBriefingPanel/);
  assert.match(source, /Executive Briefing/);
  assert.match(source, /Learning from Outcomes/);
  assert.match(source, /recordOutcome/);
  assert.match(source, /SupabaseExecutionHistoryStore/);
});
