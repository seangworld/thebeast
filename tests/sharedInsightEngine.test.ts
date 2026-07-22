import assert from "node:assert/strict";
import test from "node:test";
import {
  BeastAgentsPlatform,
  SharedInsightEngine,
  calculateInsightPriority,
  type CreateInsightInput,
} from "../src/lib/platform/agents";

const clock = () => "2026-07-22T12:00:00.000Z";

function insight(
  overrides: Partial<CreateInsightInput> = {}
): CreateInsightInput {
  return {
    id: "insight-1",
    ownerId: "owner-1",
    specialist: "example.specialist",
    category: "example-category",
    priority: "high",
    priorityScore: 75,
    priorityFactors: { urgency: 80, confidence: 70 },
    severity: "warning",
    confidence: "high",
    title: "Review a structured record",
    summary: "One record meets the configured review rule.",
    detailedExplanation: "The specialist supplied a plain-language explanation.",
    supportingData: [{ label: "Record count", value: 1, source: "example_records" }],
    provenance: {
      originatingData: "Authenticated example records",
      calculationOrRule: "specialist-rule-v1",
      timestamp: "2026-07-22T11:59:00.000Z",
      supportingRecords: [
        {
          entityType: "example",
          entityId: "record-1",
          source: "example_records",
          observedAt: "2026-07-22T11:58:00.000Z",
          fields: ["status"],
        },
      ],
      confidence: "high",
      limitations: ["Only available records were evaluated."],
    },
    generatedAt: "2026-07-22T12:00:00.000Z",
    applicablePeriod: { label: "Current review period" },
    relatedEntities: [{ type: "example", id: "record-1" }],
    action: { id: "review", label: "Review", type: "review" },
    navigationTarget: "/dashboard/example",
    explainWhy: {
      reason: "The configured specialist rule matched.",
      supportingData: [{ label: "Record count", value: 1 }],
      calculations: ["Configured score = 75"],
      assumptions: ["The record is current."],
      limitations: ["No unavailable records were inferred."],
    },
    rendering: {
      icon: "review",
      badge: "Needs review",
      accentColor: "amber",
      cardSize: "standard",
      expandableSections: ["Explain Why"],
      actionButtons: [{ id: "review", label: "Review", type: "review" }],
      relatedLinks: [{ label: "Details", href: "/dashboard/example" }],
    },
    ...overrides,
  };
}

test("AGENT-203 calculates priority deterministically from configured neutral factors", () => {
  assert.deepEqual(
    calculateInsightPriority(
      { urgency: 100, confidence: 50, unused: 100 },
      { weights: { urgency: 3, confidence: 1 } }
    ),
    { score: 87.5, priority: "critical" }
  );
});

test("AGENT-203 creates explainable owner-scoped insights and retrieves active history", () => {
  const engine = new SharedInsightEngine(undefined, clock);
  const created = engine.create(insight());

  assert.equal(created.status, "New");
  assert.equal(created.revision, 1);
  assert.equal(created.provenance.supportingRecords[0].entityId, "record-1");
  assert.equal(created.explainWhy?.calculations[0], "Configured score = 75");
  assert.deepEqual(engine.active({ ownerId: "owner-1" }).map((item) => item.id), ["insight-1"]);
  assert.deepEqual(engine.active({ ownerId: "owner-2" }), []);
  assert.throws(() => engine.update("owner-2", "insight-1", { title: "Blocked" }), /not available/);
  assert.deepEqual(engine.history({ ownerId: "owner-1" }).map((item) => item.to), ["New"]);
});

test("AGENT-203 supports lifecycle extensions dismissal metadata and archives", () => {
  const engine = new SharedInsightEngine<"Deferred">(undefined, clock);
  engine.create(insight());
  engine.transition("owner-1", "insight-1", "Deferred", "Specialist extension");
  engine.transition("owner-1", "insight-1", "Active");
  const dismissed = engine.dismiss("owner-1", "insight-1", {
    mode: "until-changed",
    dismissedBy: "owner-1",
    evidenceVersion: "records-v1",
  });

  assert.equal(dismissed.dismissal?.dismissedAt, clock());
  assert.deepEqual(engine.historical({ ownerId: "owner-1" }).map((item) => item.status), ["Dismissed"]);
  assert.throws(
    () => engine.dismiss("owner-1", "insight-1", { mode: "remind-later", dismissedBy: "owner-1" }),
    /remind-at/
  );
  assert.equal(engine.archive("owner-1", "insight-1").status, "Archived");
});

test("AGENT-203 exposes specialist-controlled deduplication without domain rules", () => {
  const engine = new SharedInsightEngine(
    {
      keyFor: (item) => item.relatedEntities[0]?.id,
      merge: (existing, incoming) => ({
        ...incoming,
        id: existing.id,
        summary: `${incoming.summary} Updated existing insight.`,
      }),
    },
    clock
  );
  engine.create(insight());
  const merged = engine.create(insight({ id: "duplicate", summary: "New evidence arrived." }));

  assert.equal(merged.id, "insight-1");
  assert.equal(merged.revision, 2);
  assert.match(merged.summary, /Updated existing insight/);
  assert.equal(engine.active({ ownerId: "owner-1" }).length, 1);
});

test("AGENT-203 is available as one shared BeastAgents platform service", () => {
  const platform = new BeastAgentsPlatform();
  platform.insights.create(insight());
  assert.equal(platform.insights.active({ ownerId: "owner-1" }).length, 1);
});
