import type { Observation } from "./observations";
import type { ConfidenceAssessment } from "./probabilityConfidence";
import type { ProfessionalJournalEntry } from "./professionalJournal";

export type MemberUnderstandingDimension =
  | "strength"
  | "weakness"
  | "preference"
  | "communication-style"
  | "decision-style"
  | "risk-tolerance"
  | "habit"
  | "motivator"
  | "learning-preference"
  | "behavior-pattern"
  | "goal";

export type MemberUnderstandingSourceType =
  | "observation"
  | "professional-journal"
  | "conversation"
  | "document"
  | "historical-outcome";

export type MemberUnderstandingStatus = "active" | "superseded" | "disputed" | "removed";

export type MemberUnderstandingEvidence = {
  id: string;
  sourceType: MemberUnderstandingSourceType;
  sourceId: string;
  capturedAt: string;
  interpretationBasis: string;
  originatingSpecialistId?: string;
};

export type MemberUnderstanding = {
  id: string;
  ownerId: string;
  dimension: MemberUnderstandingDimension;
  understanding: string;
  rationale: string;
  confidence: ConfidenceAssessment;
  evidence: readonly MemberUnderstandingEvidence[];
  applicableSpecialists: readonly string[] | "all";
  originatingSpecialistId: string;
  fingerprint: string;
  status: MemberUnderstandingStatus;
  createdAt: string;
  updatedAt: string;
  revision: number;
  supersedesUnderstandingId?: string;
  contradictedByUnderstandingIds: readonly string[];
};

export type RefineMemberUnderstandingInput = Omit<
  MemberUnderstanding,
  "status" | "createdAt" | "updatedAt" | "revision" | "supersedesUnderstandingId" | "contradictedByUnderstandingIds"
> & {
  status?: MemberUnderstandingStatus;
  contradictsUnderstandingIds?: readonly string[];
};

export type MemberUnderstandingQuery = {
  ownerId: string;
  specialistId: string;
  dimensions?: readonly MemberUnderstandingDimension[];
  limit?: number;
};

export type MemberUnderstandingReasoningItem = {
  understandingId: string;
  dimension: MemberUnderstandingDimension;
  understanding: string;
  confidence: ConfidenceAssessment["confidence"];
  evidenceSourceTypes: readonly MemberUnderstandingSourceType[];
  updatedAt: string;
};

export type MemberUnderstandingContext = {
  ownerId?: string;
  specialistId: string;
  purpose: "personalized-reasoning";
  state: "available" | "empty";
  entries: readonly MemberUnderstandingReasoningItem[];
};

export interface MemberUnderstandingStore {
  save(understanding: MemberUnderstanding): MemberUnderstanding;
  get(ownerId: string, understandingId: string): MemberUnderstanding | undefined;
  query(ownerId: string): readonly MemberUnderstanding[];
}

export class InMemoryMemberUnderstandingStore implements MemberUnderstandingStore {
  private readonly entries = new Map<string, MemberUnderstanding>();
  private key(ownerId: string, id: string) { return `${ownerId}:${id}`; }
  save(understanding: MemberUnderstanding) {
    this.entries.set(this.key(understanding.ownerId, understanding.id), understanding);
    return understanding;
  }
  get(ownerId: string, understandingId: string) {
    return this.entries.get(this.key(ownerId, understandingId));
  }
  query(ownerId: string) {
    return Array.from(this.entries.values()).filter((entry) => entry.ownerId === ownerId);
  }
}

function validate(input: RefineMemberUnderstandingInput) {
  if (!input.id.trim() || !input.ownerId.trim() || !input.originatingSpecialistId.trim()) throw new Error("Member understanding requires an id, owner, and originating specialist.");
  if (!input.understanding.trim() || !input.rationale.trim()) throw new Error("Member understanding requires an interpretation and rationale.");
  if (!input.fingerprint.trim()) throw new Error("Member understanding requires a stable fingerprint.");
  if (!input.evidence.length) throw new Error("Member understanding requires interpreted evidence.");
  if (input.applicableSpecialists !== "all" && !input.applicableSpecialists.length) throw new Error("Member understanding requires at least one applicable specialist.");
  const evidenceIds = new Set(input.evidence.map((item) => item.id));
  if (input.confidence.supportingEvidenceIds.some((id) => !evidenceIds.has(id))) throw new Error("Member understanding confidence references evidence not supplied to the model.");
  if (input.evidence.some((item) => !item.interpretationBasis.trim())) throw new Error("Member understanding evidence requires an interpretation basis rather than a raw fact.");
  return input;
}

export class SharedMemberUnderstandingModel {
  constructor(
    private readonly store: MemberUnderstandingStore = new InMemoryMemberUnderstandingStore(),
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  refine(input: RefineMemberUnderstandingInput) {
    validate(input);
    const timestamp = this.now();
    const contradictions = input.contradictsUnderstandingIds || [];
    for (const contradictedId of contradictions) {
      const contradicted = this.store.get(input.ownerId, contradictedId);
      if (!contradicted) throw new Error(`Contradicted understanding ${contradictedId} was not found for this owner.`);
      this.store.save(Object.freeze({
        ...contradicted,
        status: "disputed" as const,
        contradictedByUnderstandingIds: Array.from(new Set([...contradicted.contradictedByUnderstandingIds, input.id])),
        updatedAt: timestamp,
      }));
    }
    const existing = this.store.query(input.ownerId).find(
      (entry) => entry.fingerprint === input.fingerprint && entry.status === "active"
    );
    if (existing) {
      const unchanged =
        existing.understanding === input.understanding &&
        existing.rationale === input.rationale &&
        existing.confidence.confidenceScore === input.confidence.confidenceScore &&
        existing.evidence.map((item) => item.id).join("|") === input.evidence.map((item) => item.id).join("|");
      if (unchanged) return existing;
      if (input.id === existing.id) throw new Error("Member understanding refinements require a new id so prior interpretation is preserved.");
      this.store.save(Object.freeze({ ...existing, status: "superseded" as const, updatedAt: timestamp }));
      return this.store.save(Object.freeze({
        ...input,
        status: input.status || "active",
        createdAt: timestamp,
        updatedAt: timestamp,
        revision: existing.revision + 1,
        supersedesUnderstandingId: existing.id,
        contradictedByUnderstandingIds: [],
      }));
    }
    return this.store.save(Object.freeze({
      ...input,
      status: input.status || "active",
      createdAt: timestamp,
      updatedAt: timestamp,
      revision: 1,
      contradictedByUnderstandingIds: [],
    }));
  }

  refineFromObservation(input: {
    observation: Observation;
    dimension: MemberUnderstandingDimension;
    understanding: string;
    rationale: string;
    applicableSpecialists?: readonly string[] | "all";
  }) {
    if (!input.observation.confidenceAnalysis) throw new Error("Observation confidence analysis is required before refining member understanding.");
    return this.refine({
      id: `understanding:${input.observation.id}:r${input.observation.revision}`,
      ownerId: input.observation.ownerId,
      dimension: input.dimension,
      understanding: input.understanding,
      rationale: input.rationale,
      confidence: input.observation.confidenceAnalysis,
      evidence: input.observation.evidence.map((item) => ({
        id: item.id,
        sourceType: "observation",
        sourceId: input.observation.id,
        capturedAt: item.observedAt,
        interpretationBasis: input.observation.presentation.whyNoticed,
        originatingSpecialistId: input.observation.specialistId,
      })),
      applicableSpecialists: input.applicableSpecialists || "all",
      originatingSpecialistId: input.observation.specialistId,
      fingerprint: `observation:${input.observation.fingerprint}:${input.dimension}`,
    });
  }

  refineFromJournal(input: {
    entry: ProfessionalJournalEntry;
    dimension: MemberUnderstandingDimension;
    understanding: string;
    applicableSpecialists?: readonly string[] | "all";
  }) {
    return this.refine({
      id: `understanding:${input.entry.id}`,
      ownerId: input.entry.ownerId,
      dimension: input.dimension,
      understanding: input.understanding,
      rationale: input.entry.interpretation,
      confidence: input.entry.confidence,
      evidence: input.entry.evidence.map((item) => ({
        id: item.id,
        sourceType: "professional-journal",
        sourceId: input.entry.id,
        capturedAt: item.observedAt,
        interpretationBasis: input.entry.interpretation,
        originatingSpecialistId: input.entry.specialistId,
      })),
      applicableSpecialists: input.applicableSpecialists || "all",
      originatingSpecialistId: input.entry.specialistId,
      fingerprint: `journal:${input.entry.fingerprint}:${input.dimension}`,
    });
  }

  query(input: MemberUnderstandingQuery) {
    return this.store.query(input.ownerId)
      .filter((entry) =>
        entry.status === "active" &&
        (entry.applicableSpecialists === "all" || entry.applicableSpecialists.includes(input.specialistId)) &&
        (!input.dimensions?.length || input.dimensions.includes(entry.dimension))
      )
      .sort((a, b) =>
        b.confidence.confidenceScore - a.confidence.confidenceScore ||
        Date.parse(b.updatedAt) - Date.parse(a.updatedAt) ||
        a.id.localeCompare(b.id)
      )
      .slice(0, Math.max(0, input.limit ?? 25));
  }

  context(input: MemberUnderstandingQuery): MemberUnderstandingContext {
    const entries = this.query(input).map((entry) => ({
      understandingId: entry.id,
      dimension: entry.dimension,
      understanding: entry.understanding,
      confidence: entry.confidence.confidence,
      evidenceSourceTypes: Array.from(new Set(entry.evidence.map((item) => item.sourceType))),
      updatedAt: entry.updatedAt,
    }));
    return {
      ownerId: input.ownerId,
      specialistId: input.specialistId,
      purpose: "personalized-reasoning",
      state: entries.length ? "available" : "empty",
      entries,
    };
  }

  correct(ownerId: string, understandingId: string, correction: Omit<RefineMemberUnderstandingInput, "ownerId" | "fingerprint">) {
    const existing = this.store.get(ownerId, understandingId);
    if (!existing) throw new Error(`Member understanding ${understandingId} was not found for this owner.`);
    return this.refine({ ...correction, ownerId, fingerprint: existing.fingerprint });
  }

  remove(ownerId: string, understandingId: string) {
    const existing = this.store.get(ownerId, understandingId);
    if (!existing) throw new Error(`Member understanding ${understandingId} was not found for this owner.`);
    return this.store.save(Object.freeze({ ...existing, status: "removed" as const, updatedAt: this.now() }));
  }
}

export function emptyMemberUnderstandingContext(specialistId: string): MemberUnderstandingContext {
  return {
    specialistId,
    purpose: "personalized-reasoning",
    state: "empty",
    entries: [],
  };
}

export const memberUnderstandingSourceTypes = [
  "observation",
  "professional-journal",
  "conversation",
  "document",
  "historical-outcome",
] as const;
