import type { ConfidenceAssessment } from "./probabilityConfidence";
import type { Observation } from "./observations";

export type ProfessionalJournalStatus = "active" | "superseded" | "resolved" | "expired";
export type ProfessionalJournalEntryType =
  | "behavior-pattern"
  | "progress-pattern"
  | "risk-pattern"
  | "preference-pattern"
  | "constraint-pattern"
  | "follow-up-pattern"
  | "domain-pattern";

export type ProfessionalJournalEvidence = {
  id: string;
  source: string;
  sourceRecordId?: string;
  observedAt: string;
  description: string;
};

export type RelatedMemberDataReference = {
  resource: string;
  recordId: string;
  fields: readonly string[];
  ownerId: string;
};

export type ProfessionalJournalEntry = {
  id: string;
  ownerId: string;
  specialistId: string;
  type: ProfessionalJournalEntryType;
  observation: string;
  interpretation: string;
  confidence: ConfidenceAssessment;
  evidence: readonly ProfessionalJournalEvidence[];
  timestamp: string;
  relatedMemberData: readonly RelatedMemberDataReference[];
  status: ProfessionalJournalStatus;
  fingerprint: string;
  revision: number;
  supersedesEntryId?: string;
  expiresAt?: string;
  visibility: "specialist-internal";
};

export type CreateProfessionalJournalEntry = Omit<
  ProfessionalJournalEntry,
  "status" | "revision" | "visibility"
> & {
  status?: ProfessionalJournalStatus;
};

export type ProfessionalJournalQuery = {
  ownerId: string;
  specialistId: string;
  types?: readonly ProfessionalJournalEntryType[];
  statuses?: readonly ProfessionalJournalStatus[];
  relatedResource?: string;
  limit?: number;
};

export type ProfessionalJournalReasoningItem = {
  entryId: string;
  observation: string;
  interpretation: string;
  confidence: ConfidenceAssessment["confidence"];
  evidenceIds: readonly string[];
  relatedResources: readonly string[];
  timestamp: string;
};

export type ProfessionalJournalReasoningContext = {
  ownerId: string;
  specialistId: string;
  purpose: "internal-reasoning";
  entries: readonly ProfessionalJournalReasoningItem[];
};

export interface ProfessionalJournalStore {
  save(entry: ProfessionalJournalEntry): ProfessionalJournalEntry;
  get(ownerId: string, specialistId: string, entryId: string): ProfessionalJournalEntry | undefined;
  query(ownerId: string, specialistId: string): readonly ProfessionalJournalEntry[];
}

export class InMemoryProfessionalJournalStore implements ProfessionalJournalStore {
  private readonly entries = new Map<string, ProfessionalJournalEntry>();
  private key(ownerId: string, specialistId: string, entryId: string) {
    return `${ownerId}:${specialistId}:${entryId}`;
  }
  save(entry: ProfessionalJournalEntry) {
    this.entries.set(this.key(entry.ownerId, entry.specialistId, entry.id), entry);
    return entry;
  }
  get(ownerId: string, specialistId: string, entryId: string) {
    return this.entries.get(this.key(ownerId, specialistId, entryId));
  }
  query(ownerId: string, specialistId: string) {
    return Array.from(this.entries.values()).filter(
      (entry) => entry.ownerId === ownerId && entry.specialistId === specialistId
    );
  }
}

function validateEntry(input: CreateProfessionalJournalEntry) {
  if (!input.id.trim() || !input.ownerId.trim() || !input.specialistId.trim()) throw new Error("Professional journal entries require an id, owner, and specialist.");
  if (!input.observation.trim() || !input.interpretation.trim()) throw new Error("Professional journal entries require an observation and interpretation.");
  if (!input.fingerprint.trim()) throw new Error("Professional journal entries require a stable fingerprint.");
  if (!input.evidence.length) throw new Error("Professional journal entries require evidence.");
  if (!input.timestamp || !Number.isFinite(Date.parse(input.timestamp))) throw new Error("Professional journal entries require a valid timestamp.");
  if (input.expiresAt && Date.parse(input.expiresAt) <= Date.parse(input.timestamp)) throw new Error("Professional journal expiration must be after its timestamp.");
  if (input.relatedMemberData.some((item) => item.ownerId !== input.ownerId)) throw new Error("Related member data must belong to the journal owner.");
  const evidenceIds = new Set(input.evidence.map((item) => item.id));
  if (input.confidence.supportingEvidenceIds.some((id) => !evidenceIds.has(id))) {
    throw new Error("Professional journal confidence references evidence not stored with the entry.");
  }
  return input;
}

export class SharedProfessionalJournal {
  constructor(
    private readonly store: ProfessionalJournalStore = new InMemoryProfessionalJournalStore(),
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  record(input: CreateProfessionalJournalEntry) {
    validateEntry(input);
    const duplicate = this.store.query(input.ownerId, input.specialistId).find(
      (entry) => entry.fingerprint === input.fingerprint && entry.status === "active"
    );
    if (duplicate) {
      const unchanged =
        duplicate.observation === input.observation &&
        duplicate.interpretation === input.interpretation &&
        duplicate.confidence.confidenceScore === input.confidence.confidenceScore &&
        duplicate.evidence.map((item) => item.id).join("|") === input.evidence.map((item) => item.id).join("|");
      if (unchanged) return duplicate;
      if (input.id === duplicate.id) throw new Error("Professional journal revisions require a new entry id so prior understanding is preserved.");
      const superseded = Object.freeze({
        ...duplicate,
        status: "superseded" as const,
      });
      this.store.save(superseded);
      const revised = Object.freeze({
        ...input,
        id: input.id,
        status: input.status || "active",
        revision: duplicate.revision + 1,
        supersedesEntryId: duplicate.id,
        visibility: "specialist-internal" as const,
      });
      return this.store.save(revised);
    }
    const entry = Object.freeze({
      ...input,
      status: input.status || "active",
      revision: 1,
      visibility: "specialist-internal" as const,
    });
    return this.store.save(entry);
  }

  recordObservation(input: {
    observation: Observation;
    type: ProfessionalJournalEntryType;
    interpretation: string;
    relatedMemberData?: readonly RelatedMemberDataReference[];
  }) {
    if (!input.observation.confidenceAnalysis) throw new Error("An observation requires confidence analysis before it can inform the professional journal.");
    const evidence = input.observation.evidence.map((item) => ({
      id: item.id,
      source: item.source,
      sourceRecordId: item.recordId,
      observedAt: item.observedAt,
      description: `${item.label}: ${String(item.value)}`,
    }));
    return this.record({
      id: `journal:${input.observation.id}:r${input.observation.revision}`,
      ownerId: input.observation.ownerId,
      specialistId: input.observation.specialistId,
      type: input.type,
      observation: input.observation.presentation.summary,
      interpretation: input.interpretation,
      confidence: input.observation.confidenceAnalysis,
      evidence,
      timestamp: input.observation.updatedAt,
      relatedMemberData: input.relatedMemberData || [],
      fingerprint: `observation:${input.observation.fingerprint}`,
    });
  }

  query(input: ProfessionalJournalQuery) {
    const timestamp = Date.parse(this.now());
    return this.store.query(input.ownerId, input.specialistId)
      .filter((entry) =>
        (!input.types?.length || input.types.includes(entry.type)) &&
        (!input.statuses?.length || input.statuses.includes(entry.status)) &&
        (!input.relatedResource || entry.relatedMemberData.some((item) => item.resource === input.relatedResource)) &&
        (!entry.expiresAt || Date.parse(entry.expiresAt) > timestamp)
      )
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp) || a.id.localeCompare(b.id))
      .slice(0, Math.max(0, input.limit ?? 50));
  }

  reasoningContext(input: Omit<ProfessionalJournalQuery, "statuses">): ProfessionalJournalReasoningContext {
    const entries = this.query({ ...input, statuses: ["active"] }).map((entry) => ({
      entryId: entry.id,
      observation: entry.observation,
      interpretation: entry.interpretation,
      confidence: entry.confidence.confidence,
      evidenceIds: entry.evidence.map((item) => item.id),
      relatedResources: Array.from(new Set(entry.relatedMemberData.map((item) => item.resource))),
      timestamp: entry.timestamp,
    }));
    return {
      ownerId: input.ownerId,
      specialistId: input.specialistId,
      purpose: "internal-reasoning",
      entries,
    };
  }

  resolve(ownerId: string, specialistId: string, entryId: string) {
    return this.transition(ownerId, specialistId, entryId, "resolved");
  }

  expire(ownerId: string, specialistId: string, entryId: string) {
    return this.transition(ownerId, specialistId, entryId, "expired");
  }

  private transition(ownerId: string, specialistId: string, entryId: string, status: ProfessionalJournalStatus) {
    const entry = this.store.get(ownerId, specialistId, entryId);
    if (!entry) throw new Error(`Professional journal entry ${entryId} was not found for this owner and specialist.`);
    return this.store.save(Object.freeze({ ...entry, status }));
  }
}

export const professionalJournalFixturePatterns = {
  moneyCoach: ["member discipline", "budget consistency", "impulse spending", "emergency fund progress"],
  healthAdvisor: ["medication adherence", "sleep trend", "weight trend"],
  guidanceCounselor: ["confidence trend", "learning style", "retention trend"],
} as const;
