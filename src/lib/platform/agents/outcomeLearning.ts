import type { ConfidenceAssessment } from "./probabilityConfidence";

export type RecommendationOutcomeStatus = "successful" | "neutral" | "unsuccessful" | "inconclusive";
export type RecommendationActionStatus = "accepted" | "rejected" | "partially-completed" | "completed" | "not-confirmed";

export type RecommendationExpectation = {
  statement: string;
  targetDate?: string;
  metric?: { name: string; expectedValue: number; unit: string; tolerance?: number };
  assumptions: readonly string[];
};

export type RecommendationActualResult = {
  statement: string;
  observedAt: string;
  metric?: { name: string; actualValue: number; unit: string };
};

export type OutcomeEvidence = {
  id: string;
  source: string;
  sourceRecordId?: string;
  capturedAt: string;
  statement: string;
  ownerId: string;
};

export type RecommendationOutcome = {
  id: string;
  ownerId: string;
  specialistId: string;
  recommendationId: string;
  recommendation: string;
  recommendedAt: string;
  actionStatus: RecommendationActionStatus;
  expectation: RecommendationExpectation;
  actual?: RecommendationActualResult;
  outcome: RecommendationOutcomeStatus;
  comparison: string;
  variance?: number;
  evidence: readonly OutcomeEvidence[];
  confidence: ConfidenceAssessment;
  memberLearning: readonly string[];
  limitations: readonly string[];
  recordedAt: string;
  revision: number;
};

export type RecordRecommendationOutcomeInput = Omit<RecommendationOutcome, "outcome" | "comparison" | "variance" | "recordedAt" | "revision"> & {
  outcome?: RecommendationOutcomeStatus;
};

export type OutcomeLearningContext = {
  ownerId: string;
  specialistId: string;
  purpose: "member-specific-reasoning";
  outcomes: readonly Pick<RecommendationOutcome, "id" | "recommendationId" | "recommendation" | "actionStatus" | "outcome" | "comparison" | "memberLearning" | "confidence" | "recordedAt">[];
  principles: readonly string[];
};

export interface RecommendationOutcomeStore {
  save(record: RecommendationOutcome): RecommendationOutcome;
  get(ownerId: string, specialistId: string, id: string): RecommendationOutcome | undefined;
  list(ownerId: string, specialistId: string): readonly RecommendationOutcome[];
}

export class InMemoryRecommendationOutcomeStore implements RecommendationOutcomeStore {
  private readonly records = new Map<string, RecommendationOutcome>();
  private key(ownerId: string, specialistId: string, id: string) { return `${ownerId}:${specialistId}:${id}`; }
  save(record: RecommendationOutcome) {
    this.records.set(this.key(record.ownerId, record.specialistId, record.id), record);
    return record;
  }
  get(ownerId: string, specialistId: string, id: string) { return this.records.get(this.key(ownerId, specialistId, id)); }
  list(ownerId: string, specialistId: string) {
    return Array.from(this.records.values()).filter((item) => item.ownerId === ownerId && item.specialistId === specialistId);
  }
}

function validate(input: RecordRecommendationOutcomeInput) {
  if (!input.id.trim() || !input.ownerId.trim() || !input.specialistId.trim() || !input.recommendationId.trim()) throw new Error("Recommendation outcomes require an id, owner, specialist, and recommendation.");
  if (!input.recommendation.trim() || !input.expectation.statement.trim()) throw new Error("Recommendation outcomes require recommendation and expectation statements.");
  if (!Number.isFinite(Date.parse(input.recommendedAt))) throw new Error("Recommendation outcomes require a valid recommendation timestamp.");
  if (input.actual && !Number.isFinite(Date.parse(input.actual.observedAt))) throw new Error("Actual outcomes require a valid observation timestamp.");
  if (input.evidence.some((item) => item.ownerId !== input.ownerId)) throw new Error("Outcome evidence must belong to the recommendation owner.");
  const evidenceIds = new Set(input.evidence.map((item) => item.id));
  if (input.confidence.supportingEvidenceIds.some((id) => !evidenceIds.has(id)) || input.confidence.contradictoryEvidenceIds.some((id) => !evidenceIds.has(id))) {
    throw new Error("Outcome confidence references evidence not supplied with the outcome.");
  }
  if (input.actual?.metric && input.expectation.metric && (input.actual.metric.name !== input.expectation.metric.name || input.actual.metric.unit !== input.expectation.metric.unit)) {
    throw new Error("Expected and actual metrics must use the same name and unit.");
  }
}

function classify(input: RecordRecommendationOutcomeInput, variance?: number): RecommendationOutcomeStatus {
  if (input.outcome) return input.outcome;
  if (!input.actual || input.actionStatus === "not-confirmed") return "inconclusive";
  if (!input.expectation.metric || !input.actual.metric || variance === undefined) return input.actionStatus === "completed" ? "neutral" : input.actionStatus === "rejected" ? "unsuccessful" : "neutral";
  const tolerance = Math.abs(input.expectation.metric.tolerance || 0);
  if (Math.abs(variance) <= tolerance) return "successful";
  return "unsuccessful";
}

export class SharedOutcomeLearning {
  constructor(
    private readonly store: RecommendationOutcomeStore = new InMemoryRecommendationOutcomeStore(),
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  record(input: RecordRecommendationOutcomeInput) {
    validate(input);
    const existing = this.store.get(input.ownerId, input.specialistId, input.id);
    const variance = input.expectation.metric && input.actual?.metric
      ? input.actual.metric.actualValue - input.expectation.metric.expectedValue
      : undefined;
    const outcome = classify(input, variance);
    const comparison = input.actual
      ? input.expectation.metric && input.actual.metric
        ? `Expected ${input.expectation.metric.expectedValue} ${input.expectation.metric.unit}; actual ${input.actual.metric.actualValue} ${input.actual.metric.unit}; variance ${variance}.`
        : `Expected: ${input.expectation.statement} Actual: ${input.actual.statement}`
      : "No actual result has been confirmed yet.";
    const record = Object.freeze({
      ...input,
      outcome,
      comparison,
      variance,
      recordedAt: this.now(),
      revision: (existing?.revision || 0) + 1,
    });
    return this.store.save(record);
  }

  get(ownerId: string, specialistId: string, id: string) {
    return this.store.get(ownerId, specialistId, id);
  }

  list(ownerId: string, specialistId: string) {
    return [...this.store.list(ownerId, specialistId)].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  }

  context(input: { ownerId: string; specialistId: string; limit?: number }): OutcomeLearningContext {
    const outcomes = this.list(input.ownerId, input.specialistId).slice(0, Math.max(1, input.limit || 10));
    return {
      ownerId: input.ownerId,
      specialistId: input.specialistId,
      purpose: "member-specific-reasoning",
      outcomes: outcomes.map((item) => ({
        id: item.id,
        recommendationId: item.recommendationId,
        recommendation: item.recommendation,
        actionStatus: item.actionStatus,
        outcome: item.outcome,
        comparison: item.comparison,
        memberLearning: item.memberLearning,
        confidence: item.confidence,
        recordedAt: item.recordedAt,
      })),
      principles: [
        "Use outcomes only for this owner and specialist unless an explicitly shared owner-scoped contract permits otherwise.",
        "Treat current authenticated records as authoritative over prior expected outcomes.",
        "Do not generalize one member's outcome into global policy.",
        "Preserve uncertainty and distinguish action completion from causal effectiveness.",
      ],
    };
  }
}
