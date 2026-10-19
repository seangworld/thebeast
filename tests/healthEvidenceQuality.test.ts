import assert from "node:assert/strict";
import test from "node:test";
import { buildHealthEvidenceQualityReview } from "../src/lib/health/evidenceQuality";
import { buildRuntimeInput } from "../src/lib/digitalStaffRuntime/prompt";
import { requireProfessionalConfig } from "../src/lib/digitalStaffRuntime/config";
import type { RuntimeContext } from "../src/lib/digitalStaffRuntime/types";

const structuredRecords: RuntimeContext["structuredRecords"] = [
  {
    domain: "health:medication",
    record: {
      id: "med-old",
      record_type: "medication",
      title: "Medication A",
      status: "active",
      occurred_on: null,
      updated_at: "2025-01-01T12:00:00.000Z",
      source: "Pharmacy list",
      details: { dose: "10 mg", frequency: "once daily" },
    },
  },
  {
    domain: "health:medication",
    record: {
      id: "med-current",
      record_type: "medication",
      title: "Medication A",
      status: "active",
      occurred_on: "2026-08-01",
      updated_at: "2026-08-01T12:00:00.000Z",
      source: "Member-entered list",
      details: { dose: "20 mg", frequency: "once daily" },
    },
  },
  {
    domain: "health:vital",
    record: {
      id: "vital-a",
      record_type: "vital",
      title: "Home blood pressure",
      status: "active",
      occurred_on: "2026-08-15",
      updated_at: "2026-08-15T12:00:00.000Z",
      source: "Home cuff",
      details: { value: "128/80", unit: "mmHg" },
    },
  },
  {
    domain: "health:vital",
    record: {
      id: "vital-b",
      record_type: "vital",
      title: "Home blood pressure",
      status: "active",
      occurred_on: "2026-08-15",
      updated_at: "2026-08-15T12:01:00.000Z",
      source: "Home cuff",
      details: { value: "138/88", unit: "mmHg" },
    },
  },
  {
    domain: "health:vital",
    record: {
      id: "vital-undated",
      record_type: "vital",
      title: "Home blood pressure",
      status: "active",
      occurred_on: null,
      updated_at: "2026-08-15T12:02:00.000Z",
      source: "Home cuff",
      details: { value: "110/70", unit: "mmHg" },
    },
  },
  {
    domain: "health:claim",
    record: {
      id: "claim-1",
      title: "Left knee",
      status: "active",
      contextType: "member_reported_veteran_claim",
      details: { claimed_condition: "unverified" },
    },
  },
];

test("Health evidence triage flags metadata gaps and possible same-record discrepancies without resolving them", () => {
  const review = buildHealthEvidenceQualityReview(structuredRecords, "2026-10-18T12:00:00.000Z");
  assert.equal(review.recordCount, 5);
  assert.equal(review.asOf, "2026-10-18");
  assert.ok(review.recordsWithQualityNotes.some((item) => item.recordId === "med-old" && item.missingEventDate && item.daysSinceRecordUpdate === 655));
  assert.deepEqual(
    review.potentialDiscrepancies.map((item) => ({ ids: item.recordIds, kind: item.kind, fields: item.fields })),
    [
      { ids: ["med-old", "med-current"], kind: "medication", fields: ["dose"] },
      { ids: ["vital-a", "vital-b"], kind: "vital", fields: ["value"] },
    ],
  );
  assert.equal(JSON.stringify(review).includes("10 mg"), false);
  assert.equal(JSON.stringify(review).includes("138/88"), false);
  assert.equal(JSON.stringify(review).includes("claim-1"), false);
  assert.ok(review.potentialDiscrepancies.every((item) => item.interpretation.startsWith("Unresolved difference")));
});

test("Health runtime receives compact evidence-quality notes while other specialists do not", () => {
  const context: RuntimeContext = {
    ownerId: "synthetic-owner",
    professionalId: "beasthealth.health-advisor",
    conversationId: "synthetic-thread",
    message: { id: "message-1", role: "user", text: "Review my current medications.", createdAt: "2026-10-18T12:00:00.000Z" },
    recentMessages: [],
    state: { currentTopic: null, currentWorkspace: null, lastProfessionalQuestion: null, unresolvedQuestions: [], corrections: [], pendingApprovals: [], currentGoal: null, previousDecisions: [] },
    memories: [],
    structuredRecords,
    workspace: "/dashboard/health/ai-advisor",
  };
  const healthInput = JSON.parse(buildRuntimeInput(requireProfessionalConfig(context.professionalId), context));
  assert.equal(healthInput.healthEvidenceQuality.recordCount, 5);
  assert.match(healthInput.healthEvidenceQualityBoundary, /not clinical reconciliation/i);
  assert.equal(JSON.stringify(healthInput.healthEvidenceQuality).includes("10 mg"), false);

  const moneyInput = JSON.parse(buildRuntimeInput(requireProfessionalConfig("beastmoney.money-coach"), { ...context, professionalId: "beastmoney.money-coach" }));
  assert.equal("healthEvidenceQuality" in moneyInput, false);
  assert.equal("healthEvidenceQualityBoundary" in moneyInput, false);
});
