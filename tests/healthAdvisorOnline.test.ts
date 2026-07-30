import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildHealthAdvisorModel,
  healthAdvisorProfessionalId,
} from "../src/lib/health/healthAdvisor";
import type { HealthRecord } from "../src/lib/health/foundation";
import type { ProfessionalExecutionHistory } from "../src/lib/platform/agents";

const base = {
  ownerId: "owner-1",
  status: "active" as const,
  notes: null,
  createdAt: "2026-07-20T12:00:00.000Z",
  updatedAt: "2026-07-20T12:00:00.000Z",
};

const records: HealthRecord[] = [
  {
    ...base,
    id: "profile-1",
    recordType: "profile",
    title: "Care preferences",
    occurredOn: "2026-07-20",
    source: "Owner",
    details: { context: "Prefers written follow-up" },
  },
  {
    ...base,
    id: "medication-1",
    recordType: "medication",
    title: "Saved medication",
    occurredOn: null,
    source: null,
    details: { context: "Saved schedule" },
  },
  {
    ...base,
    id: "condition-1",
    recordType: "condition",
    title: "Saved condition",
    occurredOn: "2026-07-19",
    source: "Clinician record",
    details: {},
  },
  {
    ...base,
    id: "vital-1",
    recordType: "vital",
    title: "Saved measurement",
    occurredOn: null,
    source: null,
    details: { context: "Value and unit as entered" },
  },
  {
    ...base,
    id: "appointment-1",
    recordType: "appointment",
    title: "Primary care visit",
    occurredOn: "2026-08-03",
    source: "Provider office",
    details: { context: "Annual review" },
  },
];

test("Health Advisor builds only record-backed briefing and preparation context", () => {
  const model = buildHealthAdvisorModel({
    records,
    documents: [{
      id: "document-1",
      title: "Visit summary",
      sourceLabel: "Visit summary.pdf",
      updatedAt: "2026-07-21T12:00:00.000Z",
      permission: "Allowed",
      summary: "Owner-permissioned saved summary.",
    }],
    asOf: "2026-07-28",
  });
  assert.equal(model.executiveBriefing.totalRecords, 5);
  assert.equal(model.medicationReview.length, 1);
  assert.equal(model.appointmentPreparation.nextAppointment?.id, "appointment-1");
  assert.ok(model.appointmentPreparation.questions.length >= 4);
  assert.equal(model.documentUnderstanding[0]?.summary, "Owner-permissioned saved summary.");
  assert.equal(model.timelineSummary.totalEvents, 5);
});

test("Health Advisor recommendations are organizational and medically bounded", () => {
  const model = buildHealthAdvisorModel({ records, asOf: "2026-07-28" });
  assert.ok(model.recommendations.some((item) => item.sourceRecommendationId === "medication-list-verification"));
  assert.ok(model.recommendations.some((item) => item.sourceRecommendationId.startsWith("appointment-preparation:")));
  const content = model.recommendations.map((item) => `${item.recommendation} ${item.limitations.join(" ")}`).join(" ");
  assert.match(content, /Do not start, stop, or change medication/);
  assert.doesNotMatch(content, /diagnosed with|you should take|normal range|treatment plan/i);
  assert.ok(model.recommendations.every((item) => item.confidence.basis));
  assert.ok(model.safety.some((item) => /never diagnoses/.test(item)));
});

test("permission blocks document understanding and no summary is inferred", () => {
  const model = buildHealthAdvisorModel({
    records: [],
    documents: [{
      id: "blocked",
      title: "Private report",
      sourceLabel: "Private report.pdf",
      updatedAt: "2026-07-21T12:00:00.000Z",
      permission: "Blocked",
    }],
    asOf: "2026-07-28",
  });
  assert.equal(model.documentUnderstanding[0]?.summary, undefined);
  assert.equal(model.documentUnderstanding[0]?.permission, "Blocked");
});

test("recommendation lifecycle and learning use durable execution history", () => {
  const history: ProfessionalExecutionHistory = {
    requests: [],
    recommendations: [{
      id: "recommendation-1",
      ownerId: "owner-1",
      requestId: "request-1",
      professionalId: healthAdvisorProfessionalId,
      title: "Verify the saved medication list",
      recommendation: "Review it with a clinician.",
      status: "accepted",
      confidence: { label: "moderate" },
      limitations: [],
      supportingEvidence: [{
        sourceRecommendationId: "medication-list-verification",
      }],
      createdAt: "2026-07-28T12:00:00.000Z",
      updatedAt: "2026-07-28T12:00:00.000Z",
    }],
    outcomes: [{
      id: "outcome-1",
      requestId: "request-1",
      outcomeStatus: "successful",
      expectedResult: {},
      actualResult: { source: "owner_report" },
      memberLearning: ["Owner reported that preparation helped."],
      limitations: ["Not a medical outcome."],
      supportingEvidence: [],
      observedAt: "2026-07-28T12:00:00.000Z",
      recordedAt: "2026-07-28T12:00:00.000Z",
    }],
  };
  const model = buildHealthAdvisorModel({
    records,
    history,
    asOf: "2026-07-28",
  });
  assert.equal(
    model.recommendations.find(
      (item) => item.sourceRecommendationId === "medication-list-verification"
    )?.lifecycle?.status,
    "accepted"
  );
  assert.deepEqual(model.outcomeLearning[0]?.learning, [
    "Owner reported that preparation helped.",
  ]);
});

test("Health Advisor workspace exposes the required governed integrations", () => {
  const source = readFileSync(
    "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
    "utf8"
  );
  for (const heading of [
    "Executive Health Briefing",
    "Medication Review",
    "Appointment Preparation",
    "Questions for Providers",
    "Health Recommendations",
    "Document Understanding",
    "Timeline Summaries",
  ]) {
    assert.match(source, new RegExp(heading));
  }
  assert.match(source, /SupabaseExecutionHistoryStore/);
  assert.match(source, /createRecommendation/);
  assert.match(source, /recordDecision/);
  assert.match(source, /recordResultAndOutcome/);
  assert.match(source, /never diagnoses or replaces clinicians/);
  assert.match(source, /AgentConversationInput/);
  assert.match(source, /\/api\/health\/advisor/);
});
