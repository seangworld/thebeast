import assert from "node:assert/strict";
import test from "node:test";
import {
  BeastAgentsPlatform,
  SharedOutcomeLearning,
  SharedProbabilityConfidenceEngine,
  type RecordRecommendationOutcomeInput,
} from "../src/lib/platform/agents";

const confidenceEngine = new SharedProbabilityConfidenceEngine();

function outcome(values: Partial<RecordRecommendationOutcomeInput> = {}): RecordRecommendationOutcomeInput {
  const evidence = [{ id: "evidence-1", source: "current module record", capturedAt: "2026-07-23T12:00:00.000Z", statement: "The recorded balance changed.", ownerId: "owner-1" }];
  return {
    id: "outcome-1",
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
    recommendationId: "recommendation-1",
    recommendation: "Apply an additional payment.",
    recommendedAt: "2026-07-01T12:00:00.000Z",
    actionStatus: "completed",
    expectation: { statement: "Reduce the tracked balance by $500.", metric: { name: "balance reduction", expectedValue: 500, unit: "USD", tolerance: 1 }, assumptions: ["No new charges are added."] },
    actual: { statement: "The tracked balance declined by $500.", observedAt: "2026-07-23T12:00:00.000Z", metric: { name: "balance reduction", actualValue: 500, unit: "USD" } },
    evidence,
    confidence: confidenceEngine.assess({ claim: "The recommendation outcome occurred.", evidence: [{ id: "evidence-1", source: "current module record", relationship: "supports", claimType: "direct", authority: 1, reliability: 1, freshness: 1, completeness: 0.9, directness: 1, independent: true }] }),
    memberLearning: ["The member followed through when the payment amount was explicit."],
    limitations: ["The balance change alone does not prove the recommendation caused every downstream result."],
    ...values,
  };
}

test("AGENT-218 exposes shared owner-scoped outcome learning", () => {
  assert.ok(new BeastAgentsPlatform().outcomeLearning instanceof SharedOutcomeLearning);
});

test("AGENT-218 records expected versus actual results and successful outcomes", () => {
  const engine = new SharedOutcomeLearning(undefined, () => "2026-07-23T13:00:00.000Z");
  const record = engine.record(outcome());
  assert.equal(record.outcome, "successful");
  assert.equal(record.variance, 0);
  assert.match(record.comparison, /Expected 500 USD; actual 500 USD/);
  assert.equal(record.revision, 1);
});

test("AGENT-218 distinguishes neutral unsuccessful and inconclusive outcomes", () => {
  const engine = new SharedOutcomeLearning();
  const neutral = engine.record(outcome({ id: "neutral", actionStatus: "partially-completed", expectation: { statement: "Discuss options.", assumptions: [] }, actual: { statement: "Options were discussed.", observedAt: "2026-07-20T12:00:00.000Z" } }));
  const unsuccessful = engine.record(outcome({ id: "unsuccessful", actual: { statement: "Only $200 changed.", observedAt: "2026-07-20T12:00:00.000Z", metric: { name: "balance reduction", actualValue: 200, unit: "USD" } } }));
  const inconclusive = engine.record(outcome({ id: "inconclusive", actionStatus: "not-confirmed", actual: undefined }));
  assert.equal(neutral.outcome, "neutral");
  assert.equal(unsuccessful.outcome, "unsuccessful");
  assert.equal(inconclusive.outcome, "inconclusive");
});

test("AGENT-218 preserves evidence confidence and revision history semantics", () => {
  const engine = new SharedOutcomeLearning();
  const first = engine.record(outcome());
  const revised = engine.record(outcome({ actual: { statement: "The verified reduction was $499.", observedAt: "2026-07-24T12:00:00.000Z", metric: { name: "balance reduction", actualValue: 499, unit: "USD" } } }));
  assert.equal(first.revision, 1);
  assert.equal(revised.revision, 2);
  assert.equal(revised.confidence.supportingEvidenceIds[0], "evidence-1");
  assert.equal(revised.evidence[0].id, "evidence-1");
});

test("AGENT-218 enforces owner evidence and matching expected and actual metrics", () => {
  const engine = new SharedOutcomeLearning();
  assert.throws(() => engine.record(outcome({ evidence: [{ id: "evidence-1", source: "record", capturedAt: "2026-07-23T12:00:00.000Z", statement: "Changed", ownerId: "owner-2" }] })), /belong to the recommendation owner/);
  assert.throws(() => engine.record(outcome({ actual: { statement: "Changed", observedAt: "2026-07-23T12:00:00.000Z", metric: { name: "different metric", actualValue: 500, unit: "USD" } } })), /same name and unit/);
});

test("AGENT-218 creates bounded member-specific reasoning without global learning", () => {
  const engine = new SharedOutcomeLearning();
  engine.record(outcome());
  engine.record(outcome({ id: "health", specialistId: "beasthealth.health-advisor", recommendationId: "discuss-medication", recommendation: "Discuss the medication with a physician.", expectation: { statement: "A clinician reviews the medication.", assumptions: [] }, actual: { statement: "The physician reviewed it.", observedAt: "2026-07-22T12:00:00.000Z" }, memberLearning: ["The member prefers clinician-supported medication decisions."] }));
  engine.record(outcome({ id: "guidance", specialistId: "beasteducation.guidance-counselor", recommendationId: "spaced-repetition", recommendation: "Use spaced repetition.", expectation: { statement: "Retention reaches 80%.", metric: { name: "retention", expectedValue: 80, unit: "percent", tolerance: 10 }, assumptions: [] }, actual: { statement: "Retention reached 85%.", observedAt: "2026-07-22T12:00:00.000Z", metric: { name: "retention", actualValue: 85, unit: "percent" } }, memberLearning: ["Spaced repetition coincided with improved retention."] }));
  assert.equal(engine.context({ ownerId: "owner-1", specialistId: "beastmoney.money-coach" }).outcomes.length, 1);
  assert.equal(engine.context({ ownerId: "owner-2", specialistId: "beastmoney.money-coach" }).outcomes.length, 0);
  assert.match(engine.context({ ownerId: "owner-1", specialistId: "beastmoney.money-coach" }).principles.join(" "), /not generalize/i);
});
