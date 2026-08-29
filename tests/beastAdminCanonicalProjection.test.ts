import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildBeastAdminCanonicalReadModel, classifyLegacyBeastAdminRecord, reconcileCanonicalAndLegacy, resolveBeastFusionProviderStatus, type BeastFusionStoredSnapshot } from "../src/lib/beastAdminCanonicalProjection";
import { stableProjectionString, validateBeastFusionCommandProjection, verifyBeastFusionProjectionFreshness } from "../src/lib/beastFusionCommandProjection";
import { verifyBeastFusionWorkflowOidc } from "../src/lib/server/beastFusionOidc";

const digest = (value: string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const sourcePaths = ["MANIFEST.md", "state/beastfusion-package-registry.json", "state/ecosystem-execution-state.json", "state/ecosystem-release-registry.json", "state/ecosystem-version-registry.json", "state/ecosystem-work-scheduler.json", "state/governance-registry.json", "state/shared-agent-registry.json", "versions/versions.json"];

function fixture() {
  const roles: Record<string, string> = {
    "MANIFEST.md": "constitution",
    "state/beastfusion-package-registry.json": "package_registry",
    "state/ecosystem-execution-state.json": "execution_state",
    "state/ecosystem-release-registry.json": "release_registry",
    "state/ecosystem-version-registry.json": "version_registry",
    "state/ecosystem-work-scheduler.json": "scheduler",
    "state/governance-registry.json": "governance_registry",
    "state/shared-agent-registry.json": "agent_registry",
    "versions/versions.json": "version_registry",
  };
  const sourceManifest = sourcePaths.map((path) => ({ path, role: roles[path], digest: digest(path), updatedAt: "2026-08-21" }));
  const canonicalInputDigest = digest(sourceManifest.map((item) => `${item.path}\0${item.digest}`).join("\n"));
  const sourceCommit = "a4a3303a857354ce0568ebcb1ae841e4c7beda0e";
  const projectionIdentity = digest(`${canonicalInputDigest}\0${sourceCommit}`);
  return {
    $schema: "beastfusion-command-center-projection.schema.json", projectionVersion: "1.0.0", projectionId: `bfcp_${projectionIdentity.slice(7, 23)}`, generatedAt: "2026-08-21T20:00:00Z",
    source: { owner: "beastfusion", repository: "seangworld/beastfusion", branch: "main", commit: sourceCommit, canonicalInputDigest, generatorVersion: "1.0.0" },
    classification: { audience: "beastadmin_owner_only", containsMemberData: false, containsSecrets: false, containsRawPrompts: false }, sourceManifest,
    summary: { cursorPath: ["Planning Mode"], cursorMode: "planning_mode", executableWorkAvailable: false, selectedPackage: null, selectedProduct: null, selectionReason: "Owner review required", recommendedDirective: "Owner Strategy Review", ownerDecisionRequired: true, ownerDecisionReason: "No approved work", warningCount: 0, errorCount: 0 },
    portfolio: [{ id: "beastfusion", name: "BeastFusion", parent: null, ownerRepository: "seangworld/beastfusion", lifecycle: "active", version: "1.0.0", buildId: null, releaseDate: "2026-08-21", channel: "canonical", declaredDeployment: "repository", deploymentEvidenceType: "canonical_declaration", activeRoadmap: "roadmaps/active/BeastFusion.md" }],
    roadmap: { items: [{ id: "BF-CMD-PROJ-001", product: "beastfusion", title: "Projection", summary: "Canonical projection", canonicalState: "complete", ownerApproved: true, executionAuthorized: false, prerequisitesComplete: true, blocked: false, executable: false, priority: "normal", roadmapOrder: 0, dependencies: [], blockerCodes: [], ownerAction: null, sourceReference: "roadmaps/active/BeastFusion.md", evidenceReferences: [] }], documents: [{ product: "beastfusion", title: "BeastFusion", path: "roadmaps/active/BeastFusion.md", classification: "active", ownerApproved: true, digest: digest("roadmap"), indexedItemCount: 1, unindexedWarningCount: 0 }], warnings: [] },
    execution: { cursorPath: ["Planning Mode"], terminalState: "planning_mode", current: null, nextFive: [], blocked: [], waiting: [], recentlyCompleted: [], packageReconciliation: { reconciledAt: "2026-08-21", total: 1, completed: 1, remaining: 0, currentExecutableProduct: null, currentExecutablePackage: null, warningCount: 0 }, events: [{ id: "bfe_0123456789abcdef", type: "package_completion", product: "beastfusion", package: "BF-CMD-PROJ-001", occurredAt: "2026-08-21", summary: "Completed", authorizationClass: "governed_execution_record", evidenceReference: "commit:a4a3303a857354ce0568ebcb1ae841e4c7beda0e" }] },
    releases: [{ id: "bf-release", product: "beastfusion", module: "governance", version: "1.0.0", type: "repository", state: "released", releaseDate: "2026-08-21", ownerApproved: true, validationState: "passed", dependencies: [], blockers: [], evidenceSummary: "1 record", evidenceReference: "docs/release.md", declaredDeployment: "released_recorded" }],
    governance: { registryVersion: "1.0.0", packageRegistryVersion: "1.10.0", executionStateVersion: "1.10.0", automationEnabled: false, autonomousExecution: false, deploymentCapability: false, beastShieldState: "complete", beastShieldMeaning: "governance_declaration_not_live_control_verification", dependencyIntegrity: "validated_by_beastfusion", validatorState: "registered_complete", warningCodes: [], errorCodes: [] },
    validation: { projectionSchema: "beastfusion-command-center-projection.schema.json", projectionGenerated: true, canonicalConsistency: "passed", lastGovernedEvidenceReference: "docs/release.md", lastGovernedEvidenceDate: "2026-08-21", testCount: null, warnings: [] },
  };
}

function acceptedSnapshot(): BeastFusionStoredSnapshot {
  const validation = validateBeastFusionCommandProjection(fixture());
  assert.equal(validation.ok, true);
  if (!validation.ok) throw new Error("fixture invalid");
  return { projectionId: validation.projection.projectionId, projectionVersion: "1.0.0", payloadHash: validation.payloadHash, canonicalInputDigest: validation.canonicalInputDigest, sourceCommit: validation.projection.source.commit, generatedAt: validation.projection.generatedAt, acceptedAt: "2026-08-21T20:01:00Z", lastConfirmedAt: "2026-08-21T20:01:00Z", payload: validation.projection };
}

function validationErrors(value: unknown) {
  const result = validateBeastFusionCommandProjection(value);
  return result.ok ? "" : result.errors.join(" ");
}

test("BA-CMD-001A accepts the strict canonical projection deterministically", () => {
  const first = validateBeastFusionCommandProjection(fixture());
  const second = validateBeastFusionCommandProjection(JSON.parse(stableProjectionString(fixture())));
  assert.equal(first.ok, true); assert.deepEqual(first, second);
});

test("projection identity binds unchanged canonical content to the exact source commit", () => {
  const first = fixture();
  const next = fixture();
  next.source.commit = "b4a3303a857354ce0568ebcb1ae841e4c7beda0e";
  const nextIdentity = digest(`${next.source.canonicalInputDigest}\0${next.source.commit}`);
  next.projectionId = `bfcp_${nextIdentity.slice(7, 23)}`;
  assert.notEqual(first.projectionId, next.projectionId);
  assert.equal(validateBeastFusionCommandProjection(next).ok, true);
});

test("malformed partial unknown-version hash and sensitive projections fail closed", () => {
  const unknown = fixture() as Record<string, unknown>; unknown.extra = true;
  assert.match(validationErrors(unknown), /unknown fields/);
  const version = fixture(); version.projectionVersion = "2.0.0";
  assert.equal(validateBeastFusionCommandProjection(version).ok, false);
  const hash = fixture(); hash.sourceManifest[0].digest = digest("tampered");
  assert.match(validationErrors(hash), /digest mismatch|identity/i);
  const partial = fixture() as Record<string, unknown>; delete partial.releases;
  assert.equal(validateBeastFusionCommandProjection(partial).ok, false);
  const wrongPrimitive = fixture() as unknown as { summary: Record<string, unknown> }; wrongPrimitive.summary.warningCount = "0";
  assert.equal(validateBeastFusionCommandProjection(wrongPrimitive).ok, false);
  const sensitive = fixture() as unknown as { roadmap: { warnings: string[] } }; sensitive.roadmap.warnings.push("Bearer secret-token-value-123456");
  assert.match(validationErrors(sensitive), /sensitive/i);
});

test("machine publication requires exact short-lived GitHub Actions OIDC claims", async () => {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const key = { ...publicKey.export({ format: "jwk" }), kid: "test-key", kty: "RSA" };
  const now = Date.parse("2026-08-21T20:00:00Z");
  const nowSeconds = Math.floor(now / 1000);
  const workflowRef = "seangworld/beastfusion/.github/workflows/publish-beastadmin-projection.yml@refs/heads/main";
  const audience = "https://dev.example.com/api/admin/beastfusion-projection";
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key", typ: "JWT" })).toString("base64url");
  const claims = { iss: "https://token.actions.githubusercontent.com", aud: audience, sub: "repo:seangworld@271630738/beastfusion@1297414450:ref:refs/heads/main", repository: "seangworld/beastfusion", ref: "refs/heads/main", workflow_ref: workflowRef, sha: fixture().source.commit, run_number: "42", run_attempt: "1", iat: nowSeconds - 10, nbf: nowSeconds - 10, exp: nowSeconds + 300 };
  const tokenFor = (payload: Record<string, unknown>) => {
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = sign("RSA-SHA256", Buffer.from(`${header}.${encoded}`), privateKey).toString("base64url");
    return `${header}.${encoded}.${signature}`;
  };
  const valid = await verifyBeastFusionWorkflowOidc({ authorization: `Bearer ${tokenFor(claims)}`, expectedAudience: audience, expectedWorkflowRef: workflowRef, now, keys: [key] });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.identity.subject, claims.sub);
    assert.equal(valid.identity.runNumber, 42);
    assert.equal(valid.identity.runAttempt, 1);
  }
  const invalidSubject = await verifyBeastFusionWorkflowOidc({ authorization: `Bearer ${tokenFor({ ...claims, sub: "repo:seangworld/beastfusion:ref:refs/heads/main" })}`, expectedAudience: audience, expectedWorkflowRef: workflowRef, now, keys: [key] });
  assert.deepEqual(invalidSubject, { ok: false, reason: "Machine identity subject is not allowed." });
  const invalidRun = await verifyBeastFusionWorkflowOidc({ authorization: `Bearer ${tokenFor({ ...claims, run_number: "not-a-number" })}`, expectedAudience: audience, expectedWorkflowRef: workflowRef, now, keys: [key] });
  assert.deepEqual(invalidRun, { ok: false, reason: "Machine identity workflow run metadata is invalid." });
  for (const overrides of [{ sub: "repo:seangworld/beastfusion:ref:refs/heads/main" }, { repository: "attacker/repo" }, { ref: "refs/heads/feature" }, { workflow_ref: "seangworld/beastfusion/.github/workflows/other.yml@refs/heads/main" }, { aud: "wrong" }, { exp: nowSeconds - 1 }, { sha: "f".repeat(39) }]) {
    const result = await verifyBeastFusionWorkflowOidc({ authorization: `Bearer ${tokenFor({ ...claims, ...overrides })}`, expectedAudience: audience, expectedWorkflowRef: workflowRef, now, keys: [key] });
    assert.equal(result.ok, false);
  }
});

test("publication rejects stale and future projections before persistence", () => {
  const now = Date.parse("2026-08-21T20:00:00Z");
  assert.equal(verifyBeastFusionProjectionFreshness("2026-08-21T19:59:00Z", now).ok, true);
  assert.equal(verifyBeastFusionProjectionFreshness("2026-08-20T19:59:59Z", now).ok, false);
  assert.equal(verifyBeastFusionProjectionFreshness("2026-08-21T20:05:01Z", now).ok, false);
});

test("canonical adapters expose roadmap execution releases attention and cursor without provider claims", () => {
  const model = buildBeastAdminCanonicalReadModel(acceptedSnapshot(), { now: new Date("2026-08-21T20:02:00Z") });
  assert.equal(model.provider.status, "connected"); assert.equal(model.cursor.executableWorkAvailable, false);
  assert.equal(model.projection?.sourceCommit, "a4a3303a857354ce0568ebcb1ae841e4c7beda0e");
  assert.equal(model.products[0].id, "beastfusion");
  assert.equal(model.roadmap[0].source, "beastfusion"); assert.equal(model.roadmap[0].sourceReference, "roadmaps/active/BeastFusion.md");
  assert.equal(model.execution[0].candidateCommit, "a4a3303a857354ce0568ebcb1ae841e4c7beda0e");
  assert.equal(model.execution[0].completedAt, "2026-08-21");
  assert.deepEqual(model.executionOverview?.reconciliation, { reconciledAt: "2026-08-21", total: 1, completed: 1, remaining: 0, currentExecutableProduct: null, currentExecutablePackage: null, warningCount: 0 });
  assert.equal(model.releases[0].preview, "not_in_projection_v1"); assert.equal(model.releases[0].servedCommit, null);
  assert.equal(model.governance?.autonomousExecution, false);
  assert.equal(model.validation?.canonicalConsistency, "passed");
  assert.equal(model.records?.length, sourcePaths.length);
});

test("BA-CMD-002 groups roadmap indexing diagnostics into one actionable owner signal", () => {
  const payload = fixture();
  const mutable = payload as unknown as {
    roadmap: { warnings: string[] };
    governance: { warningCodes: string[] };
    validation: { warnings: string[] };
    summary: { warningCount: number };
  };
  const warnings = [
    "roadmaps/active/BeastHome.md is approved but contains no indexable package table rows.",
    "roadmaps/planned/BeastMoney/v2.5.0.md is approved but contains no indexable package table rows.",
  ];
  mutable.roadmap.warnings = warnings;
  mutable.governance.warningCodes = ["roadmap_unindexed_1", "roadmap_unindexed_2"];
  mutable.validation.warnings = warnings;
  mutable.summary.warningCount = warnings.length;
  const validation = validateBeastFusionCommandProjection(payload);
  assert.equal(validation.ok, true);
  if (!validation.ok) throw new Error("fixture invalid");
  const model = buildBeastAdminCanonicalReadModel({
    projectionId: validation.projection.projectionId,
    projectionVersion: validation.projection.projectionVersion,
    payloadHash: validation.payloadHash,
    canonicalInputDigest: validation.canonicalInputDigest,
    sourceCommit: validation.projection.source.commit,
    generatedAt: validation.projection.generatedAt,
    acceptedAt: "2026-08-21T20:01:00Z",
    lastConfirmedAt: "2026-08-21T20:01:00Z",
    payload: validation.projection,
  });
  assert.equal(model.attention.length, 2);
  const grouped = model.attention.find((item) => item.id === "roadmap-indexing-reconciliation");
  assert.match(grouped?.detail || "", /2 approved roadmap records require indexing reconciliation/);
  assert.match(grouped?.detail || "", /Impact: roadmap coverage may be incomplete/);
  assert.doesNotMatch(model.attention.map((item) => item.id).join(" "), /roadmap_unindexed_/);
});

test("provider states preserve last valid snapshot and never fabricate connection", () => {
  assert.equal(resolveBeastFusionProviderStatus({ configured: false, snapshot: null }).status, "not_configured");
  assert.equal(resolveBeastFusionProviderStatus({ configured: true, snapshot: null }).status, "no_snapshot");
  assert.equal(resolveBeastFusionProviderStatus({ configured: true, snapshot: acceptedSnapshot(), now: new Date("2026-09-01T00:00:00Z") }).status, "stale");
  assert.equal(resolveBeastFusionProviderStatus({ configured: true, snapshot: acceptedSnapshot(), validationError: "Drift", drift: true }).status, "drift_detected");
});

test("legacy intake annotation and archive remain separate while BeastFusion wins conflicts", () => {
  assert.equal(classifyLegacyBeastAdminRecord({ sourceType: "beast_hunter" }), "intake");
  assert.equal(classifyLegacyBeastAdminRecord({}), "legacy");
  assert.equal(classifyLegacyBeastAdminRecord({ archived: true }), "archive");
  assert.equal(classifyLegacyBeastAdminRecord({ classification: "annotation" }), "annotation");
  const result = reconcileCanonicalAndLegacy([{ id: "same" }], [{ id: "same", classification: "annotation" }]);
  assert.deepEqual(result.conflicts, [{ id: "same", resolution: "beastfusion_wins" }]);
});

test("migration enforces immutable owner-only service-published snapshots", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/20260821000500_add_beastfusion_command_projection.sql"), "utf8");
  const identityPin = readFileSync(join(process.cwd(), "supabase/migrations/20260821000600_pin_beastfusion_oidc_subject.sql"), "utf8");
  for (const expected of ["beastfusion_command_snapshots", "beastfusion_command_ingestions", "beastfusion_command_current", "prevent_beastfusion_command_snapshot_mutation", "publish_beastfusion_command_snapshot", "get_beastfusion_command_current", "enable row level security", "to service_role", "Replay or out-of-order", "governance_classification", "candidate_intake"]) assert.match(sql, new RegExp(expected));
  assert.doesNotMatch(sql, /grant (?:select|insert|update|delete|all).* to authenticated/i);
  assert.match(sql, /revoke all on public\.beastfusion_command_snapshots from anon, authenticated/);
  assert.match(identityPin, /selected_oidc_subject <> 'repo:seangworld@271630738\/beastfusion@1297414450:ref:refs\/heads\/main'/);
  assert.doesNotMatch(identityPin, /selected_oidc_subject not like/);
  assert.match(identityPin, /\(existing_snapshot\.payload - 'generatedAt'\) <> \(selected_payload - 'generatedAt'\)/);
  assert.doesNotMatch(identityPin, /existing_snapshot\.payload_hash <> selected_payload_hash/);
  assert.match(identityPin, /selected_generated_at < existing_snapshot\.generated_at/);
});

test("publication endpoint is server-only and fails closed", () => {
  const route = readFileSync(join(process.cwd(), "src/app/api/admin/beastfusion-projection/route.ts"), "utf8");
  assert.match(route, /BEASTFUSION_OIDC_AUDIENCE/);
  assert.match(route, /verifyBeastFusionWorkflowOidc/);
  assert.match(route, /source commit does not match/);
  assert.match(route, /createBeastFusionPublicationClient/);
  assert.match(route, /last valid snapshot remains current/);
  assert.doesNotMatch(route, /NEXT_PUBLIC_BEASTFUSION/);
});

test("BeastHunter handoff creates candidate intake and never executable truth", () => {
  const route = readFileSync(join(process.cwd(), "src/app/api/admin/beast-hunter/actions/route.ts"), "utf8");
  assert.match(route, /governance_classification: "intake"/);
  assert.match(route, /execution_status: "candidate_intake"/);
  assert.match(route, /is_next_build: false/);
  assert.match(route, /does not create executable roadmap truth/);
  assert.doesNotMatch(route, /api\.github\.com\/repos/);
});
