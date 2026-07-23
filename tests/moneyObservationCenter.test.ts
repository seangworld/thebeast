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
    ["Milestone", "Completed Milestones"],
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
  const item = model.groups[0]?.items[0];

  assert.equal(model.total, 1);
  assert.equal(item?.summary, "risk summary");
  assert.match(item?.whyItMatters || "", /member's plan/);
  assert.equal(item?.confidence, 82);
  assert.equal(item?.explainWhy.rule, "Evaluate authenticated BeastMoney records.");
  assert.deepEqual(item?.explainWhy.evidence, ["Current value: 42"]);
  assert.deepEqual(item?.workspace, { label: "Debts", href: "/dashboard/money/debts" });
  assert.deepEqual(item?.suggestedAction, { label: "Review Debts", href: "/dashboard/money/debts" });
});

test("BM-311 provides a dedicated accessible route and integration surfaces", () => {
  const route = source("src/app/dashboard/money/observations/page.tsx");
  const workspace = source("src/app/dashboard/money/components/MoneyWorkspacePage.tsx");
  const center = source("src/app/dashboard/money/components/ObservationCenter.tsx");
  const missionControl = source("src/app/dashboard/money/components/FinancialMissionControl.tsx");
  const coach = source("src/lib/moneyCoachExperience.ts");

  assert.match(route, /MoneyWorkspacePage view="observations"/);
  assert.match(workspace, /buildMoneyObservationCenter\(\s*moneyCoachExperience\.observations/);
  assert.match(workspace, /view === "observations"/);
  assert.doesNotMatch(workspace, /new SharedObservationIntelligence/);
  assert.match(center, /Summary|item\.summary/);
  assert.match(center, /Why it matters/);
  assert.match(center, /item\.confidenceLabel/);
  assert.match(center, /<details[\s\S]*Explain Why/);
  assert.match(center, /Open \{item\.workspace\.label\}/);
  assert.match(center, /grid gap-4 lg:grid-cols-2/);
  assert.match(missionControl, /Observation Center/);
  assert.match(missionControl, /\/dashboard\/money\/observations/);
  assert.match(coach, /observations\.map[\s\S]*Why I noticed/);
  assert.match(coach, /action: "Open Observation Center"/);
});
