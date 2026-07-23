import assert from "node:assert/strict";
import test from "node:test";
import {
  BeastAgentsPlatform,
  SharedProbabilityConfidenceEngine,
  SharedTrustDataFreshnessEngine,
  type DataSourceFreshnessInput,
} from "../src/lib/platform/agents";

const asOf = "2026-07-23T12:00:00.000Z";

function source(values: Partial<DataSourceFreshnessInput> = {}): DataSourceFreshnessInput {
  return {
    id: "checking",
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
    source: "bank-connection",
    label: "Checking account",
    recordType: "account-balance",
    lastSynchronizedAt: "2026-07-23T09:00:00.000Z",
    lastSuccessfulSynchronizationAt: "2026-07-23T09:00:00.000Z",
    expectedRefreshMinutes: 60,
    health: "healthy",
    ...values,
  };
}

test("AGENT-220 exposes one shared trust and freshness engine", () => {
  assert.ok(new BeastAgentsPlatform().trustDataFreshness instanceof SharedTrustDataFreshnessEngine);
});

test("AGENT-220 reports synchronization age and freshness", () => {
  const report = new SharedTrustDataFreshnessEngine().assess({
    ownerId: "owner-1",
    specialistId: "beastmoney.money-coach",
    asOf,
    sources: [
      source(),
      source({ id: "mortgage", label: "Mortgage balance", lastSynchronizedAt: "2026-07-04T12:00:00.000Z", lastSuccessfulSynchronizationAt: "2026-07-04T12:00:00.000Z", expectedRefreshMinutes: 1440 }),
    ],
  });
  assert.match(report.statements[0], /Checking account synchronized 3 hours ago/);
  assert.match(report.statements[1], /Mortgage balance synchronized 19 days ago/);
  assert.equal(report.sources[0].freshness, "recent");
  assert.equal(report.sources[1].freshness, "stale");
  assert.deepEqual(report.staleSourceIds, ["mortgage"]);
});

test("AGENT-220 detects missing updates, degraded health, failures, and unavailable sources", () => {
  const report = new SharedTrustDataFreshnessEngine().assess({
    ownerId: "owner-1",
    specialistId: "beasthealth.health-advisor",
    asOf,
    sources: [{
      ...source(),
      id: "wearable",
      specialistId: "beasthealth.health-advisor",
      label: "Wearable",
      recordType: "activity",
      lastSynchronizedAt: "2026-07-21T12:00:00.000Z",
      lastSuccessfulSynchronizationAt: "2026-07-21T12:00:00.000Z",
      expectedRefreshMinutes: 720,
      health: "unavailable",
      consecutiveFailures: 2,
      missingExpectedUpdates: 2,
    }],
  });
  assert.equal(report.sources[0].missingUpdate, true);
  assert.deepEqual(report.unavailableSourceIds, ["wearable"]);
  assert.match(report.sources[0].limitations.join(" "), /2 consecutive synchronization failures/);
  assert.match(report.sources[0].limitations.join(" "), /2 expected updates missing/);
});

test("AGENT-220 integrates freshness and source health into AGENT-212 confidence", () => {
  const engine = new SharedTrustDataFreshnessEngine();
  const confidenceEngine = new SharedProbabilityConfidenceEngine();
  const currentTrust = engine.assess({ ownerId: "owner-1", specialistId: "beastmoney.money-coach", asOf, sources: [source({ lastSynchronizedAt: "2026-07-23T11:30:00.000Z", lastSuccessfulSynchronizationAt: "2026-07-23T11:30:00.000Z" })] });
  const staleTrust = engine.assess({ ownerId: "owner-1", specialistId: "beastmoney.money-coach", asOf, sources: [source({ lastSynchronizedAt: "2026-06-01T12:00:00.000Z", lastSuccessfulSynchronizationAt: "2026-06-01T12:00:00.000Z", health: "degraded" })] });
  const request = {
    claim: "The current checking balance supports the recommendation.",
    evidence: [{ id: "balance", source: "checking", relationship: "supports" as const, claimType: "direct" as const, authority: 1, reliability: 0.95, freshness: 1, completeness: 0.9, directness: 1, independent: true }],
  };
  const current = engine.assessConfidence({ confidenceEngine, request, trust: currentTrust, evidenceSourceIds: { balance: "checking" } });
  const stale = engine.assessConfidence({ confidenceEngine, request, trust: staleTrust, evidenceSourceIds: { balance: "checking" } });
  assert.ok(current.confidenceScore > stale.confidenceScore);
  assert.ok(stale.additionalInformationNeeded.some((item) => /current healthy update from Checking account/i.test(item)));
  assert.match(stale.uncertaintyReasons.join(" "), /freshness is stale/i);
});

test("AGENT-220 preserves specialist and owner scoping", () => {
  const engine = new SharedTrustDataFreshnessEngine();
  assert.throws(() => engine.assess({ ownerId: "owner-1", specialistId: "beastmoney.money-coach", asOf, sources: [source({ ownerId: "owner-2" })] }), /match the report owner and specialist/);
  assert.throws(() => engine.assess({ ownerId: "owner-1", specialistId: "beastmoney.money-coach", asOf, sources: [source({ specialistId: "beasthealth.health-advisor" })] }), /match the report owner and specialist/);
});

test("AGENT-220 handles sources without synchronization history honestly", () => {
  const report = new SharedTrustDataFreshnessEngine().assess({ ownerId: "owner-1", specialistId: "beastmoney.money-coach", asOf, sources: [source({ lastSynchronizedAt: undefined, lastSuccessfulSynchronizationAt: undefined, health: "unknown" })] });
  assert.equal(report.sources[0].freshness, "unknown");
  assert.match(report.sources[0].statement, /no successful synchronization timestamp/);
  assert.match(report.sources[0].limitations[0], /No successful synchronization time/);
});
