import type { ProfessionalId, RuntimeContext, StructuredKnowledgeProposal } from "./types";

export const historicalReconciliationVersion = "bh206-be206-v3";
export const historicalReconciliationBatchSize = 4;

export type HistoricalConversationMessage = RuntimeContext["message"] & {
  ownerId: string;
  conversationId: string;
  professionalId: ProfessionalId;
};

export type LegacyHealthAggregateRecord = {
  id: string;
  owner_id: string;
  title?: string | null;
  details?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type LegacyEducationProfile = {
  owner_id: string;
  discovery_answers?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const legacyHealthTopics = new Set([
  "health-conditions-needed", "health-medications-needed", "health-allergies-needed",
  "health-procedures-needed", "health-care-team-needed", "health-measurements-needed",
  "health-vaccination-status-needed", "health-family-history-needed",
]);

function preservedText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Uses only preserved member evidence. Aggregate labels and topic keys are never treated as evidence. */
export function historicalHealthAggregateEvidence(records: LegacyHealthAggregateRecord[]): HistoricalConversationMessage[] {
  return records.flatMap((row) => {
    const topic = preservedText(row.details?.topic);
    const text = preservedText(row.details?.context);
    if (!topic || !legacyHealthTopics.has(topic) || !text) return [];
    return [{
      id: `legacy-health-record:${row.id}`,
      role: "user" as const,
      text,
      createdAt: row.created_at || row.updated_at || new Date(0).toISOString(),
      ownerId: row.owner_id,
      conversationId: preservedText(row.details?.conversation_id) || `legacy-health-record:${row.id}`,
      professionalId: "beasthealth.health-advisor" as const,
    }];
  });
}

/** Replays each preserved discovery answer independently so mixed narratives can yield distinct proposals. */
export function historicalEducationProfileEvidence(profiles: LegacyEducationProfile[]): HistoricalConversationMessage[] {
  return profiles.flatMap((row) => Object.entries(row.discovery_answers || {}).flatMap(([key, value]) => {
    const text = preservedText(value);
    if (!text) return [];
    return [{
      id: `legacy-education-answer:${key}`,
      role: "user" as const,
      text,
      createdAt: row.created_at || row.updated_at || new Date(0).toISOString(),
      ownerId: row.owner_id,
      conversationId: "legacy-education-profile",
      professionalId: "beasteducation.guidance-counselor" as const,
    }];
  }));
}

export type HistoricalProposalDisposition = "create" | "merge" | "conflict";

export type HistoricalProposalProvenance = {
  professionalId: ProfessionalId;
  conversationId: string;
  messageId: string;
  originalTimestamp: string;
  reconciledAt: string;
};

export type HistoricalKnowledgeProposal = StructuredKnowledgeProposal & {
  reconciliation: {
    version: typeof historicalReconciliationVersion;
    disposition: HistoricalProposalDisposition;
    currentStatus: "current" | "historical" | "unknown" | "needs_confirmation";
    provenance: HistoricalProposalProvenance;
    candidateRecordId: string | null;
    candidateSummary: string | null;
  };
};

export type CanonicalKnowledgeRecord = {
  id: string;
  domain: string;
  entityType: string;
  fields: Record<string, unknown>;
  updatedAt?: string;
};

export type HistoricalReconciliationMetrics = {
  conversationsScanned: number;
  messagesScanned: number;
  proposalsGenerated: number;
  duplicatesIgnored: number;
  conflictsDetected: number;
  accepted: number;
  edited: number;
  rejected: number;
  merged: number;
  failures: number;
};

export type HistoricalReconciliationState = {
  version: typeof historicalReconciliationVersion;
  professionalId: ProfessionalId;
  status: "idle" | "running" | "paused" | "completed" | "failed" | "skipped";
  captureThrough: string;
  nextMessageOffset: number;
  lastBatchId: string | null;
  resolvedNeedKeys: string[];
  metrics: HistoricalReconciliationMetrics;
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  lastError: string | null;
};

export function emptyHistoricalReconciliationMetrics(): HistoricalReconciliationMetrics {
  return { conversationsScanned: 0, messagesScanned: 0, proposalsGenerated: 0, duplicatesIgnored: 0, conflictsDetected: 0, accepted: 0, edited: 0, rejected: 0, merged: 0, failures: 0 };
}

export function createHistoricalReconciliationState(professionalId: ProfessionalId, now: string): HistoricalReconciliationState {
  return { version: historicalReconciliationVersion, professionalId, status: "running", captureThrough: now, nextMessageOffset: 0, lastBatchId: null, resolvedNeedKeys: [], metrics: emptyHistoricalReconciliationMetrics(), startedAt: now, updatedAt: now, completedAt: null, lastError: null };
}

export function transitionHistoricalReconciliationState(state: HistoricalReconciliationState, action: "pause" | "resume" | "skip", now: string): HistoricalReconciliationState {
  if (action === "pause" && state.status === "running") return { ...state, status: "paused", updatedAt: now };
  if (action === "resume" && ["paused", "failed", "idle", "skipped"].includes(state.status)) return { ...state, status: "running", updatedAt: now, lastError: null };
  if (action === "skip" && state.status !== "completed") return { ...state, status: "skipped", updatedAt: now };
  return state;
}

function normalized(value: unknown) {
  return typeof value === "string"
    ? value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/^(?:the|a|an)\s+/, "")
    : typeof value === "number" || typeof value === "boolean" ? String(value) : "";
}

function stableObject(value: Record<string, string | number | boolean | null>) {
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)));
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

const identityKeys = [
  "name", "title", "institution", "schoolName", "employer", "certificate", "credentialName", "certificationName",
  "condition", "medicationName", "supplementName", "procedureName", "providerName", "allergy", "measurementName",
  "vaccinationName", "relationship", "branch", "role", "skill", "constraint", "accountName", "debtName", "goal", "priority", "preference",
];
const temporalKeys = ["date", "year", "graduationYear", "startDate", "endDate", "occurredOn"];

function identityValues(fields: Record<string, unknown>) {
  return identityKeys.map((key) => normalized(fields[key])).filter(Boolean);
}

const genericAggregateIdentities = /^(?:current\s+)?(?:medications?|supplements?|conditions?|procedures?|providers?|specialists?|allergies?|measurements?|vaccinations?|family history|lifestyle|schools?|education history|employment|military experience|certifications?|preferences?|constraints?)$/i;

function listParts(value: string) {
  return value
    .replace(/^[^:]{1,50}:\s*/, "")
    .replace(/^(?:i\s+(?:currently\s+)?(?:take|use|have|see|saw)|my\s+[^:,.]{1,35}\s+(?:are|include)|(?:current\s+)?[^:,.]{1,35}\s+(?:are|include))\s+/i, "")
    .split(/\s*(?:\r?\n|;|,|\band\b|&)\s*/i)
    .map((item) => item.replace(/^(?:also\s+|a\s+|an\s+)/i, "").replace(/[.]+$/, "").trim())
    .filter((item) => item.length > 1);
}

function identityKeyFor(proposal: StructuredKnowledgeProposal) {
  return identityKeys.find((key) => typeof proposal.fields[key] === "string" && String(proposal.fields[key]).trim()) || "name";
}

function decomposedEntityType(entityType: string, item: string) {
  if (/medication/i.test(entityType) && /\b(?:supplement|vitamin|mineral|probiotic|fish oil)\b/i.test(item)) return "supplement";
  return entityType;
}

/** Enforces one proposal per entity after AP-100 extraction and before review/persistence. */
export function decomposeHistoricalProposals(message: HistoricalConversationMessage, proposals: StructuredKnowledgeProposal[]) {
  return proposals.flatMap((proposal) => {
    const identityKey = identityKeyFor(proposal);
    const identity = preservedText(proposal.fields[identityKey]);
    const context = preservedText(proposal.fields.context);
    const candidateText = identity && !genericAggregateIdentities.test(identity) ? identity : context || message.text;
    const parts = listParts(candidateText);
    if (parts.length < 2) return [proposal];
    return parts.map((item, index) => ({
      ...proposal,
      id: `${proposal.id}-entity-${index + 1}`,
      entityType: decomposedEntityType(proposal.entityType, item),
      fields: { [identityKey]: item },
      relatedRecordId: null,
      proposedAction: "create" as const,
    }));
  });
}

function recordSearchValues(record: CanonicalKnowledgeRecord) {
  const fieldValues = Object.values(record.fields)
    .flatMap((value) => typeof value === "object" && value && !Array.isArray(value)
      ? Object.values(value as Record<string, unknown>).map(normalized)
      : [normalized(value)])
    .filter(Boolean);
  return new Set([normalized(record.entityType), ...fieldValues]);
}

function candidateFor(proposal: StructuredKnowledgeProposal, records: CanonicalKnowledgeRecord[]) {
  const identities = identityValues(proposal.fields);
  if (!identities.length) return null;
  return records.find((record) => {
    const values = recordSearchValues(record);
    return identities.some((identity) => values.has(identity));
  }) || null;
}

function comparableDifferences(proposal: StructuredKnowledgeProposal, candidate: CanonicalKnowledgeRecord) {
  const candidateFields = candidate.fields;
  return Object.entries(proposal.fields).flatMap(([key, value]) => {
    const proposed = normalized(value);
    const existing = normalized(candidateFields[key]);
    return proposed && existing && proposed !== existing ? [`${key}: historical ${String(value)}; current ${String(candidateFields[key])}`] : [];
  });
}

function hasSupportingOverlap(proposal: StructuredKnowledgeProposal, candidate: CanonicalKnowledgeRecord) {
  return Object.entries(proposal.fields).some(([key, value]) => normalized(value) && normalized(value) === normalized(candidate.fields[key]));
}

function currentStatus(proposal: StructuredKnowledgeProposal, message: HistoricalConversationMessage): HistoricalKnowledgeProposal["reconciliation"]["currentStatus"] {
  const text = message.text.toLowerCase();
  if (/\b(?:former|previously|used to|stopped|completed|graduated|retired|expired)\b/.test(text)) return "historical";
  if (/\b(?:currently|now|still|today)\b/.test(text)) return "current";
  if (temporalKeys.some((key) => proposal.fields[key] != null)) return "historical";
  return "unknown";
}

export function reconcileHistoricalProposals({
  professionalId,
  message,
  proposals,
  canonicalRecords,
  reconciledAt,
}: {
  professionalId: ProfessionalId;
  message: HistoricalConversationMessage;
  proposals: StructuredKnowledgeProposal[];
  canonicalRecords: CanonicalKnowledgeRecord[];
  reconciledAt: string;
}) {
  const accepted: HistoricalKnowledgeProposal[] = [];
  const workingRecords = [...canonicalRecords];
  let duplicatesIgnored = 0;
  let conflictsDetected = 0;

  for (const proposal of proposals) {
    const negativeEntityStatement = /\b(?:no|none|without|do not|don't)\b/i.test(message.text)
      && ((/allerg/i.test(proposal.entityType) && /allerg/i.test(message.text))
        || (/family/i.test(proposal.entityType) && /family history/i.test(message.text))
        || (/supplement/i.test(proposal.entityType) && /supplement/i.test(message.text)));
    if (negativeEntityStatement) {
      duplicatesIgnored += 1;
      continue;
    }
    const candidate = candidateFor(proposal, workingRecords);
    const differences = candidate ? comparableDifferences(proposal, candidate) : [];
    if (candidate && !differences.length && hasSupportingOverlap(proposal, candidate)) {
      duplicatesIgnored += 1;
      continue;
    }
    const disposition: HistoricalProposalDisposition = candidate ? (differences.length ? "conflict" : "merge") : "create";
    if (disposition === "conflict") conflictsDetected += 1;
    const fields = stableObject(proposal.fields);
    const proposalId = `ap104-${stableHash(JSON.stringify([professionalId, message.conversationId, message.id, proposal.domain, proposal.entityType, fields]))}`;
    const reconciled: HistoricalKnowledgeProposal = {
      ...proposal,
      id: proposalId,
      fields,
      sourceMessageId: message.id,
      contradictions: Array.from(new Set([...proposal.contradictions, ...differences])),
      relatedRecordId: candidate?.id || null,
      proposedAction: candidate ? "update" : proposal.proposedAction === "none" ? "create" : proposal.proposedAction,
      approvalStatus: "proposed",
      reconciliation: {
        version: historicalReconciliationVersion,
        disposition,
        currentStatus: differences.length ? "needs_confirmation" : currentStatus(proposal, message),
        provenance: { professionalId, conversationId: message.conversationId, messageId: message.id, originalTimestamp: message.createdAt, reconciledAt },
        candidateRecordId: candidate?.id || null,
        candidateSummary: candidate ? `${candidate.entityType} record ${candidate.id}` : null,
      },
    };
    accepted.push(reconciled);
    workingRecords.push({ id: reconciled.id, domain: reconciled.domain, entityType: reconciled.entityType, fields: reconciled.fields });
  }
  return { proposals: accepted, duplicatesIgnored, conflictsDetected };
}

export function assertHistoricalMessagesOwnerScoped(messages: HistoricalConversationMessage[], ownerId: string, professionalId: ProfessionalId) {
  if (messages.some((message) => message.ownerId !== ownerId || message.professionalId !== professionalId)) {
    throw new Error("Historical reconciliation rejected cross-owner or cross-professional evidence.");
  }
}

export function resolvedNeedKeysFromProposals(proposals: HistoricalKnowledgeProposal[]) {
  return Array.from(new Set(proposals.flatMap((proposal) => [proposal.domain, proposal.entityType, ...Object.keys(proposal.fields)].map(normalized).filter(Boolean))));
}

export function removeAnsweredNeeds(needed: Array<{ id: string; question: string }>, resolvedKeys: string[]) {
  const keys = resolvedKeys.map(normalized).filter((key) => key.length > 2);
  return needed.filter((item) => !keys.some((key) => normalized(item.question).includes(key)));
}

export function safeHistoricalReconciliationTelemetry(state: HistoricalReconciliationState) {
  return { professionalId: state.professionalId, status: state.status, ...state.metrics, updatedAt: state.updatedAt, completedAt: state.completedAt };
}
