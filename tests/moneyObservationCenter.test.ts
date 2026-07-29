import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import type { Observation, ObservationType } from "../src/lib/platform/agents";
import {
  buildMoneyObservationCenter,
  observationCenterGroupOrder,
  type ObservationCenterGroup,
} from "../src/lib/moneyObservationCenter";

const now = "2026-07-23T12:00:00.000Z";
const source = (path: string) => readFileSync(path, "utf8");

function observation(
  id: string,
  type: ObservationType,
  overrides: Partial<Observation> = {}
): Observation {
  return {
    id,
    fingerprint: id,
    evidenceSignature: `${id}-evidence`,
    ownerId: "owner-1",
    specialistId: "money-coach",
    domain: "money",
    category: "Review",
    type,
    status: "Active",
    time: { observedAt: now, periodLabel: "Current review" },
    evidence: [{
      id: `${id}-record`,
      kind: "fact",
      label: "Current value",
      value: 42,
      source: "beastmoney",
      observedAt: now,
    }],
    provenance: {
      ruleId: `${id}-rule`,
      ruleDescription: "Evaluate authenticated BeastMoney records.",
      sourceSystems: ["beastmoney"],
      supportingRecordIds: [`${id}-record`],
      retrievedAt: now,
      freshness: "current",
      limitations: ["The result changes when member records change."],
    },
    assessment: {
      severity: "informational",
      priority: "medium",
      priorityScore: 50,
      confidence: 0.82,
      urgency: 50,
      materiality: 50,
      memberRelevance: 80,
      actionability: 70,
    },
    presentation: {
      title: `${id} title`,
      summary: `${id} summary`,
      detail: `${id} detail`,
      whyNoticed: `${id} matched its evidence rule.`,
      whyItMayMatter: `${id} may affect the member's plan.`,
      suggestedQuestion: `What should I do about ${id}?`,
      workspaceTarget: "/dashboard/money/debts",
    },
    relatedEntityIds: [],
    createdAt: now,
    updatedAt: now,
    revision: 1,
    ...overrides,
  };
}

test("BM-311 groups active observations into every Observation Center section", () => {
  const fixtures: readonly [ObservationType, ObservationCenterGroup][] = [
    ["Improvement", "Improvements"],
    ["Opportunity", "Opportunities"],
    ["Risk", "Risks"],
    ["Follow-up item", "Questions"],
    ["Missing information", "Missing Information"],
    ["Inconsistency", "Data Quality"],
    ["Milestone", "Milestones"],
  ];
  const model = buildMoneyObservationCenter(
    fixtures.map(([type], index) => observation(`item-${index}`, type)),
    now
  );

  assert.equal(model.total, fixtures.length);
  assert.deepEqual(model.groups.map((group) => group.label), observationCenterGroupOrder);
  fixtures.forEach(([, group]) => {
    assert.equal(model.groups.find((candidate) => candidate.label === group)?.items.length, 1);
  });
});

test("BM-311 exposes evidence, confidence, workspace, and action without duplicating intelligence", () => {
  const model = buildMoneyObservationCenter([
    observation("risk", "Risk"),
    observation("dismissed", "Opportunity", { status: "Dismissed" }),
    observation("expired", "Improvement", { status: "Expired" }),
  ], now);
  const item = model.groups
    .flatMap((group) => group.items)
    .find((candidate) => candidate.id === "risk");

  assert.equal(model.total, 2);
  assert.equal(item?.summary, "risk summary");
  assert.match(item?.whyItMatters || "", /member's plan/);
  assert.equal(item?.confidence, 82);
  assert.equal(item?.explainWhy.rule, "Evaluate authenticated BeastMoney records.");
  assert.deepEqual(item?.explainWhy.evidence, ["Current value: 42"]);
  assert.deepEqual(item?.workspace, { label: "Debts", href: "/dashboard/money/debts" });
  assert.deepEqual(item?.suggestedAction, { label: "Review Debts", href: "/dashboard/money/debts" });
  assert.equal(
    model.groups.flatMap((group) => group.items).find((candidate) => candidate.id === "dismissed")?.status,
    "Dismissed"
  );
});

test("BP-230 retires the Observation Center route without discarding observation intelligence", () => {
  const route = source("src/app/dashboard/money/observations/page.tsx");
  const workspace = source("src/app/dashboard/money/components/MoneyWorkspacePage.tsx");
  const center = source("src/app/dashboard/money/components/ObservationCenter.tsx");
  const missionControl = source("src/app/dashboard/money/components/FinancialMissionControl.tsx");
  const coach = source("src/lib/moneyCoachExperience.ts");

  assert.match(route, /redirect\("\/dashboard\/money\/dashboard#important-alerts"\)/);
  assert.doesNotMatch(workspace, /buildMoneyObservationCenter|view === "observations"/);
  assert.doesNotMatch(workspace, /new SharedObservationIntelligence/);
  // The prior component remains as compatibility code while no route or
  // navigation exposes a separate Observation Center workspace.
  assert.match(center, /Summary|item\.summary/);
  assert.match(center, /Why it matters/);
  assert.match(center, /item\.confidenceLabel/);
  assert.match(center, /<details[\s\S]*Explain Why/);
  assert.match(center, /Open \{item\.workspace\.label\}/);
  assert.match(center, /Discuss with Money Coach/);
  assert.match(center, /\\?starter=/);
  assert.match(center, /Newest/);
  assert.match(center, /Highest Priority/);
  assert.match(center, /Resolved/);
  assert.match(center, /Dismissed/);
  assert.match(center, /By Category/);
  assert.match(center, /priorityScore/);
  assert.match(center, /observedAt/);
  assert.match(center, /sm:grid-cols-2/);
  assert.match(center, /grid gap-4 lg:grid-cols-2/);
  assert.match(missionControl, /Important alerts/);
  assert.doesNotMatch(missionControl, /Observation Center|\/dashboard\/money\/observations/);
  assert.match(missionControl, /Discuss with Money Coach/);
  assert.match(coach, /observations\.map[\s\S]*Why I noticed/);
  assert.match(coach, /action: "Review important alerts"/);
  assert.match(coach, /dashboard#important-alerts/);
});
