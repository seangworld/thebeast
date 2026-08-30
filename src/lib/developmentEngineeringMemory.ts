export type EngineeringMemoryTruthClass = "fact" | "inference";
export type EngineeringMemoryStatus = "current" | "superseded" | "corrected";

export type EngineeringMemoryRecord = {
  id: string;
  title: string;
  lesson: string;
  truthClass: EngineeringMemoryTruthClass;
  provenance: readonly string[];
  evidenceDate: string;
  applicableTo: readonly string[];
  reviewAfter: string;
  status: EngineeringMemoryStatus;
  supersedes: string | null;
  limitations: readonly string[];
  tags: readonly ("architecture" | "failure-pattern" | "review" | "remediation" | "release" | "compatibility")[];
  containsSecrets: false;
  containsPrivateMemberData: false;
};

const forbiddenMemoryPatterns = [
  /(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|service[_ -]?role|password|private[_ -]?key)\s*[:=]/i,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9_-]+\b/,
  /\b(?:member|patient|student)\s+(?:email|address|diagnosis|account number)\b/i,
] as const;

export const engineeringMemoryRules = [
  "Every record needs specific provenance and an evidence date.",
  "Fact and inference remain visibly distinct.",
  "Corrections and supersessions create explicit lineage; history is not silently rewritten.",
  "Current canonical Product Truth always overrides historical memory.",
  "Records expire into review rather than silently controlling future decisions.",
  "Secrets, credentials, private member data, and raw conversational memory are rejected.",
] as const;

function collectTextValues(value: unknown, seen = new Set<object>()): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  return Object.values(value).flatMap((nested) => collectTextValues(nested, seen));
}

export function validateEngineeringMemoryRecord(record: EngineeringMemoryRecord, now = "2026-08-30") {
  const errors: string[] = [];
  const text = collectTextValues(record).join(" ");
  if (!record.id.trim() || !record.title.trim() || !record.lesson.trim()) errors.push("Identity, title, and lesson are required.");
  if (!record.provenance.length || record.provenance.some((item) => !item.trim())) errors.push("Specific provenance is required.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.evidenceDate)) errors.push("Evidence date must use YYYY-MM-DD.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.reviewAfter)) errors.push("Review date must use YYYY-MM-DD.");
  if (record.evidenceDate > now) errors.push("Evidence date cannot be in the future.");
  if (record.status !== "current" && !record.supersedes) errors.push("Corrected or superseded records need lineage.");
  if (forbiddenMemoryPatterns.some((pattern) => pattern.test(text))) errors.push("Secret or private-member-data pattern detected.");
  if (record.containsSecrets || record.containsPrivateMemberData) errors.push("Sensitive memory is prohibited.");
  return { valid: errors.length === 0, errors };
}

export function currentEngineeringMemory(
  records: readonly EngineeringMemoryRecord[],
  currentProductTruthReferences: readonly string[],
  asOf: string
) {
  const supersededIds = new Set(records.flatMap((record) => record.supersedes ? [record.supersedes] : []));
  return records.filter((record) =>
    validateEngineeringMemoryRecord(record, asOf).valid &&
    record.status === "current" &&
    !supersededIds.has(record.id) &&
    record.reviewAfter >= asOf &&
    record.provenance.every((reference) => currentProductTruthReferences.includes(reference) || reference.startsWith("BF-AGT-013:"))
  );
}

export function appendEngineeringMemoryCorrection(
  records: readonly EngineeringMemoryRecord[],
  correction: Omit<EngineeringMemoryRecord, "supersedes" | "status"> & { supersedes: string }
): readonly EngineeringMemoryRecord[] {
  const original = records.find(({ id }) => id === correction.supersedes);
  if (!original) throw new Error("Correction must reference an existing engineering-memory record.");
  if (records.some(({ id }) => id === correction.id)) throw new Error("Correction id must be immutable and unique.");
  const appended: EngineeringMemoryRecord = { ...correction, status: "current", supersedes: original.id };
  const validation = validateEngineeringMemoryRecord(appended);
  if (!validation.valid) throw new Error(validation.errors.join(" "));
  return [...records, appended];
}

export const packageAEngineeringMemory: readonly EngineeringMemoryRecord[] = [
  {
    id: "bf-agt-013-capability-is-not-authority",
    title: "Capability, autonomy, and authority require separate evidence",
    lesson: "A more capable or independently effective agent does not receive broader authority. Public claims and workflow gates must project each concept separately.",
    truthClass: "fact",
    provenance: ["BF-AGT-013:authorized-objective", "BF-AGT-013:capability-framework-tests"],
    evidenceDate: "2026-08-30",
    applicableTo: ["all-development-operations-agents", "public-agent-profiles", "BeastAdmin"],
    reviewAfter: "2027-02-28",
    status: "current",
    supersedes: null,
    limitations: ["Reassess when an agent's tools, workflow, operating environment, or canonical authority changes."],
    tags: ["architecture", "compatibility"],
    containsSecrets: false,
    containsPrivateMemberData: false,
  },
  {
    id: "bf-agt-013-review-needs-user-outcome",
    title: "Literal acceptance is insufficient for independent review",
    lesson: "Reviewer evidence must cover the actual user need, failure states, authorization, Product Truth, and cross-ecosystem consequences in addition to code correctness.",
    truthClass: "fact",
    provenance: ["BF-AGT-013:authorized-objective", "BF-AGT-013:review-matrix-tests"],
    evidenceDate: "2026-08-30",
    applicableTo: ["reviewer-agent", "product-completeness"],
    reviewAfter: "2027-02-28",
    status: "current",
    supersedes: null,
    limitations: ["The matrix is a minimum contract; package-specific risks may require additional checks."],
    tags: ["review", "failure-pattern"],
    containsSecrets: false,
    containsPrivateMemberData: false,
  },
  {
    id: "bf-agt-013-memory-yields-to-product-truth",
    title: "Engineering memory cannot overrule Product Truth",
    lesson: "Historical lessons assist planning only when provenance, applicability, freshness, and current canonical Product Truth still support them.",
    truthClass: "fact",
    provenance: ["BF-AGT-013:authorized-objective", "BF-AGT-013:engineering-memory-tests"],
    evidenceDate: "2026-08-30",
    applicableTo: ["orchestrator-3", "developer-agent", "reviewer-agent"],
    reviewAfter: "2027-02-28",
    status: "current",
    supersedes: null,
    limitations: ["Code-owned seeds are intentionally small; new lessons need governed evidence and review."],
    tags: ["architecture", "compatibility"],
    containsSecrets: false,
    containsPrivateMemberData: false,
  },
] as const;
