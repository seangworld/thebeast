import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildMorningFinancialBriefing,
} from "../src/lib/moneyMorningBriefing";
import type {
  BenchmarkResult,
  Observation,
  ProfessionalJournalReasoningItem,
} from "../src/lib/platform/agents";

const asOf = "2026-07-23T12:00:00.000Z";
const since = "2026-07-22T12:00:00.000Z";

const observation = {
  id: "cash-improved",
  time: { observedAt: "2026-07-23T10:00:00.000Z" },
  presentation: {
    title: "Cash buffer improved",
    summary: "Available cash moved above the protected reserve.",
  },
  assessment: { priorityScore: 91 },
  provenance: {
    retrievedAt: "2026-07-23T11:30:00.000Z",
  },
} as Observation;

const benchmark = {
  id: "debt-goal",
  benchmarkName: "Debt payoff goal",
  interpretation: "Current debt progress remains ahead of the stated goal.",
  confidence: "high",
  evaluatedAt: "2026-07-23T10:30:00.000Z",
} as BenchmarkResult;

const journalEntry = {
  entryId: "journal-1",
  observation: "Payment consistency improved",
  interpretation: "The recent payment pattern is more consistent.",
  confidence: "high",
  evidenceIds: ["payment-1"],
  relatedResources: ["debt"],
  timestamp: "2026-07-23T09:00:00.000Z",
} satisfies ProfessionalJournalReasoningItem;

test("BM-310 produces a short prioritized briefing from shared intelligence", () => {
  const briefing = buildMorningFinancialBriefing({
    ownerId: "owner-1",
    asOf,
    since,
    observations: [observation],
    benchmarks: [benchmark],
    journalEntries: [journalEntry],
    memberUnderstanding: [
      {
        understandingId: "understanding-1",
        dimension: "communication-style",
        understanding: "Prefers concise financial reviews.",
        confidence: "high",
        evidenceSourceTypes: ["conversation"],
        updatedAt: "2026-07-23T09:30:00.000Z",
      },
    ],
    recentPayments: [
      {
        id: "payment-1",
        name: "HELOC",
        amount: 1500,
        date: "2026-07-23T08:00:00.000Z",
        kind: "debt",
      },
      {
        id: "old-payment",
        name: "Old bill",
        amount: 20,
        date: "2026-07-20T08:00:00.000Z",
        kind: "bill",
      },
    ],
    upcomingBills: [
      {
        id: "bill-1",
        name: "Electric",
        amount: 125,
        dueDate: "2026-07-25",
      },
    ],
    recommendedFocus: {
      title: "Review Velocity strategy",
      detail: "Confirm the next safe payment window.",
      href: "/dashboard/money/velocity",
    },
  });

  assert.equal(briefing.ownerId, "owner-1");
  assert.equal(briefing.items.length, 4);
  assert.equal(briefing.items[0]?.title, "Cash buffer improved");
  assert.equal(
    briefing.items.some((item) => item.id === "payment:old-payment"),
    false
  );
  assert.equal(briefing.recommendedFocus.title, "Review Velocity strategy");
  assert.equal(briefing.freshness.label, "current");
  assert.ok(briefing.items.every((item) => item.conversationPrompt.length > 0));
  assert.equal(
    briefing.items.some((item) => item.id.startsWith("journal:")),
    false,
    "internal journal entries must influence prioritization without becoming member-visible"
  );
  assert.ok(briefing.sourcesConsulted.includes("professional-journal"));
  assert.ok(briefing.sourcesConsulted.includes("member-understanding"));
});

test("BM-310 surfaces a current financial goal as a concise upcoming item", () => {
  const briefing = buildMorningFinancialBriefing({
    ownerId: "owner-1",
    asOf,
    since,
    observations: [],
    benchmarks: [],
    currentGoals: [
      {
        id: "goal-1",
        title: "Emergency fund",
        status: "Active",
        targetDate: "2026-08-01T12:00:00.000Z",
        updatedAt: "2026-07-23T08:00:00.000Z",
      },
    ],
    recommendedFocus: {
      title: "Keep building the reserve",
      detail: "Review the next contribution.",
      href: "/dashboard/goals",
    },
  });

  assert.equal(briefing.items[0]?.source, "goal");
  assert.match(briefing.items[0]?.title || "", /Emergency fund/);
  assert.match(briefing.items[0]?.conversationPrompt || "", /most useful next step/);
  assert.ok(briefing.sourcesConsulted.includes("goals"));
});

test("BM-310 honestly handles a quiet review period", () => {
  const briefing = buildMorningFinancialBriefing({
    ownerId: "owner-1",
    asOf,
    since,
    observations: [],
    benchmarks: [],
    recommendedFocus: {
      title: "Maintain the plan",
      detail: "No immediate change is required.",
      href: "/dashboard/money",
    },
  });

  assert.deepEqual(briefing.items, []);
  assert.match(briefing.summary, /did not find a material financial change/i);
});

test("BM-310 is shared by Money Coach Dashboard and conversation starters", () => {
  const coach = readFileSync(
    "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
    "utf8"
  );
  const dashboard = readFileSync(
    "src/app/dashboard/money/components/FinancialMissionControl.tsx",
    "utf8"
  );
  const experience = readFileSync("src/lib/moneyCoachExperience.ts", "utf8");
  const workspace = readFileSync(
    "src/app/dashboard/money/components/MoneyWorkspacePage.tsx",
    "utf8"
  );

  assert.match(coach, /MorningFinancialBriefingPanel/);
  assert.match(dashboard, /MorningFinancialBriefingPanel/);
  assert.match(experience, /morning-financial-briefing/);
  assert.match(experience, /Walk me through my morning financial briefing/);
  assert.match(workspace, /beastmoney:last-visit/);
  assert.match(workspace, /session-prior-visit/);
});

test("BM-310 briefing is expandable accessible and freshness-aware", () => {
  const panel = readFileSync(
    "src/app/dashboard/money/components/MorningFinancialBriefing.tsx",
    "utf8"
  );
  const builder = readFileSync("src/lib/moneyMorningBriefing.ts", "utf8");

  assert.match(panel, /<details/);
  assert.match(panel, /<summary/);
  assert.match(panel, /data-money-morning-briefing="true"/);
  assert.match(panel, /Recommended focus/);
  assert.match(panel, /Discuss with Money Coach/);
  assert.match(panel, /\\?starter=/);
  assert.match(panel, /min-h-11/);
  assert.match(panel, /Data freshness/);
  assert.match(builder, /SharedTrustDataFreshnessEngine/);
  assert.match(builder, /slice\(0, 4\)/);
  assert.match(builder, /journalEntries/);
  assert.doesNotMatch(builder, /source: "professional-journal"/);
  assert.match(builder, /memberUnderstanding/);
  assert.match(builder, /currentGoals/);
  assert.match(builder, /benchmarks/);
  assert.match(builder, /observations/);
});
