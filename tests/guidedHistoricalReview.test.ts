import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("BH-209 exposes a contextual Health entry point into the existing review route", () => {
  const workspace = readFileSync("src/app/dashboard/health/BeastHealthWorkspace.tsx", "utf8");
  assert.match(workspace, /legacyHealthAggregateState/);
  assert.match(workspace, /Review &amp; organize/);
  assert.match(workspace, /professionalId=beasthealth\.health-advisor/);
  assert.match(workspace, /returnTo=/);
  assert.match(workspace, /cannot safely separate it automatically/);
});

test("BE-209 exposes structured Education history review without a second persistence path", () => {
  const workspace = readFileSync("src/app/dashboard/learning/LearningWorkspaceView.tsx", "utf8");
  const review = readFileSync("src/app/dashboard/digital-staff/reconciliation/HistoricalKnowledgeReconciliation.tsx", "utf8");
  assert.match(workspace, /historicalAggregate/);
  assert.match(workspace, /professionalId=beasteducation\.guidance-counselor/);
  assert.match(workspace, /Review &amp; organize/);
  assert.match(review, /updateHistoricalReconciliation/);
  assert.match(review, /router\.push\(returnTo\)/);
  assert.match(review, /action: "start"/);
  assert.match(review, /action: "process"/);
});

test("BH-209 review remains the deployed v3 route with focused owner-scoped return", () => {
  const page = readFileSync("src/app/dashboard/digital-staff/reconciliation/page.tsx", "utf8");
  const route = readFileSync("src/app/api/digital-staff/reconciliation/route.ts", "utf8");
  assert.match(page, /professionalId/);
  assert.match(page, /returnTo/);
  assert.match(route, /historicalReconciliationVersion/);
  assert.match(route, /applyApprovedKnowledgeProposal/);
  assert.doesNotMatch(route, /insert\(.*aggregate/i);
});

test("AP-107 keeps live approval owner-scoped across proposal-bearing messages", () => {
  const route = readFileSync("src/app/api/digital-staff/runtime/route.ts", "utf8");
  const migration = readFileSync("supabase/migrations/20260809000100_restore_member_health_record_rls.sql", "utf8");
  assert.match(route, /proposalMessages/);
  assert.match(route, /eq\("owner_id", user\.id\)/);
  assert.match(route, /safeDigitalStaffFailure\("proposal-decision"/);
  assert.doesNotMatch(route, /Authorization/);
  assert.match(migration, /with check \(auth\.uid\(\) = owner_id\)/);
  assert.doesNotMatch(migration, /profiles\.role = 'admin'/);
});

test("AP-107 diagnostics classify sanitized approval failures server-side", () => {
  const security = readFileSync("src/lib/digitalStaffRuntime/security.ts", "utf8");
  assert.match(security, /classifyDigitalStaffFailure/);
  assert.match(security, /rls_failure/);
  assert.match(security, /database_constraint_failure/);
  assert.match(security, /detail: sanitizedErrorDetail/);
  assert.match(security, /requestId/);
});

test("BH-211 shared proposal review replaces technical success copy and removes decisions after save", () => {
  const review = readFileSync("src/app/components/agents/RuntimeProposalReview.tsx", "utf8");
  assert.match(review, /Saved/);
  assert.doesNotMatch(review, /Saved to the canonical workspace/);
  assert.match(review, /decided\[proposal\.id\]/);
  assert.match(review, /setDecided/);
  assert.match(review, /role=\"status\"/);
});
