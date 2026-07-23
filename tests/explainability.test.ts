import assert from "node:assert/strict";
import test from "node:test";
import {
  BeastAgentsPlatform,
  SharedAgentPlanningEngine,
  SharedBenchmarkIntelligence,
  SharedExplainabilityEngine,
  SharedObservationIntelligence,
  calculateObservationPriority,
  createObservationEvidenceSignature,
  createObservationFingerprint,
  sharedAgentActionTools,
  specialistAgentPlanningPolicies,
  type BenchmarkDefinition,
  type ObservationDetector,
} from "../src/lib/platform/agents";

const now = "2026-07-23T12:00:00.000Z";

test("AGENT-219 exposes one shared explainability engine", () => {
  assert.ok(new BeastAgentsPlatform().explainability instanceof SharedExplainabilityEngine);
});

test("AGENT-219 explains recommendations, alternatives, planning path, confidence, and tools", () => {
  const planner = new SharedAgentPlanningEngine();
  planner.registerPolicy(specialistAgentPlanningPolicies.moneyCoach);
  const plan = planner.createPlan({ specialistId: "beastmoney.money-coach", input: "Should I make an additional payment?", confidence: 0.9 }, new Date(now));
  const evidence = [{ id: "cash", source: "BeastMoney cash records", capturedAt: now, statement: "Cash remains above the protected reserve.", role: "supports" as const, authoritative: true }];
  const action = sharedAgentActionTools.prepare({ toolId: "open-debt", specialistId: "beastmoney.money-coach", grantedPermissions: [{ resource: "beastmoney.debts", action: "read" }] });
  const report = new SharedExplainabilityEngine(() => now).fromPlan({
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
    entityId: "recommendation-1",
    entityType: "recommendation",
    conclusion: "Keep the reserve protected before another payment.",
    why: "The reserve is the controlling guardrail.",
    plan,
    evidence,
    alternatives: [{ id: "pay-now", label: "Pay immediately", reasonNotSelected: "It would reduce the protected reserve.", evidenceIds: ["cash"] }],
    action,
    limitations: ["Balances may change after synchronization."],
  });
  assert.equal(report.authoritativeEvidenceIds[0], "cash");
  assert.match(report.alternatives[0].reasonNotSelected, /reserve/);
  assert.deepEqual(report.reasoningPath.map((item) => item.label), plan.steps.map((item) => item.label));
  assert.equal(report.action?.toolId, "open-debt");
  assert.match(report.disclosure, /does not expose hidden chain-of-thought/i);
});

function observationEngine() {
  const engine = new SharedObservationIntelligence(undefined, () => now);
  const evidence = [{ id: "metric", kind: "fact" as const, label: "Current metric", value: 12, source: "member.module", observedAt: now }];
  const ranked = calculateObservationPriority({ urgency: 50, materiality: 70, memberRelevance: 80, actionability: 70, confidence: 0.9 });
  const detector: ObservationDetector<{}> = {
    id: "specialist.detector",
    specialistId: "specialist",
    domain: "example",
    supportedTypes: ["Improvement"],
    detect: () => ({ observations: [{
      fingerprint: createObservationFingerprint(["metric", "improvement"]),
      evidenceSignature: createObservationEvidenceSignature(evidence),
      domain: "example",
      category: "Progress",
      type: "Improvement",
      time: { observedAt: now, periodLabel: "Current period" },
      evidence,
      provenance: { ruleId: "metric-improvement", ruleDescription: "Compare the metric with its prior value.", sourceSystems: ["member.module"], supportingRecordIds: ["metric"], retrievedAt: now, freshness: "current", limitations: ["One metric is available."] },
      assessment: { ...ranked, severity: "positive", confidence: 0.9, urgency: 50, materiality: 70, memberRelevance: 80, actionability: 70 },
      presentation: { title: "Metric improved", summary: "The current metric improved.", detail: "The value increased.", whyNoticed: "The current value exceeded the prior value.", whatChanged: "The metric increased." },
      relatedEntityIds: [],
    }] }),
  };
  engine.registerDetector(detector);
  return engine;
}

test("AGENT-219 integrates Observation Intelligence and Confidence", () => {
  const observation = observationEngine().analyze({ ownerId: "owner-1", specialistId: "specialist", asOf: now, data: {}, authorizedDomains: ["example"] })[0];
  const report = new SharedExplainabilityEngine(() => now).fromObservation({ ownerId: "owner-1", observation });
  assert.equal(report.entityType, "observation");
  assert.equal(report.evidence[0].statement, "Current metric: 12");
  assert.equal(report.confidence?.claim, observation.presentation.summary);
  assert.match(report.reasoningPath[0].purpose, /prior value/);
});

const benchmark: BenchmarkDefinition = {
  id: "personal.metric",
  name: "Personal metric baseline",
  type: "personal-historical-baseline",
  domain: "example",
  source: { name: "Authenticated member records", authority: "member-records", ownerScoped: true },
  sourceDate: "2026-07-01T00:00:00.000Z",
  calculation: { metric: "Example metric", unit: "points", formula: "current minus reference", direction: "higher-is-better" },
  applicableMemberConditions: { description: "Both values exist.", requiredConditions: ["current", "reference"] },
  applicableSpecialists: ["specialist"],
  confidence: "high",
  strengthOfEvidence: "strong",
  notes: [],
};

test("AGENT-219 integrates Benchmark Intelligence with source and formula", () => {
  const benchmarks = new SharedBenchmarkIntelligence(() => now);
  benchmarks.register(benchmark);
  const result = benchmarks.evaluate({ ownerId: "owner-1", specialistId: "specialist", benchmarkId: benchmark.id, current: { value: 12, label: "Current", measuredAt: now, supportingRecordIds: ["current"] }, reference: { value: 10, label: "Prior", measuredAt: "2026-06-01T00:00:00.000Z", supportingRecordIds: ["prior"] }, conditionEvidence: { current: true, reference: true }, authorizedScopes: ["member:read"] });
  const report = new SharedExplainabilityEngine(() => now).fromBenchmark({ ownerId: "owner-1", result });
  assert.equal(report.entityType, "benchmark");
  assert.match(report.reasoningPath[0].purpose, /current minus reference/);
  assert.ok(report.evidence.some((item) => item.source === "Authenticated member records"));
});

test("AGENT-219 validates evidence links and preserves owner scope", () => {
  const engine = new SharedExplainabilityEngine();
  assert.throws(() => engine.create({ id: "bad", ownerId: "owner-1", specialistId: "specialist", entityType: "conclusion", entityId: "c1", conclusion: "Conclusion", why: "Reason", evidence: [{ id: "e1", source: "source", capturedAt: now, statement: "Fact", role: "supports", authoritative: true }], alternatives: [{ id: "a1", label: "Other", reasonNotSelected: "Not supported.", evidenceIds: ["missing"] }], reasoningPath: [], limitations: [] }), /unknown evidence/);
  const observation = observationEngine().analyze({ ownerId: "owner-1", specialistId: "specialist", asOf: now, data: {}, authorizedDomains: ["example"] })[0];
  assert.throws(() => engine.fromObservation({ ownerId: "owner-2", observation }), /owner scoped/);
});
