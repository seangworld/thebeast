import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createHistoricalReconciliationState, safeHistoricalReconciliationTelemetry } from "../src/lib/digitalStaffRuntime";

const route = readFileSync("src/app/api/digital-staff/reconciliation/route.ts", "utf8");
const workspace = readFileSync("src/app/dashboard/digital-staff/reconciliation/HistoricalKnowledgeReconciliation.tsx", "utf8");
const docs = readFileSync("docs/AP-104-HISTORICAL-DIGITAL-STAFF-KNOWLEDGE-RECONCILIATION.md", "utf8");

test("AP-104 route reuses the AP-100 runtime and existing owner-scoped storage", () => {
  assert.match(route, /runDigitalStaffRuntime/);
  assert.match(route, /agent_conversations/);
  assert.match(route, /agent_conversation_messages/);
  assert.match(route, /applyApprovedKnowledgeProposal/);
  assert.match(route, /\.eq\("owner_id", user\.id\)/);
  assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE_ROLE/);
});

test("AP-104 member review exposes every required non-blocking control", () => {
  for (const label of ["Review information from earlier conversations", "Pause", "Resume", "Review", "Accept", "edited", "Reject", "Merge", "Skip for now"]) assert.match(workspace, new RegExp(label, "i"));
  assert.match(workspace, /continue using every Digital Professional normally/);
});

test("AP-104 operational telemetry excludes raw conversation text and identifiers", () => {
  const telemetry = safeHistoricalReconciliationTelemetry(createHistoricalReconciliationState("beastmoney.money-coach", "2026-08-08T18:00:00.000Z"));
  assert.equal("message" in telemetry, false);
  assert.equal("conversationId" in telemetry, false);
  assert.equal("ownerId" in telemetry, false);
});

test("AP-104 documents no migration and immutable historical evidence", () => {
  assert.match(docs, /No AP-104 migration is required/);
  assert.match(docs, /never updates or deletes a historical conversation message/);
  assert.match(docs, /owner-scoped RLS/);
});
