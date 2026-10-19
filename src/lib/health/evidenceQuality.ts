import type { RuntimeContext } from "../digitalStaffRuntime/types";

type HealthRecordView = {
  id?: string;
  record_type?: string;
  type?: string;
  kind?: string;
  title?: string;
  status?: string;
  occurred_on?: string | null;
  occurredOn?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  source?: string | null;
  details?: Record<string, unknown> | null;
  contextType?: string;
  [key: string]: unknown;
};

export type HealthEvidenceQualityReview = {
  asOf: string | null;
  recordCount: number;
  recordsWithQualityNotes: Array<{
    recordId: string;
    kind: string;
    missingSourceLabel?: true;
    missingEventDate?: true;
    daysSinceRecordUpdate?: number;
  }>;
  potentialDiscrepancies: Array<{
    recordIds: [string, string];
    kind: string;
    fields: string[];
    interpretation: "Unresolved difference; verify against the source record and current clinician or pharmacist guidance.";
  }>;
  omittedQualityNoteCount: number;
};

const medicationFields = ["dose", "dosage", "strength", "frequency", "schedule", "route"] as const;
const conditionFields = ["diagnosis_status", "condition_status", "onset_date", "diagnosis_date"] as const;
const vitalFields = ["value", "measurement_value", "unit", "units"] as const;

function asRecord(value: unknown): HealthRecordView | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as HealthRecordView)
    : null;
}

function validDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString().slice(0, 10) : null;
}

function normalizedText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return null;
  const normalized = String(value).normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
  return normalized || null;
}

function fieldValue(record: HealthRecordView, field: string): string | null {
  const details = asRecord(record.details);
  return normalizedText(record[field] ?? details?.[field]);
}

function kindOf(record: HealthRecordView, domain: string): string {
  const domainParts = domain.split(":");
  const candidate = record.record_type || record.type || record.kind || domainParts[domainParts.length - 1] || "unknown";
  return String(candidate).toLocaleLowerCase();
}

function titleKey(record: HealthRecordView): string {
  return (record.title || "").normalize("NFKC").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function fieldsFor(kind: string): readonly string[] {
  if (kind === "medication") return medicationFields;
  if (kind === "condition") return conditionFields;
  if (kind === "vital" || kind === "measurement") return vitalFields;
  return [];
}

function isClaimContext(record: HealthRecordView): boolean {
  return record.contextType === "member_reported_veteran_claim";
}

function isActive(record: HealthRecordView): boolean {
  return String(record.status || "").toLocaleLowerCase() === "active";
}

function isHealthRecordDomain(domain: string): boolean {
  return domain === "health"
    || domain.startsWith("health:")
    || (domain.startsWith("beasthealth.health-advisor:") && !domain.endsWith(":goals"));
}

/**
 * Produces a compact metadata-only checklist for the Health model. It never
 * decides which record is medically correct and deliberately excludes VCA
 * claim allegations from clinical conflict detection.
 */
export function buildHealthEvidenceQualityReview(
  structuredRecords: RuntimeContext["structuredRecords"],
  asOfValue: string | null | undefined,
): HealthEvidenceQualityReview {
  const asOf = validDate(asOfValue);
  const records = structuredRecords.flatMap((item) => {
    if (!isHealthRecordDomain(item.domain)) return [];
    const record = asRecord(item.record);
    if (!record || isClaimContext(record)) return [];
    return [{ record, domain: item.domain, kind: kindOf(record, item.domain) }];
  });
  const notes = records.flatMap(({ record, kind }) => {
    const recordId = typeof record.id === "string" ? record.id : "";
    if (!recordId) return [];
    const eventDate = validDate(record.occurred_on ?? record.occurredOn);
    const updatedAt = validDate(record.updated_at ?? record.updatedAt);
    const daysSinceRecordUpdate = asOf && updatedAt
      ? Math.max(0, Math.floor((Date.parse(`${asOf}T12:00:00Z`) - Date.parse(`${updatedAt}T12:00:00Z`)) / 86_400_000))
      : undefined;
    const note = {
      recordId,
      kind,
      ...(!normalizedText(record.source) ? { missingSourceLabel: true as const } : {}),
      ...(!eventDate ? { missingEventDate: true as const } : {}),
      ...(daysSinceRecordUpdate === undefined ? {} : { daysSinceRecordUpdate }),
    };
    return note.missingSourceLabel || note.missingEventDate || (daysSinceRecordUpdate !== undefined && daysSinceRecordUpdate >= 365)
      ? [note]
      : [];
  });

  const active = records.filter(({ record }) => isActive(record) && titleKey(record));
  const groups = new Map<string, typeof active>();
  for (const item of active) {
    const key = `${item.kind}:${titleKey(item.record)}`;
    groups.set(key, [...(groups.get(key) || []), item]);
  }
  const potentialDiscrepancies: HealthEvidenceQualityReview["potentialDiscrepancies"] = [];
  for (const [groupKey, items] of Array.from(groups.entries())) {
    const [kind] = groupKey.split(":", 1);
    const comparableFields = fieldsFor(kind);
    if (items.length < 2 || !comparableFields.length) continue;
    for (let leftIndex = 0; leftIndex < items.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < items.length; rightIndex += 1) {
        const left = items[leftIndex];
        const right = items[rightIndex];
        if (typeof left.record.id !== "string" || typeof right.record.id !== "string") continue;
        const leftEventDate = validDate(left.record.occurred_on ?? left.record.occurredOn);
        const rightEventDate = validDate(right.record.occurred_on ?? right.record.occurredOn);
        const eventDatesMatch = leftEventDate !== null && leftEventDate === rightEventDate;
        const fields = comparableFields.filter((field) => {
          if ((kind === "vital" || kind === "measurement") && !eventDatesMatch) return false;
          const first = fieldValue(left.record, field);
          const second = fieldValue(right.record, field);
          return first !== null && second !== null && first !== second;
        });
        if (!fields.length) continue;
        potentialDiscrepancies.push({
          recordIds: [left.record.id, right.record.id],
          kind,
          fields: [...fields],
          interpretation: "Unresolved difference; verify against the source record and current clinician or pharmacist guidance.",
        });
        if (potentialDiscrepancies.length >= 8) break;
      }
      if (potentialDiscrepancies.length >= 8) break;
    }
    if (potentialDiscrepancies.length >= 8) break;
  }

  const maxNotes = 40;
  return {
    asOf,
    recordCount: records.length,
    recordsWithQualityNotes: notes.slice(0, maxNotes),
    potentialDiscrepancies,
    omittedQualityNoteCount: Math.max(0, notes.length - maxNotes),
  };
}
