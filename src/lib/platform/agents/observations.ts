import type { StructuredAgentAction } from "./tools";

export type ObservationType =
  | "Change"
  | "Trend"
  | "Anomaly"
  | "Missing information"
  | "Inconsistency"
  | "Risk"
  | "Opportunity"
  | "Improvement"
  | "Regression"
  | "Milestone"
  | "Correlation"
  | "Follow-up item";

export type ObservationStatus =
  | "New"
  | "Active"
  | "Acknowledged"
  | "Dismissed"
  | "Resolved"
  | "Expired"
  | "Superseded";

export type ObservationSeverity = "informational" | "positive" | "caution" | "important" | "critical";
export type ObservationPriority = "low" | "medium" | "high" | "critical";
export type ObservationEvidenceKind = "fact" | "inference" | "correlation";

export type ObservationTimeContext = {
  observedAt: string;
  periodLabel: string;
  periodStartsAt?: string;
  periodEndsAt?: string;
  baselineAt?: string;
  comparedWith?: string;
  expiresAt?: string;
};

export type ObservationEvidenceItem = {
  id: string;
  kind: ObservationEvidenceKind;
  label: string;
  value: string | number | boolean | null;
  source: string;
  recordId?: string;
  observedAt: string;
};

export type ObservationProvenance = {
  ruleId: string;
  ruleDescription: string;
  sourceSystems: readonly string[];
  supportingRecordIds: readonly string[];
  retrievedAt: string;
  freshness: "current" | "recent" | "stale" | "unknown";
  limitations: readonly string[];
};

export type ObservationAssessment = {
  severity: ObservationSeverity;
  priority: ObservationPriority;
  priorityScore: number;
  confidence: number;
  urgency: number;
  materiality: number;
  memberRelevance: number;
  actionability: number;
  durationDays?: number;
  recurrenceCount?: number;
  goalRelevance?: number;
};

export type ObservationPresentation = {
  title: string;
  summary: string;
  detail: string;
  whyNoticed: string;
  whatChanged?: string;
  whyItMayMatter?: string;
  suggestedQuestion?: string;
  workspaceTarget?: string;
  action?: StructuredAgentAction;
};

export type ObservationDismissal = {
  dismissedAt: string;
  dismissedBy: string;
  reason?: string;
  evidenceSignature: string;
};

export type Observation = {
  id: string;
  fingerprint: string;
  evidenceSignature: string;
  ownerId: string;
  specialistId: string;
  domain: string;
  category: string;
  type: ObservationType;
  status: ObservationStatus;
  time: ObservationTimeContext;
  evidence: readonly ObservationEvidenceItem[];
  provenance: ObservationProvenance;
  assessment: ObservationAssessment;
  presentation: ObservationPresentation;
  relatedEntityIds: readonly string[];
  createdAt: string;
  updatedAt: string;
  revision: number;
  dismissal?: ObservationDismissal;
};

export type ObservationDraft = Omit<
  Observation,
  "id" | "ownerId" | "specialistId" | "status" | "createdAt" | "updatedAt" | "revision" | "dismissal"
> & {
  id?: string;
  status?: ObservationStatus;
  materiallyChanged?: boolean;
};

export type ObservationDetectionContext<TData> = {
  ownerId: string;
  specialistId: string;
  asOf: string;
  data: TData;
  authorizedDomains: readonly string[];
  goals?: readonly { id: string; title: string }[];
  thresholds?: Readonly<Record<string, number>>;
};

export type ObservationDetectionResult = {
  observations: readonly ObservationDraft[];
  resolvedFingerprints?: readonly string[];
};

export type ObservationDetector<TData = unknown> = {
  id: string;
  specialistId: string;
  domain: string;
  supportedTypes: readonly ObservationType[];
  detect(context: ObservationDetectionContext<TData>): ObservationDetectionResult;
};

export type ObservationQuery = {
  ownerId: string;
  specialistId?: string;
  domain?: string;
  types?: readonly ObservationType[];
  statuses?: readonly ObservationStatus[];
  minimumPriorityScore?: number;
  includeDismissed?: boolean;
};

export type ObservationExplanation = {
  observationId: string;
  whyItExists: string;
  whatChanged?: string;
  whyItMayMatter?: string;
  facts: readonly ObservationEvidenceItem[];
  inferences: readonly ObservationEvidenceItem[];
  correlations: readonly ObservationEvidenceItem[];
  rule: string;
  limitations: readonly string[];
  confidence: number;
};

export interface ObservationStore {
  list(ownerId: string, specialistId?: string): Observation[];
  get(ownerId: string, observationId: string): Observation | undefined;
  findByFingerprint(ownerId: string, specialistId: string, fingerprint: string): Observation | undefined;
  save(observation: Observation): Observation;
}

export class InMemoryObservationStore implements ObservationStore {
  private readonly records = new Map<string, Observation>();
  private key(ownerId: string, id: string) { return `${ownerId}:${id}`; }
  list(ownerId: string, specialistId?: string) {
    return Array.from(this.records.values()).filter(
      (item) => item.ownerId === ownerId && (!specialistId || item.specialistId === specialistId)
    );
  }
  get(ownerId: string, observationId: string) { return this.records.get(this.key(ownerId, observationId)); }
  findByFingerprint(ownerId: string, specialistId: string, fingerprint: string) {
    return this.list(ownerId, specialistId).find((item) => item.fingerprint === fingerprint);
  }
  save(observation: Observation) {
    this.records.set(this.key(observation.ownerId, observation.id), observation);
    return observation;
  }
}

function bounded(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

export function calculateObservationPriority(
  assessment: Pick<ObservationAssessment, "urgency" | "materiality" | "memberRelevance" | "actionability" | "confidence"> & {
    durationDays?: number;
    recurrenceCount?: number;
    goalRelevance?: number;
  }
) {
  const confidence = bounded(assessment.confidence * (assessment.confidence <= 1 ? 100 : 1));
  const score =
    bounded(assessment.urgency) * 0.22 +
    bounded(assessment.materiality) * 0.24 +
    bounded(assessment.memberRelevance) * 0.2 +
    bounded(assessment.actionability) * 0.14 +
    confidence * 0.12 +
    bounded(assessment.goalRelevance || 0) * 0.04 +
    bounded((assessment.recurrenceCount || 0) * 12) * 0.025 +
    bounded((assessment.durationDays || 0) * 2) * 0.015;
  const priorityScore = Math.round(score * 100) / 100;
  const priority: ObservationPriority =
    priorityScore >= 85 ? "critical" : priorityScore >= 65 ? "high" : priorityScore >= 35 ? "medium" : "low";
  return { priority, priorityScore };
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function createObservationFingerprint(parts: readonly (string | number | undefined)[]) {
  return parts.filter((part) => part !== undefined).map((part) => String(part).trim().toLowerCase()).join(":");
}

export function createObservationEvidenceSignature(evidence: readonly ObservationEvidenceItem[]) {
  return stableValue(evidence.map(({ id, kind, value, source, recordId }) => ({ id, kind, value, source, recordId })));
}

function validateDraft(draft: ObservationDraft) {
  if (!draft.fingerprint.trim() || !draft.domain.trim() || !draft.category.trim()) throw new Error("Observations require a fingerprint, domain, and category.");
  if (!draft.evidence.length) throw new Error("Observations require structured evidence.");
  if (!draft.provenance.ruleId.trim() || !draft.provenance.sourceSystems.length) throw new Error("Observations require a rule and source provenance.");
  if (!draft.evidence.some((item) => item.kind === "fact")) throw new Error("Observations require at least one supporting fact.");
  if (draft.assessment.confidence < 0 || draft.assessment.confidence > 1) throw new Error("Observation confidence must be between 0 and 1.");
  if (draft.evidenceSignature !== createObservationEvidenceSignature(draft.evidence)) throw new Error("Observation evidence signature does not match its evidence.");
}

export class SharedObservationIntelligence {
  private readonly detectors = new Map<string, ObservationDetector<unknown>>();

  constructor(
    private readonly store: ObservationStore = new InMemoryObservationStore(),
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  registerDetector<TData>(detector: ObservationDetector<TData>) {
    if (!detector.id.trim() || !detector.specialistId.trim() || !detector.domain.trim()) throw new Error("Observation detectors require an id, specialist, and domain.");
    if (this.detectors.has(detector.id)) throw new Error(`Observation detector ${detector.id} is already registered.`);
    this.detectors.set(detector.id, detector as ObservationDetector<unknown>);
    return detector;
  }

  analyze<TData>(context: ObservationDetectionContext<TData>) {
    const detected: Observation[] = [];
    const timestamp = this.now();
    const detectors = Array.from(this.detectors.values()).filter(
      (detector) => detector.specialistId === context.specialistId && context.authorizedDomains.includes(detector.domain)
    );
    for (const detector of detectors) {
      const result = detector.detect(context as ObservationDetectionContext<unknown>);
      for (const draft of result.observations) {
        if (draft.domain !== detector.domain) throw new Error(`Detector ${detector.id} returned unauthorized domain ${draft.domain}.`);
        validateDraft(draft);
        const existing = this.store.findByFingerprint(context.ownerId, context.specialistId, draft.fingerprint);
        if (existing?.status === "Dismissed" && existing.evidenceSignature === draft.evidenceSignature) continue;
        if (existing && existing.evidenceSignature === draft.evidenceSignature) {
          const confirmed = this.store.save({ ...existing, updatedAt: timestamp });
          if (!["Dismissed", "Resolved", "Expired", "Superseded"].includes(confirmed.status)) detected.push(confirmed);
          continue;
        }
        const reopening = existing && ["Dismissed", "Resolved", "Expired"].includes(existing.status);
        if (reopening && !draft.materiallyChanged) continue;
        const observation: Observation = {
          ...draft,
          id: existing?.id || draft.id || `${context.specialistId}:${draft.fingerprint}`,
          ownerId: context.ownerId,
          specialistId: context.specialistId,
          status: reopening ? "Active" : draft.status || "New",
          createdAt: existing?.createdAt || timestamp,
          updatedAt: timestamp,
          revision: (existing?.revision || 0) + 1,
          dismissal: undefined,
        };
        this.store.save(observation);
        detected.push(observation);
      }
      for (const fingerprint of result.resolvedFingerprints || []) {
        const existing = this.store.findByFingerprint(context.ownerId, context.specialistId, fingerprint);
        if (existing && !["Resolved", "Expired", "Superseded"].includes(existing.status)) this.transition(context.ownerId, existing.id, "Resolved");
      }
    }
    return this.rank(detected);
  }

  retrieve(query: ObservationQuery) {
    return this.rank(this.store.list(query.ownerId, query.specialistId).filter((item) =>
      (!query.domain || item.domain === query.domain) &&
      (!query.types?.length || query.types.includes(item.type)) &&
      (!query.statuses?.length || query.statuses.includes(item.status)) &&
      (query.includeDismissed || item.status !== "Dismissed") &&
      (query.minimumPriorityScore === undefined || item.assessment.priorityScore >= query.minimumPriorityScore)
    ));
  }

  rank(observations: readonly Observation[]) {
    return [...observations].sort(
      (a, b) => b.assessment.priorityScore - a.assessment.priorityScore ||
        b.assessment.confidence - a.assessment.confidence ||
        a.fingerprint.localeCompare(b.fingerprint)
    );
  }

  acknowledge(ownerId: string, observationId: string) { return this.transition(ownerId, observationId, "Acknowledged"); }
  resolve(ownerId: string, observationId: string) { return this.transition(ownerId, observationId, "Resolved"); }
  expire(ownerId: string, observationId: string) { return this.transition(ownerId, observationId, "Expired"); }
  supersede(ownerId: string, observationId: string) { return this.transition(ownerId, observationId, "Superseded"); }

  dismiss(ownerId: string, observationId: string, dismissedBy: string, reason?: string) {
    const existing = this.require(ownerId, observationId);
    return this.store.save({
      ...existing,
      status: "Dismissed",
      dismissal: { dismissedAt: this.now(), dismissedBy, reason, evidenceSignature: existing.evidenceSignature },
      updatedAt: this.now(),
      revision: existing.revision + 1,
    });
  }

  explain(ownerId: string, observationId: string): ObservationExplanation {
    const observation = this.require(ownerId, observationId);
    return {
      observationId,
      whyItExists: observation.presentation.whyNoticed,
      whatChanged: observation.presentation.whatChanged,
      whyItMayMatter: observation.presentation.whyItMayMatter,
      facts: observation.evidence.filter((item) => item.kind === "fact"),
      inferences: observation.evidence.filter((item) => item.kind === "inference"),
      correlations: observation.evidence.filter((item) => item.kind === "correlation"),
      rule: observation.provenance.ruleDescription,
      limitations: observation.provenance.limitations,
      confidence: observation.assessment.confidence,
    };
  }

  private transition(ownerId: string, observationId: string, status: ObservationStatus) {
    const existing = this.require(ownerId, observationId);
    return this.store.save({ ...existing, status, updatedAt: this.now(), revision: existing.revision + 1 });
  }

  private require(ownerId: string, observationId: string) {
    const observation = this.store.get(ownerId, observationId);
    if (!observation) throw new Error(`Observation ${observationId} was not found for this owner.`);
    return observation;
  }
}

export const sharedObservationDetectionPatterns = [
  "compare-current-to-personal-baseline",
  "detect-directional-change",
  "detect-sustained-trend",
  "detect-member-relative-anomaly",
  "detect-missing-required-information",
  "detect-inconsistent-records",
  "detect-risk-condition",
  "detect-opportunity-condition",
  "detect-improvement-or-regression",
  "detect-milestone",
  "identify-correlation-without-claiming-causation",
  "track-unresolved-follow-up",
] as const;
