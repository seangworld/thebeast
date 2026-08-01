import { createHash } from "node:crypto";
import type { HealthRecordKind } from "@/lib/health/foundation";

export const healthDocumentExtractionVersion = "bh-204-v1";

export const healthDocumentExtractionCategories = [
  "diagnosis",
  "condition",
  "medication",
  "procedure",
  "provider",
  "appointment",
  "lab_value",
  "allergy",
  "vaccination",
  "instruction",
  "date",
  "facility",
] as const;

export type HealthDocumentExtractionCategory =
  (typeof healthDocumentExtractionCategories)[number];
export type HealthDocumentExtractionStatus =
  | "processing"
  | "ready"
  | "failed";
export type HealthDocumentExtractionItemStatus =
  | "pending"
  | "approved"
  | "rejected";

export type HealthDocumentExtraction = {
  id: string;
  documentId: string;
  documentTitle: string;
  contentFingerprint: string;
  extractionVersion: string;
  status: HealthDocumentExtractionStatus;
  summary: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type HealthDocumentExtractionItem = {
  id: string;
  extractionId: string;
  category: HealthDocumentExtractionCategory;
  label: string;
  value: string;
  occurredOn: string | null;
  sourceExcerpt: string | null;
  confidence: number | null;
  status: HealthDocumentExtractionItemStatus;
  approvedRecordId: string | null;
};

export type ParsedHealthDocumentExtraction = {
  summary: string;
  items: Array<
    Omit<
      HealthDocumentExtractionItem,
      "id" | "extractionId" | "status" | "approvedRecordId"
    >
  >;
};

const labelCategoryPatterns: Array<{
  category: HealthDocumentExtractionCategory;
  pattern: RegExp;
}> = [
  { category: "diagnosis", pattern: /^(?:diagnos(?:is|es)|assessment)\s*[:\-]\s*(.+)$/i },
  { category: "condition", pattern: /^(?:condition|problem)\s*[:\-]\s*(.+)$/i },
  { category: "medication", pattern: /^(?:medication|medicine|drug|rx)\s*[:\-]\s*(.+)$/i },
  { category: "procedure", pattern: /^(?:procedure|surgery)\s*[:\-]\s*(.+)$/i },
  { category: "provider", pattern: /^(?:provider|physician|doctor|clinician|prescriber)\s*[:\-]\s*(.+)$/i },
  { category: "appointment", pattern: /^(?:appointment|follow[- ]?up|visit)\s*[:\-]\s*(.+)$/i },
  { category: "lab_value", pattern: /^(?:lab|laboratory|test|result)\s*[:\-]\s*(.+)$/i },
  { category: "allergy", pattern: /^(?:allergy|allergies)\s*[:\-]\s*(.+)$/i },
  { category: "vaccination", pattern: /^(?:vaccination|vaccine|immunization)\s*[:\-]\s*(.+)$/i },
  { category: "instruction", pattern: /^(?:instruction|plan|direction)\s*[:\-]\s*(.+)$/i },
  { category: "date", pattern: /^(?:date|service date|report date)\s*[:\-]\s*(.+)$/i },
  { category: "facility", pattern: /^(?:facility|hospital|clinic|practice)\s*[:\-]\s*(.+)$/i },
];

function dateFromText(value: string) {
  const iso = value.match(/\b(20\d{2}|19\d{2})-(0[1-9]|1[0-2])-([0-2]\d|3[01])\b/)?.[0];
  if (iso && isIsoDate(iso)) return iso;
  const named = value.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+([0-2]?\d|3[01]),\s*(20\d{2}|19\d{2})\b/i
  )?.[0];
  if (!named) return null;
  const parsed = new Date(`${named} 00:00:00 UTC`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
}

/**
 * Local, deterministic extraction for owner-supplied document text. It only
 * recognizes explicitly labeled facts and never transmits medical content.
 */
export function extractHealthDocumentProposals(
  text: string
): ParsedHealthDocumentExtraction {
  const normalized = text.replace(/\r/g, "").slice(0, 250_000);
  const seen = new Set<string>();
  const items: ParsedHealthDocumentExtraction["items"] = [];
  for (const rawLine of normalized.split("\n")) {
    const line = rawLine.replace(/^\s*[•*\-]\s*/, "").trim();
    if (!line || line.length > 2500) continue;
    for (const candidate of labelCategoryPatterns) {
      const match = line.match(candidate.pattern);
      if (!match?.[1]?.trim()) continue;
      const value = match[1].trim();
      const key = `${candidate.category}:${value.toLocaleLowerCase()}`;
      if (seen.has(key)) break;
      seen.add(key);
      items.push({
        category: candidate.category,
        label: line.slice(0, line.indexOf(match[1])).replace(/[:\-\s]+$/, ""),
        value: value.slice(0, 2000),
        occurredOn: dateFromText(line),
        sourceExcerpt: line.slice(0, 1000),
        confidence: 1,
      });
      break;
    }
  }
  return {
    summary: items.length
      ? `${items.length} explicitly labeled item${items.length === 1 ? "" : "s"} found for owner review.`
      : "No explicitly labeled medical facts were found. No permanent records were created.",
    items,
  };
}

export function fingerprintHealthDocument(content: Uint8Array) {
  return createHash("sha256").update(content).digest("hex");
}

function isIsoDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}

export function parseHealthDocumentExtraction(
  value: unknown
): ParsedHealthDocumentExtraction | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.summary !== "string" || !Array.isArray(record.items)) {
    return null;
  }
  const items = record.items.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const proposal = item as Record<string, unknown>;
    if (
      !healthDocumentExtractionCategories.includes(
        proposal.category as HealthDocumentExtractionCategory
      ) ||
      typeof proposal.label !== "string" ||
      !proposal.label.trim() ||
      typeof proposal.value !== "string" ||
      !proposal.value.trim()
    ) {
      return [];
    }
    return [
      {
        category: proposal.category as HealthDocumentExtractionCategory,
        label: proposal.label.trim().slice(0, 200),
        value: proposal.value.trim().slice(0, 2000),
        occurredOn: isIsoDate(proposal.occurred_on)
          ? proposal.occurred_on
          : null,
        sourceExcerpt:
          typeof proposal.source_excerpt === "string" &&
          proposal.source_excerpt.trim()
            ? proposal.source_excerpt.trim().slice(0, 1000)
            : null,
        confidence:
          typeof proposal.confidence === "number" &&
          proposal.confidence >= 0 &&
          proposal.confidence <= 1
            ? proposal.confidence
            : null,
      },
    ];
  });
  return { summary: record.summary.trim().slice(0, 1000), items };
}

export function healthExtractionCategoryRecordKind(
  category: HealthDocumentExtractionCategory
): HealthRecordKind {
  const mapping: Record<HealthDocumentExtractionCategory, HealthRecordKind> = {
    diagnosis: "condition",
    condition: "condition",
    medication: "medication",
    procedure: "procedure",
    provider: "provider",
    appointment: "appointment",
    lab_value: "vital",
    allergy: "profile",
    vaccination: "procedure",
    instruction: "profile",
    date: "profile",
    facility: "provider",
  };
  return mapping[category];
}
