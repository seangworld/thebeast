import assert from "node:assert/strict";
import test from "node:test";
import {
  assertHistoricalMessagesOwnerScoped,
  createHistoricalReconciliationState,
  reconcileHistoricalProposals,
  removeAnsweredNeeds,
  transitionHistoricalReconciliationState,
  type CanonicalKnowledgeRecord,
  type HistoricalConversationMessage,
  type ProfessionalId,
  type StructuredKnowledgeProposal,
} from "../src/lib/digitalStaffRuntime";

const education = "beasteducation.guidance-counselor" as const;
const health = "beasthealth.health-advisor" as const;
const money = "beastmoney.money-coach" as const;
const now = "2026-08-08T18:00:00.000Z";

function message(text: string, professionalId: ProfessionalId = education, id = "historical-message-1"): HistoricalConversationMessage {
  return { id, role: "user", text, createdAt: "2025-01-02T12:00:00.000Z", ownerId: "owner-1", conversationId: "conversation-1", professionalId };
}

function proposal(domain: StructuredKnowledgeProposal["domain"], entityType: string, fields: Record<string, string | number | boolean | null>, index = 1): StructuredKnowledgeProposal {
  return { id: `model-${index}`, domain, entityType, fields, sourceMessageId: "historical-message-1", confidence: 0.92, missingFields: [], contradictions: [], approvalStatus: "proposed", relatedRecordId: null, proposedAction: "create" };
}

function reconcile(input: { professionalId?: ProfessionalId; text?: string; proposals: StructuredKnowledgeProposal[]; canonicalRecords?: CanonicalKnowledgeRecord[]; id?: string }) {
  const professionalId = input.professionalId || education;
  return reconcileHistoricalProposals({ professionalId, message: message(input.text || "Historical member evidence", professionalId, input.id), proposals: input.proposals, canonicalRecords: input.canonicalRecords || [], reconciledAt: now });
}

test("AP-104 structures a historical high-school sentence without inventing a credential", () => {
  const result = reconcile({ text: "I graduated high school in 1990 from Savannah High School in Savannah Missouri.", proposals: [proposal("education", "school", { institution: "Savannah High School", institutionType: "High School", location: "Savannah, Missouri", graduationYear: 1990, status: "Completed" })] });
  assert.deepEqual(result.proposals[0]?.fields, { graduationYear: 1990, institution: "Savannah High School", institutionType: "High School", location: "Savannah, Missouri", status: "Completed" });
  assert.equal("credential" in (result.proposals[0]?.fields || {}), false);
  assert.equal(result.proposals[0]?.reconciliation.currentStatus, "historical");
});

test("AP-104 keeps education military and employment as separate proposals", () => {
  const result = reconcile({ proposals: [proposal("education", "school", { institution: "Savannah High School" }, 1), proposal("military", "military_service", { branch: "Army" }, 2), proposal("employment", "employment", { employer: "DLA" }, 3)] });
  assert.deepEqual(result.proposals.map((item) => item.domain), ["education", "military", "employment"]);
});

test("AP-104 represents certification-first intent as a preference", () => {
  const result = reconcile({ text: "I don't want to go to college; I prefer certifications.", proposals: [proposal("preference", "education_preference", { rejectedPath: "college", preferredPath: "certifications" })] });
  assert.equal(result.proposals[0]?.domain, "preference");
  assert.equal(result.proposals[0]?.entityType, "education_preference");
});

test("AP-104 creates five separate medication and supplement proposals", () => {
  const result = reconcile({ professionalId: health, proposals: ["metoprolol", "midodrine", "tirzepatide", "vitamin D", "fish oil"].map((name, index) => proposal("health", index < 3 ? "medication" : "supplement", { name }, index)) });
  assert.equal(result.proposals.length, 5);
  assert.equal(new Set(result.proposals.map((item) => item.id)).size, 5);
});

test("AP-104 suppresses an existing medication duplicate", () => {
  const result = reconcile({ professionalId: health, proposals: [proposal("health", "medication", { name: "Metoprolol", dose: "50 mg" })], canonicalRecords: [{ id: "med-1", domain: "health", entityType: "medication", fields: { name: "metoprolol", dose: "50 mg" } }] });
  assert.equal(result.proposals.length, 0);
  assert.equal(result.duplicatesIgnored, 1);
});

test("AP-104 surfaces medication conflicts without overwriting", () => {
  const result = reconcile({ professionalId: health, proposals: [proposal("health", "medication", { name: "Metoprolol", dose: "25 mg" })], canonicalRecords: [{ id: "med-1", domain: "health", entityType: "medication", fields: { name: "Metoprolol", dose: "50 mg" } }] });
  assert.equal(result.proposals[0]?.reconciliation.disposition, "conflict");
  assert.equal(result.proposals[0]?.relatedRecordId, "med-1");
  assert.match(result.proposals[0]?.contradictions[0] || "", /25 mg.*50 mg/);
});

test("AP-104 keeps financial priorities as knowledge and not account duplicates", () => {
  const result = reconcile({ professionalId: money, text: "Pay down the highest-interest debt first.", proposals: [proposal("preference", "debt_strategy_preference", { priority: "Highest-interest debt first" })] });
  assert.equal(result.proposals[0]?.domain, "preference");
  assert.doesNotMatch(result.proposals[0]?.entityType || "", /account|transaction|balance/);
});

test("AP-104 removes What I Still Need questions already answered historically", () => {
  const remaining = removeAnsweredNeeds([{ id: "school", question: "What school did you attend?" }, { id: "budget", question: "What is your education budget?" }], ["school", "institution"]);
  assert.deepEqual(remaining.map((item) => item.id), ["budget"]);
});

test("AP-104 deterministic IDs make reruns idempotent", () => {
  const input = { proposals: [proposal("education", "school", { institution: "Savannah High School" })] };
  assert.equal(reconcile(input).proposals[0]?.id, reconcile(input).proposals[0]?.id);
});

test("AP-104 reconciliation can pause and resume", () => {
  const started = createHistoricalReconciliationState(education, now);
  const paused = transitionHistoricalReconciliationState(started, "pause", "2026-08-08T18:01:00.000Z");
  const resumed = transitionHistoricalReconciliationState(paused, "resume", "2026-08-08T18:02:00.000Z");
  assert.equal(paused.status, "paused");
  assert.equal(resumed.status, "running");
  assert.equal(transitionHistoricalReconciliationState(transitionHistoricalReconciliationState(started, "skip", now), "resume", now).status, "running");
});

test("AP-104 rejects cross-owner and cross-professional historical evidence", () => {
  assert.throws(() => assertHistoricalMessagesOwnerScoped([{ ...message("evidence"), ownerId: "owner-2" }], "owner-1", education), /cross-owner/);
  assert.throws(() => assertHistoricalMessagesOwnerScoped([message("evidence", health)], "owner-1", education), /cross-owner/);
});

test("AP-104 reconciliation enriches proposals but leaves original messages unchanged", () => {
  const original = message("Original immutable conversation sentence.");
  const snapshot = structuredClone(original);
  reconcileHistoricalProposals({ professionalId: education, message: original, proposals: [proposal("education", "preference", { preference: "Certifications" })], canonicalRecords: [], reconciledAt: now });
  assert.deepEqual(original, snapshot);
});
