import type { ProfessionalId, RuntimeContext, StructuredKnowledgeProposal } from "./types";

export const historicalReconciliationVersion = "ap104-v1";
export const historicalReconciliationBatchSize = 4;

export type HistoricalConversationMessage = RuntimeContext["message"] & {
  ownerId: string;
  conversationId: string;
  professionalId: ProfessionalId;
};

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
    ? value.toLowerCase().replace(/\b(?:the|a|an|u\.s\.)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim()
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

const identityKeys = ["name", "title", "institution", "employer", "certificate", "condition", "medicationName", "supplementName", "accountName", "debtName", "goal", "priority", "preference"];
const temporalKeys = ["date", "year", "graduationYear", "startDate", "endDate", "occurredOn"];

function identityValues(fields: Record<string, unknown>) {
  return identityKeys.map((key) => normalized(fields[key])).filter(Boolean);
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
  let duplicatesIgnored = 0;
  let conflictsDetected = 0;

  for (const proposal of proposals) {
    const candidate = candidateFor(proposal, canonicalRecords);
    const differences = candidate ? comparableDifferences(proposal, candidate) : [];
    if (candidate && !differences.length && hasSupportingOverlap(proposal, candidate)) {
      duplicatesIgnored += 1;
      continue;
    }
    const disposition: HistoricalProposalDisposition = candidate ? (differences.length ? "conflict" : "merge") : "create";
    if (disposition === "conflict") conflictsDetected += 1;
    const fields = stableObject(proposal.fields);
    const proposalId = `ap104-${stableHash(JSON.stringify([professionalId, message.conversationId, message.id, proposal.domain, proposal.entityType, fields]))}`;
    accepted.push({
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
    });
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
