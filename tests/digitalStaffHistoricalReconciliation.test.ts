import assert from "node:assert/strict";
import test from "node:test";
import {
  assertHistoricalMessagesOwnerScoped,
  createHistoricalReconciliationState,
  decomposeHistoricalProposals,
  historicalEducationProfileEvidence,
  historicalHealthAggregateEvidence,
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

test("OT-001 replays preserved Health aggregate context and never the generic title", () => {
  const evidence = historicalHealthAggregateEvidence([{ id: "record-1", owner_id: "owner-1", title: "Current medications", details: { topic: "health-medications-needed", context: "I take Medicine A, Medicine B, Supplement C and Supplement D.", conversation_id: "conversation-1" }, created_at: "2025-01-02T12:00:00.000Z" }]);
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0]?.text, "I take Medicine A, Medicine B, Supplement C and Supplement D.");
  assert.doesNotMatch(evidence[0]?.text || "", /^Current medications$/);
  assert.equal(evidence[0]?.conversationId, "conversation-1");
});

test("OT-001 ignores aggregate Health records that have no preserved member evidence", () => {
  assert.deepEqual(historicalHealthAggregateEvidence([{ id: "record-1", owner_id: "owner-1", title: "Conditions", details: { topic: "health-conditions-needed" } }]), []);
});

test("OT-001 replays mixed Education discovery answers as preserved evidence", () => {
  const evidence = historicalEducationProfileEvidence([{ owner_id: "owner-1", discovery_answers: { background: "I finished high school, served in the military, and now work full time.", preference: "I prefer a certification." }, updated_at: now }]);
  assert.deepEqual(evidence.map((item) => item.text), ["I finished high school, served in the military, and now work full time.", "I prefer a certification."]);
  assert.ok(evidence.every((item) => item.ownerId === "owner-1"));
});

test("OT-001 suppresses a fake allergy proposal from negative health evidence", () => {
  const result = reconcile({ professionalId: health, text: "I have no known allergies.", proposals: [proposal("health", "allergy", { name: "No known allergies" })] });
  assert.equal(result.proposals.length, 0);
});

test("OT-001 deduplicates repeated entities within one extracted message", () => {
  const result = reconcile({ professionalId: health, proposals: [proposal("health", "medication", { name: "Medicine A" }, 1), proposal("health", "medication", { name: "medicine a" }, 2)] });
  assert.equal(result.proposals.length, 1);
  assert.equal(result.duplicatesIgnored, 1);
});

test("BH-206 deterministically decomposes one aggregate medication proposal before review", () => {
  const historical = message("I take Medication A, Medication B, Supplement C, Medication D and Medication E.", health);
  const decomposed = decomposeHistoricalProposals(historical, [proposal("health", "medication", { name: "Medication A, Medication B, Supplement C, Medication D and Medication E" })]);
  assert.equal(decomposed.length, 5);
  assert.deepEqual(decomposed.map((item) => item.entityType), ["medication", "medication", "supplement", "medication", "medication"]);
  assert.deepEqual(decomposed.map((item) => item.fields.name), ["Medication A", "Medication B", "Supplement C", "Medication D", "Medication E"]);
});

test("BE-206 decomposes model-classified schools without copying ambiguous aggregate fields", () => {
  const historical = message("My schools include School A, School B and School C.", education);
  const decomposed = decomposeHistoricalProposals(historical, [proposal("education", "school", { institution: "School A, School B and School C", graduationYear: 2020 })]);
  assert.deepEqual(decomposed.map((item) => item.fields), [{ institution: "School A" }, { institution: "School B" }, { institution: "School C" }]);
});

test("BH-206 decomposes conditions procedures and providers one entity per proposal", () => {
  for (const [entityType, key, text] of [
    ["condition", "condition", "Condition A, Condition B and Condition C"],
    ["procedure", "procedureName", "Procedure A, Procedure B and Procedure C"],
    ["provider", "providerName", "Provider A, Provider B and Provider C"],
  ] as const) {
    const historical = message(text, health, `message-${entityType}`);
    const result = decomposeHistoricalProposals(historical, [proposal("health", entityType, { [key]: text })]);
    assert.equal(result.length, 3);
    assert.deepEqual(result.map((item) => item.fields[key]), [`${entityType === "condition" ? "Condition" : entityType === "procedure" ? "Procedure" : "Provider"} A`, `${entityType === "condition" ? "Condition" : entityType === "procedure" ? "Procedure" : "Provider"} B`, `${entityType === "condition" ? "Condition" : entityType === "procedure" ? "Procedure" : "Provider"} C`]);
  }
});

test("BH-206 keeps negative allergy family-history and supplement statements out of entity rows", () => {
  for (const [text, entityType] of [["I have no allergies", "allergy"], ["No family history that I know of", "family_history"], ["I don't take any supplements", "supplement"]]) {
    const result = reconcile({ professionalId: health, text, proposals: [proposal("health", entityType, { name: text })] });
    assert.equal(result.proposals.length, 0);
  }
});
