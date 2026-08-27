import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateStandingObservation, evidenceDigest, maximumInvestigationsPerCycle, maximumRetriesPerSource, runAfterControlledObservationValidation, runAfterStandingObservationAuthorization, runWithBoundedRetries, standingObservationAssignment, standingObservationAuthorityFailure, standingObservationPermittedSources, standingObservationScope, standingProposalSourceId, verifyCronAuthorization } from "../src/lib/standingObservation";

const clean = [{ source: "canonical", available: true, changed: false, summary: "No change", confidence: "high" as const, impact: "none" as const, fingerprint: "one" }];
test("BF-AGT-011 records a clean cycle without fabricating findings", () => { const result = evaluateStandingObservation(clean); assert.equal(result.status, "clean"); assert.equal(result.findings.length, 0); assert.equal(result.proposalCount, 0); });
test("BF-AGT-011 suppresses an unchanged digest before investigation", () => { const digest = evidenceDigest(clean); const result = evaluateStandingObservation(clean, digest); assert.equal(result.status, "duplicate_skipped"); assert.equal(result.investigationCount, 0); });
test("BF-AGT-011 suppresses low-impact noise", () => { const result = evaluateStandingObservation([{ ...clean[0], changed: true, impact: "low", summary: "noise" }]); assert.equal(result.status, "clean"); assert.deepEqual(result.suppressedSignals, ["canonical: noise"]); });
test("BF-AGT-011 bounds material investigations and generated proposals", () => { const results = Array.from({ length: 7 }, (_, i) => ({ source: `source-${i}`, available: true, changed: true, summary: "material", confidence: "high" as const, impact: "high" as const, fingerprint: String(i) })); const result = evaluateStandingObservation(results); assert.equal(result.findings.length, maximumInvestigationsPerCycle); assert.equal(result.proposalCount, 3); assert.equal(maximumRetriesPerSource, 2); });
test("BF-AGT-011 cron authorization fails closed", () => { assert.equal(verifyCronAuthorization("Bearer correct-secret-value-123", "correct-secret-value-123"), true); assert.equal(verifyCronAuthorization("Bearer wrong", "correct-secret-value-123"), false); assert.equal(verifyCronAuthorization(null, undefined), false); });
test("BF-AGT-011 duplicate proposal identity is deterministic and database-safe", () => { const first = standingProposalSourceId("digest", "canonical"); assert.equal(first, standingProposalSourceId("digest", "canonical")); assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/); });
test("BF-AGT-011 retries a failing provider no more than the declared bound", async () => { let attempts = 0; const result = await runWithBoundedRetries(async () => ({ failed: ++attempts < 4 }), (value) => value.failed); assert.equal(result.retries, 2); assert.equal(attempts, 3); });
test("BF-AGT-011 generated intake uses existing taxonomy and waits for canonical reconciliation", () => { const runner = readFileSync("src/lib/server/standingObservationRunner.ts", "utf8"); const route = readFileSync("src/app/api/admin/strategy-proposals/route.ts", "utf8"); assert.match(runner, /proposalIntakeProduct\("BeastFusion"\)/); assert.match(runner, /awaiting_beastfusion_reconciliation/); assert.match(runner, /proposal_intake_write_failed/); assert.doesNotMatch(route, /payload\?\.proposal/); });
test("BF-AGT-011 migration is owner-only, disabled by default, and non-executable", () => { const sql = readFileSync("supabase/migrations/20260826194329_add_standing_observation_staff_scheduling.sql", "utf8"); assert.match(sql, /enabled boolean not null default false/); assert.match(sql, /public\.is_profile_admin\(\)/g); assert.match(sql, /revoke all .* from anon, authenticated/); assert.match(sql, /never execution authority/); });
test("BF-AGT-011 schedule and UI preserve owner and Production gates", () => { const cron = readFileSync("vercel.json", "utf8"); const route = readFileSync("src/app/api/admin/staff-operations/route.ts", "utf8"); const runner = readFileSync("src/lib/server/standingObservationRunner.ts", "utf8"); assert.match(cron, /0 10 \* \* \*/); assert.match(route, /BeastAdmin owner access required/); assert.match(route, /Controlled simulations are disabled in Production/); assert.match(runner, /executionAuthorized: false/); });
test("BF-AGT-011 exposes only the authenticated clean proof outside Production", () => {
  const page = readFileSync("src/app/dashboard/admin/development/page.tsx", "utf8");
  const workspace = readFileSync("src/app/dashboard/admin/development/StaffOperationsWorkspace.tsx", "utf8");
  assert.match(page, /process\.env\.VERCEL_ENV !== "production"/);
  assert.match(page, /controlledProofAvailable=\{controlledProofAvailable\}/);
  assert.match(workspace, /Run Controlled Clean Proof/);
  assert.match(workspace, /body: JSON\.stringify\(\{ action: "simulate_clean" \}\)/);
  assert.match(workspace, /does not create a proposal or activate standing scheduling/);
  assert.doesNotMatch(workspace, /simulate_material|simulate_failure/);
});

const standingAuthorization = { authorization_key: standingObservationAssignment, origin_package_id: "BF-AGT-011", owner_authorized: true, scope_key: standingObservationScope, permitted_sources: [...standingObservationPermittedSources], revoked_at: null };
const enabledSchedule = { assignment_key: standingObservationAssignment, enabled: true, paused_at: null, scope_key: standingObservationScope, permitted_sources: [...standingObservationPermittedSources] };
const completedOrigin = [{ id: "BF-AGT-011", status: "complete", ownerApproved: true, executionAuthorized: false }];

test("BF-AGT-011 standing authority survives package closure without becoming general execution authority", () => {
  assert.equal(standingObservationAuthorityFailure({ authorization: standingAuthorization, schedule: enabledSchedule, canonicalRoadmap: completedOrigin }), null);
  const normalExecution = readFileSync("src/lib/beastAdminCEOMode.ts", "utf8");
  assert.match(normalExecution, /item\.executable && item\.ownerApproved && item\.executionAuthorized/);
  assert.match(normalExecution, /canonical\.cursor\.executableWorkAvailable/);
});

test("BF-AGT-011 paused and revoked standing schedules fail closed", () => {
  assert.equal(standingObservationAuthorityFailure({ authorization: standingAuthorization, schedule: { ...enabledSchedule, enabled: false, paused_at: "2026-08-27T00:00:00Z" }, canonicalRoadmap: completedOrigin }), "standing_schedule_inactive");
  assert.equal(standingObservationAuthorityFailure({ authorization: { ...standingAuthorization, revoked_at: "2026-08-27T00:00:00Z" }, schedule: enabledSchedule, canonicalRoadmap: completedOrigin }), "standing_authorization_unavailable");
});

test("BF-AGT-011 unrelated completed packages and canonical-state loss grant no standing authority", () => {
  assert.equal(standingObservationAuthorityFailure({ authorization: standingAuthorization, schedule: enabledSchedule, canonicalRoadmap: [{ id: "BF-AGT-999", status: "complete", ownerApproved: true, executionAuthorized: false }] }), "canonical_origin_unavailable");
  assert.equal(standingObservationAuthorityFailure({ authorization: standingAuthorization, schedule: enabledSchedule, canonicalRoadmap: null }), "canonical_state_unavailable");
});

test("BF-AGT-011 fixed scope cannot expand and proposal intake remains non-executable", () => {
  assert.equal(standingObservationAuthorityFailure({ authorization: { ...standingAuthorization, permitted_sources: [...standingObservationPermittedSources, "developer_agent"] }, schedule: enabledSchedule, canonicalRoadmap: completedOrigin }), "standing_authorization_scope_changed");
  const runner = readFileSync("src/lib/server/standingObservationRunner.ts", "utf8");
  assert.match(runner, /executionAuthorized: false, executable: false/);
  assert.doesNotMatch(runner, /executionAuthorized: true|executable: true/);
});

test("BF-AGT-011 lifecycle migration persists immutable bounded authority without authenticated writes", () => {
  const sql = readFileSync("supabase/migrations/20260827014607_add_standing_observation_authorization.sql", "utf8");
  assert.match(sql, /origin_package_id text not null default 'BF-AGT-011'/);
  assert.match(sql, /revoked_at timestamptz/);
  assert.match(sql, /revoke all on table public\.beast_admin_standing_authorizations from anon, authenticated/);
  assert.match(sql, /grant select on table public\.beast_admin_standing_authorizations to authenticated/);
  assert.doesNotMatch(sql, /grant (?:insert|update|delete).*beast_admin_standing_authorizations/);
  assert.match(sql, /cannot execute proposals, build, release, spend, or expand scope/);
});

test("BF-AGT-011 performs no provider reads before every standing authority gate passes", async () => {
  const denied = [
    { authorization: { ...standingAuthorization, revoked_at: "2026-08-27T00:00:00Z" }, schedule: enabledSchedule, canonicalRoadmap: completedOrigin },
    { authorization: standingAuthorization, schedule: { ...enabledSchedule, enabled: false, paused_at: "2026-08-27T00:00:00Z" }, canonicalRoadmap: completedOrigin },
    { authorization: standingAuthorization, schedule: { ...enabledSchedule, permitted_sources: ["github_repository_evidence"] }, canonicalRoadmap: completedOrigin },
    { authorization: standingAuthorization, schedule: enabledSchedule, canonicalRoadmap: [{ id: "BF-AGT-999", status: "complete", ownerApproved: true, executionAuthorized: false }] },
    { authorization: standingAuthorization, schedule: enabledSchedule, canonicalRoadmap: null },
  ];
  let providerReads = 0;
  for (const authority of denied) {
    await assert.rejects(runAfterStandingObservationAuthorization(authority, async () => { providerReads += 1; return "read"; }));
  }
  assert.equal(providerReads, 0);
  assert.equal(await runAfterStandingObservationAuthorization({ authorization: standingAuthorization, schedule: enabledSchedule, canonicalRoadmap: completedOrigin }, async () => { providerReads += 1; return "read"; }), "read");
  assert.equal(providerReads, 1);
});

test("BF-AGT-011 controlled clean Preview validation needs canonical origin but no recurring schedule", async () => {
  let controlledRuns = 0;
  assert.equal(await runAfterControlledObservationValidation(completedOrigin, async () => { controlledRuns += 1; return "clean"; }), "clean");
  assert.equal(controlledRuns, 1);
  await assert.rejects(runAfterControlledObservationValidation(null, async () => { controlledRuns += 1; return "unsafe"; }));
  assert.equal(controlledRuns, 1);
  const runner = readFileSync("src/lib/server/standingObservationRunner.ts", "utf8");
  const route = readFileSync("src/app/api/admin/staff-operations/route.ts", "utf8");
  assert.match(runner, /runAfterControlledObservationValidation/);
  assert.match(route, /runStandingObservation\(user\.id, null, "clean"\)/);
  assert.doesNotMatch(runner, /simulation === "material"|simulation === "failure"/);
});
