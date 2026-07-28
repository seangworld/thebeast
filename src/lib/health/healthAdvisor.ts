import type {
  ExecutionOutcomeRecord,
  ExecutionRecommendationRecord,
  ProfessionalExecutionHistory,
} from "../platform/agents/executionHistory";
import {
  SharedProbabilityConfidenceEngine,
  type ConfidenceAssessment,
  type ConfidenceEvidence,
} from "../platform/agents/probabilityConfidence";
import {
  buildHealthOverview,
  buildHealthTimeline,
  healthAdvisorProfessionalId,
  healthRecordKinds,
  type HealthRecord,
  type HealthRecordKind,
} from "./foundation";

export type HealthDocumentContext = {
  id: string;
  title: string;
  sourceLabel: string;
  updatedAt: string;
  permission: "Not Requested" | "Allowed" | "Blocked";
  summary?: string;
};

export type HealthAdvisorRecommendation = {
  sourceRecommendationId: string;
  title: string;
  recommendation: string;
  href: string;
  confidence: {
    label: ConfidenceAssessment["confidence"];
    score: number;
    basis: string;
  };
  limitations: readonly string[];
  supportingEvidence: readonly Record<string, unknown>[];
  lifecycle?: ExecutionRecommendationRecord;
};

export type HealthAdvisorOutcomeLearning = {
  id: string;
  recommendationTitle: string;
  status: ExecutionOutcomeRecord["outcomeStatus"];
  learning: readonly string[];
  recordedAt: string;
};

export type HealthAdvisorModel = {
  executiveBriefing: {
    title: string;
    summary: string;
    totalRecords: number;
    lastUpdatedAt: string | null;
    populatedAreas: number;
    documentCount: number;
  };
  medicationReview: readonly {
    id: string;
    title: string;
    status: string;
    date: string | null;
    source: string | null;
    context: string | null;
  }[];
  appointmentPreparation: {
    nextAppointment: HealthRecord | null;
    questions: readonly string[];
    recordsToReview: readonly HealthRecord[];
    documentsToReview: readonly HealthDocumentContext[];
  };
  documentUnderstanding: readonly HealthDocumentContext[];
  timelineSummary: {
    totalEvents: number;
    recentEvents: ReturnType<typeof buildHealthTimeline>;
    byType: readonly { kind: HealthRecordKind; count: number }[];
  };
  recommendations: readonly HealthAdvisorRecommendation[];
  outcomeLearning: readonly HealthAdvisorOutcomeLearning[];
  safety: readonly string[];
};

const confidenceEngine = new SharedProbabilityConfidenceEngine();

function dateValue(record: HealthRecord) {
  return record.occurredOn || record.updatedAt;
}

function recordEvidence(
  record: HealthRecord,
  asOf: string
): ConfidenceEvidence {
  const now = Date.parse(`${asOf}T12:00:00Z`);
  const timestamp = Date.parse(dateValue(record));
  const ageDays = Number.isFinite(timestamp)
    ? Math.max(0, (now - timestamp) / 86_400_000)
    : Number.POSITIVE_INFINITY;
  const freshness = ageDays <= 90 ? 0.9 : ageDays <= 365 ? 0.65 : 0.35;
  const completeness = [record.title, record.source, record.occurredOn].filter(
    Boolean
  ).length / 3;
  return {
    id: `health-record:${record.id}`,
    source: record.source || "Owner-entered BeastHealth record",
    relationship: "supports",
    claimType: "direct",
    authority: record.source ? 0.65 : 0.4,
    reliability: 0.55,
    freshness,
    completeness,
    directness: 0.8,
    independent: false,
    limitation:
      "The record is owner-maintained and has not been independently verified by BeastHealth.",
  };
}

function documentEvidence(document: HealthDocumentContext): ConfidenceEvidence {
  return {
    id: `health-document:${document.id}`,
    source: document.sourceLabel,
    relationship: "supports",
    claimType: "direct",
    authority: 0.6,
    reliability: 0.55,
    freshness: 0.7,
    completeness: document.summary ? 0.75 : 0.4,
    directness: document.summary ? 0.7 : 0.45,
    independent: false,
    limitation:
      "Document metadata and saved summaries can be incomplete and must be verified against the original document and clinician guidance.",
  };
}

function recommendationConfidence(
  evidence: readonly ConfidenceEvidence[],
  missingInformation: readonly string[] = []
) {
  const assessment = confidenceEngine.assess({
    claim:
      "Saved owner-authorized records support this organizational health recommendation.",
    evidence,
    requiredEvidenceCount: 1,
    missingInformation,
  });
  return {
    label: assessment.confidence,
    score: Math.round(assessment.confidenceScore * 100),
    basis: [
      ...assessment.reasons,
      ...assessment.uncertaintyReasons,
    ].join(" "),
  };
}

function historySourceId(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const record = value as { sourceRecommendationId?: unknown };
  return typeof record.sourceRecommendationId === "string"
    ? record.sourceRecommendationId
    : "";
}

function attachLifecycle(
  recommendation: Omit<HealthAdvisorRecommendation, "lifecycle">,
  history?: ProfessionalExecutionHistory
): HealthAdvisorRecommendation {
  return {
    ...recommendation,
    lifecycle: history?.recommendations.find((item) =>
      item.supportingEvidence.some(
        (evidence) =>
          historySourceId(evidence) === recommendation.sourceRecommendationId
      )
    ),
  };
}

function buildQuestions(input: {
  medications: readonly HealthRecord[];
  conditions: readonly HealthRecord[];
  vitals: readonly HealthRecord[];
  appointment: HealthRecord | null;
  documents: readonly HealthDocumentContext[];
}) {
  const questions: string[] = [];
  if (input.appointment) {
    questions.push(
      `What should I understand or prepare for "${input.appointment.title}"?`
    );
  }
  if (input.medications.length) {
    questions.push(
      "Is my saved medication, dose, and schedule list accurate, and what should I verify after this visit?"
    );
  }
  if (input.conditions.length) {
    questions.push(
      "Which updates to my saved condition list should I record after this visit?"
    );
  }
  if (input.vitals.length) {
    questions.push(
      "How should I correctly measure and record the vitals relevant to my care?"
    );
  }
  if (input.documents.length) {
    questions.push(
      "What parts of these medical documents should I verify, and what belongs in my care record?"
    );
  }
  if (!questions.length) {
    questions.push(
      "What information would be most useful for me to track before my next visit?"
    );
  }
  return questions;
}

function buildRecommendations(input: {
  records: readonly HealthRecord[];
  documents: readonly HealthDocumentContext[];
  history?: ProfessionalExecutionHistory;
  asOf: string;
}) {
  const visible = input.records.filter((record) => record.status !== "archived");
  const medications = visible.filter(
    (record) => record.recordType === "medication"
  );
  const appointments = visible
    .filter(
      (record) =>
        record.recordType === "appointment" &&
        record.status !== "resolved" &&
        (!record.occurredOn || record.occurredOn >= input.asOf)
    )
    .sort((left, right) => dateValue(left).localeCompare(dateValue(right)));
  const vitals = visible.filter((record) => record.recordType === "vital");
  const recommendations: Omit<HealthAdvisorRecommendation, "lifecycle">[] = [];

  if (!visible.some((record) => record.recordType === "profile")) {
    recommendations.push({
      sourceRecommendationId: "health-profile-review",
      title: "Build a current health profile",
      recommendation:
        "Add only the health background and care preferences you want available for future appointment preparation.",
      href: "/dashboard/health/profile",
      confidence: recommendationConfidence([], [
        "No saved Health Profile record is available.",
      ]),
      limitations: [
        "This is a record-completeness suggestion, not a medical recommendation.",
        "Do not add information you do not want stored in BeastHealth.",
      ],
      supportingEvidence: [{ source: "beasthealth", profileRecordCount: 0 }],
    });
  }

  if (
    medications.length &&
    medications.some((record) => !record.source || !record.occurredOn)
  ) {
    recommendations.push({
      sourceRecommendationId: "medication-list-verification",
      title: "Verify the saved medication list",
      recommendation:
        "Review names, doses, schedules, dates, and prescribers with a qualified clinician or pharmacist. Update the record only after you confirm it.",
      href: "/dashboard/health/medications",
      confidence: recommendationConfidence(
        medications.map((record) => recordEvidence(record, input.asOf)),
        ["One or more medication records are missing a date or source."]
      ),
      limitations: [
        "Do not start, stop, or change medication based on BeastHealth.",
        "BeastHealth does not check interactions, dosing, or clinical appropriateness.",
      ],
      supportingEvidence: medications.map((record) => ({
        source: "beast_health_records",
        healthRecordId: record.id,
        sourceRecommendationId: "medication-list-verification",
      })),
    });
  }

  if (appointments[0]) {
    const appointment = appointments[0];
    recommendations.push({
      sourceRecommendationId: `appointment-preparation:${appointment.id}`,
      title: `Prepare for ${appointment.title}`,
      recommendation:
        "Review the saved appointment context, medication list, condition list, questions, and permissioned medical documents before the visit.",
      href: "/dashboard/health/appointments",
      confidence: recommendationConfidence([
        recordEvidence(appointment, input.asOf),
      ]),
      limitations: [
        "Appointment preparation is organizational support and does not determine clinical priorities.",
        "Confirm the appointment time, location, and instructions with the provider.",
      ],
      supportingEvidence: [{
        source: "beast_health_records",
        healthRecordId: appointment.id,
        sourceRecommendationId: `appointment-preparation:${appointment.id}`,
      }],
    });
  }

  const reviewableDocuments = input.documents.filter(
    (document) => document.permission === "Allowed" && document.summary
  );
  if (reviewableDocuments.length) {
    recommendations.push({
      sourceRecommendationId: "medical-document-review",
      title: "Review permissioned medical document summaries",
      recommendation:
        "Compare saved summaries with the original documents and bring unresolved questions to a qualified clinician.",
      href: "/dashboard/health/documents",
      confidence: recommendationConfidence(
        reviewableDocuments.map(documentEvidence)
      ),
      limitations: [
        "A saved summary can omit or misstate important clinical detail.",
        "The original document and clinician interpretation remain authoritative.",
      ],
      supportingEvidence: reviewableDocuments.map((document) => ({
        source: "beast_documents",
        documentId: document.id,
        sourceRecommendationId: "medical-document-review",
      })),
    });
  }

  if (vitals.some((record) => !record.source || !record.occurredOn)) {
    recommendations.push({
      sourceRecommendationId: "vital-context-review",
      title: "Complete vital measurement context",
      recommendation:
        "Confirm the date, unit, device or office source, and measurement context for saved vitals before discussing them with a clinician.",
      href: "/dashboard/health/vitals",
      confidence: recommendationConfidence(
        vitals.map((record) => recordEvidence(record, input.asOf)),
        ["One or more vital records are missing a date or source."]
      ),
      limitations: [
        "BeastHealth does not determine whether a measurement is normal or concerning.",
        "Clinical interpretation belongs to a qualified clinician.",
      ],
      supportingEvidence: vitals.map((record) => ({
        source: "beast_health_records",
        healthRecordId: record.id,
        sourceRecommendationId: "vital-context-review",
      })),
    });
  }

  return recommendations.slice(0, 5).map((recommendation) =>
    attachLifecycle(recommendation, input.history)
  );
}

export function buildHealthAdvisorModel(input: {
  records: readonly HealthRecord[];
  documents?: readonly HealthDocumentContext[];
  history?: ProfessionalExecutionHistory;
  asOf?: string;
}): HealthAdvisorModel {
  const asOf = input.asOf || new Date().toISOString().slice(0, 10);
  const records = input.records.filter((record) => record.status !== "archived");
  const documents = [...(input.documents || [])];
  const overview = buildHealthOverview(records);
  const medications = records.filter(
    (record) => record.recordType === "medication"
  );
  const conditions = records.filter(
    (record) => record.recordType === "condition"
  );
  const vitals = records.filter((record) => record.recordType === "vital");
  const appointments = records
    .filter(
      (record) =>
        record.recordType === "appointment" &&
        record.status !== "resolved" &&
        (!record.occurredOn || record.occurredOn >= asOf)
    )
    .sort((left, right) => dateValue(left).localeCompare(dateValue(right)));
  const nextAppointment = appointments[0] || null;
  const timeline = buildHealthTimeline(records);
  const recordsToReview = records
    .filter((record) =>
      ["profile", "condition", "medication", "vital"].includes(
        record.recordType
      )
    )
    .slice(0, 8);
  const outcomeLearning = (input.history?.outcomes || []).slice(0, 5).map(
    (outcome): HealthAdvisorOutcomeLearning => ({
      id: outcome.id,
      recommendationTitle:
        input.history?.recommendations.find(
          (recommendation) =>
            recommendation.requestId === outcome.requestId
        )?.title || "Health Advisor recommendation",
      status: outcome.outcomeStatus,
      learning: outcome.memberLearning,
      recordedAt: outcome.recordedAt,
    })
  );

  return {
    executiveBriefing: {
      title: records.length
        ? "Your saved health context is ready for review"
        : "Start with the health context you choose to maintain",
      summary: records.length
        ? `${overview.totalRecords} active record${
            overview.totalRecords === 1 ? "" : "s"
          } across ${overview.populatedSections.length} health area${
            overview.populatedSections.length === 1 ? "" : "s"
          }. This briefing describes record coverage only.`
        : "No health records exist yet. Health Advisor will not infer a medical history.",
      totalRecords: overview.totalRecords,
      lastUpdatedAt: overview.lastUpdatedAt,
      populatedAreas: overview.populatedSections.length,
      documentCount: documents.length,
    },
    medicationReview: medications.map((record) => ({
      id: record.id,
      title: record.title,
      status: record.status,
      date: record.occurredOn,
      source: record.source,
      context:
        typeof record.details.context === "string"
          ? record.details.context
          : null,
    })),
    appointmentPreparation: {
      nextAppointment,
      questions: buildQuestions({
        medications,
        conditions,
        vitals,
        appointment: nextAppointment,
        documents,
      }),
      recordsToReview,
      documentsToReview: documents.slice(0, 6),
    },
    documentUnderstanding: documents,
    timelineSummary: {
      totalEvents: timeline.length,
      recentEvents: timeline.slice(0, 8),
      byType: healthRecordKinds
        .map((kind) => ({ kind, count: overview.counts[kind] }))
        .filter((item) => item.count > 0),
    },
    recommendations: buildRecommendations({
      records,
      documents,
      history: input.history,
      asOf,
    }),
    outcomeLearning,
    safety: [
      "Health Advisor organizes owner-authorized records and appointment questions; it never diagnoses.",
      "Health Advisor does not prescribe, change medication, interpret vitals, or replace a qualified clinician.",
      "Urgent or emergency concerns require appropriate local emergency or qualified clinical care, not BeastHealth.",
      "Confidence describes record support for an organizational suggestion, not certainty about health or treatment.",
    ],
  };
}

export { healthAdvisorProfessionalId };
