import assert from "node:assert/strict";
import test from "node:test";
import { buildStandingEcosystemEvidence } from "../src/lib/standingObservationEvidence";
import { evidenceDigest, evaluateStandingObservation } from "../src/lib/standingObservation";
import type { BeastAdminRepositoryObservation, BeastAdminDeploymentObservation } from "../src/lib/beastAdminRepositoryReleaseIntelligence";

const repo: BeastAdminRepositoryObservation = { repository: "seangworld/seangworld.com", state: "connected", defaultBranch: "main", headCommit: "a".repeat(40), headCommittedAt: null, observedAt: null, detail: "" };
const deployment: BeastAdminDeploymentObservation = { repository: repo.repository, environment: "production", state: "connected", servedCommit: repo.headCommit, branch: "main", deploymentId: "deployment", deploymentUrl: null, deployedAt: null, observedAt: null, detail: "" };

test("ecosystem observation detects News Production divergence even when both providers are connected", () => {
  const evidence = buildStandingEcosystemEvidence({ attention: [] }, [repo], [{ ...deployment, servedCommit: "b".repeat(40) }]);
  const result = evaluateStandingObservation(evidence);
  assert.equal(result.findings.length, 1);
  assert.deepEqual(result.findings[0].affectedProducts, ["SEANGWORLD"]);
  assert.match(result.findings[0].summary, /intentional release gap is possible/);
});

test("an unrelated successful release does not recreate unchanged canonical findings", () => {
  const canonical = { attention: [{ id: "blocked", kind: "blocker" as const, detail: "Awaiting a provider connection", source: "beastfusion" as const }] };
  const before = buildStandingEcosystemEvidence(canonical, [repo], [deployment]);
  const after = buildStandingEcosystemEvidence(canonical, [{ ...repo, headCommit: "c".repeat(40) }], [{ ...deployment, servedCommit: "c".repeat(40), deploymentId: "new" }]);
  assert.equal(evidenceDigest([before[0]]), evidenceDigest([after[0]]));
  assert.equal(evaluateStandingObservation(after, evidenceDigest(before)).status, "duplicate_skipped");
});

test("absent providers stay unavailable and do not invent a healthy observation", () => {
  const result = evaluateStandingObservation(buildStandingEcosystemEvidence({ attention: [] }, [], []));
  assert.deepEqual(result.unavailableSources, ["github_repository_evidence", "vercel_deployment_evidence"]);
  assert.equal(result.confidence, "unknown");
  assert.match(result.nextStep, /Restore unavailable evidence/);
});

test("a Preview difference does not become a Production finding", () => {
  const evidence = buildStandingEcosystemEvidence({ attention: [] }, [repo], [deployment, { ...deployment, environment: "preview", servedCommit: "b".repeat(40) }]);
  assert.equal(evaluateStandingObservation(evidence).findings.length, 0);
});

test("partial repository failure remains attributed to the affected product", () => {
  const evidence = buildStandingEcosystemEvidence({ attention: [] }, [repo, { ...repo, repository: "seangworld/thebeast", state: "error", headCommit: null }], [deployment]);
  assert.deepEqual(evaluateStandingObservation(evidence).findings[0].affectedProducts, ["The Beast"]);
});
