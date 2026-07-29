import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  answerMoneyCoachQuestion,
  buildMoneyCoachExperience,
  buildMoneyCoachGreeting,
} from "../src/lib/moneyCoachExperience";
import { buildMoneyCoachSessionBriefing } from "../src/lib/moneyCoachOnline";
import type {
  AgentConversationThread,
  ProfessionalExecutionHistory,
} from "../src/lib/platform/agents";

function experience() {
  return buildMoneyCoachExperience({
    ownerId: "owner-1",
    userName: "Sean Gatewood",
    asOfDate: new Date("2026-07-29T16:00:00.000Z"),
    lastVisitedAt: "2026-07-28T16:00:00.000Z",
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
    recentPayments: [
      {
        id: "payment-1",
        name: "Home Depot",
        amount: 250,
        date: "2026-07-29T12:00:00.000Z",
        kind: "debt",
      },
    ],
    billsDueSoon: [
      {
        name: "Electric",
        amount: 125,
        dueDate: "2026-07-31",
      },
    ],
  });
}

const history: ProfessionalExecutionHistory = {
  requests: [],
  recommendations: [
    {
      id: "recommendation-1",
      ownerId: "owner-1",
      requestId: "request-1",
      professionalId: "beastmoney.money-coach",
      title: "Protect the reserve",
      recommendation: "Keep the protected cash buffer in place.",
      status: "accepted",
      confidence: { label: "high", score: 92 },
      limitations: [],
      supportingEvidence: [],
      createdAt: "2026-07-28T17:00:00.000Z",
      updatedAt: "2026-07-28T17:00:00.000Z",
    },
  ],
  outcomes: [
    {
      id: "outcome-1",
      requestId: "request-1",
      outcomeStatus: "successful",
      expectedResult: {},
      actualResult: { source: "member_report" },
      memberLearning: ["The reserve remained intact."],
      limitations: ["Member reported."],
      supportingEvidence: [],
      observedAt: "2026-07-29T13:00:00.000Z",
      recordedAt: "2026-07-29T13:00:00.000Z",
    },
  ],
};

const priorConversation: AgentConversationThread = {
  id: "thread-1",
  ownerId: "owner-1",
  agentId: "beastmoney.money-coach",
  title: "Truck affordability",
  createdAt: "2026-07-28T12:00:00.000Z",
  updatedAt: "2026-07-28T18:00:00.000Z",
  messages: [],
  messageCount: 2,
  pinned: false,
  archived: false,
  tags: [],
  summary: {
    overview: "Discussed whether a truck fits the current payoff plan",
    decisions: [],
    unresolvedFollowUps: [],
    updatedAt: "2026-07-28T18:00:00.000Z",
  },
  relatedInsightIds: [],
  relatedActionIds: [],
};

test("BP-231 greets naturally by local period and omits a fake fallback name", () => {
  assert.equal(
    buildMoneyCoachGreeting("Sean Gatewood", new Date(2026, 6, 29, 9)),
    "Good morning, Sean."
  );
  assert.equal(
    buildMoneyCoachGreeting("Sean Gatewood", new Date(2026, 6, 29, 15)),
    "Good afternoon, Sean."
  );
  assert.equal(
    buildMoneyCoachGreeting("", new Date(2026, 6, 29, 20)),
    "Good evening."
  );
  assert.equal(
    buildMoneyCoachGreeting("there", new Date(2026, 6, 29, 20)),
    "Good evening."
  );
});

test("BP-231 session briefing uses verified changes and existing continuity", () => {
  const briefing = buildMoneyCoachSessionBriefing({
    model: experience(),
    history,
    conversations: [priorConversation],
  });

  assert.match(briefing.summary, /reviewed your financial picture/i);
  assert.ok(briefing.changes.some((item) => /Home Depot payment posted/.test(item.title)));
  assert.ok(briefing.changes.some((item) => /bill.*due soon/i.test(item.title)));
  assert.ok(
    briefing.continuity.some((item) =>
      /Last time we discussed whether a truck fits the current payoff plan/.test(item)
    )
  );
  assert.ok(
    briefing.continuity.some((item) =>
      /previously accepted “Protect the reserve.”/.test(item)
    )
  );
  assert.ok(briefing.sources.includes("Current BeastMoney records"));
  assert.ok(briefing.sources.includes("Conversation history"));
  assert.ok(briefing.sources.includes("Recommendation history"));
  assert.ok(briefing.sources.includes("Completed outcome history"));
  assert.ok(briefing.sources.includes("Recommendation confidence history"));
});

test("BP-231 references only persisted recommendation and outcome history", () => {
  const answer = answerMoneyCoachQuestion(
    "What did I accept last time?",
    experience(),
    {
      priorSummaries: ["We discussed whether a truck fits the current plan."],
      executionHistory: history,
    }
  );
  assert.match(answer.text, /prior context I can verify/i);
  assert.match(answer.text, /accepted: Protect the reserve/);
  assert.match(answer.text, /successful: The reserve remained intact/);

  const noHistory = answerMoneyCoachQuestion(
    "What did I accept last time?",
    experience()
  );
  assert.match(noHistory.text, /don't have a verified prior conversation/i);
  assert.doesNotMatch(noHistory.text, /Protect the reserve/);
});

test("BP-231 exposes continuous conversation, optional starters, and explicit lifecycle effects", () => {
  const coach = readFileSync(
    "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
    "utf8"
  );
  const sharedInput = readFileSync(
    "src/app/components/agents/AgentExperience.tsx",
    "utf8"
  );

  assert.match(coach, /data-money-coach-session-briefing="true"/);
  assert.match(coach, /Since your last review/);
  assert.match(coach, /What I remember/);
  assert.match(coach, /AgentConversationInput/);
  assert.match(coach, /Try a conversation starter/);
  assert.match(sharedInput, /event\.key === "Enter"/);
  assert.match(sharedInput, /!event\.nativeEvent\.isComposing/);
  assert.match(sharedInput, /requestSubmit/);
  assert.match(coach, /Why this recommendation exists/);
  assert.match(coach, /Why it matters/);
  assert.match(coach, /only its recommendation-history status to accepted/);
  assert.match(coach, /No money moves, financial record changes/);
  assert.match(coach, /completed, member-reported outcomes as approved/);
  assert.doesNotMatch(coach, /automatic transfer|autonomous execution/i);
});
