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
