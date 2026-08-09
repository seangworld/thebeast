import {
  canonicalDisplayFields,
  isStructuredCanonicalValue,
  parseCanonicalFields,
} from "../canonicalKnowledgePresentation";
import type { HealthRecord, HealthRecordKind } from "./foundation";

const genericTitles = new Set([
  "conditions", "current conditions", "medications", "current medications",
  "procedures", "past procedures", "providers", "care team", "family history",
  "lifestyle", "appointments", "allergies", "health profile",
]);

export function healthRecordText(record: HealthRecord) {
  return [record.title, record.notes, record.details.context]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .trim();
}

export function isConfirmedNegativeHealthRecord(record: HealthRecord) {
  return /\b(?:no|none|not taking|do not take|don't take|without)\b/i.test(healthRecordText(record));
}

export function isMeaningfulHealthRecord(record: HealthRecord) {
  if (record.status === "archived") return false;
  if (isConfirmedNegativeHealthRecord(record)) return true;
  if (isStructuredCanonicalValue(record.details)) return true;
  if (
    (record.source === "Health Advisor conversation" ||
      record.source === "Member-reported Health Advisor conversation") &&
    typeof record.details.context === "string" &&
    record.details.context.trim()
  ) return false;
  return !genericTitles.has(record.title.trim().toLowerCase());
}

function has(fields: Record<string, unknown>, ...keys: string[]) {
  return keys.some((key) => {
    const value = fields[key];
    return typeof value === "string" ? Boolean(value.trim()) : value !== null && value !== undefined;
  });
}

export function healthRecordMissingQuestion(record: HealthRecord): string | null {
  if (!isMeaningfulHealthRecord(record) || isConfirmedNegativeHealthRecord(record)) return null;
  const fields = parseCanonicalFields(record.details);
  const name = record.title.trim();
  if (record.recordType === "medication") {
    if (!has(fields, "dose", "dosage")) return `What dose of ${name} do you take?`;
    if (!has(fields, "frequency", "schedule")) return `How often do you take ${name}?`;
  }
  if (record.recordType === "procedure" && !record.occurredOn && !has(fields, "procedureDate", "date", "occurredOn")) {
    return `When did ${name} occur?`;
  }
  if (record.recordType === "provider" && !has(fields, "specialty", "providerType", "role")) {
    return `What type of provider is ${name}?`;
  }
  if (record.recordType === "condition" && !record.occurredOn && !has(fields, "onsetDate", "diagnosisDate", "startDate")) {
    return `When were you first told about ${name}?`;
  }
  return null;
}

export function healthAreaCoverage(kind: HealthRecordKind, records: readonly HealthRecord[]) {
  const relevant = records.filter((record) => record.recordType === kind && isMeaningfulHealthRecord(record));
  if (!relevant.length) return 0;
  if (relevant.some(isConfirmedNegativeHealthRecord)) return 100;
  const complete = relevant.filter((record) => !healthRecordMissingQuestion(record)).length;
  const base = kind === "medication" ? 60 : ["condition", "procedure", "provider"].includes(kind) ? 70 : 100;
  return Math.round(base + (100 - base) * (complete / relevant.length));
}

export function healthKnownSummary(kind: HealthRecordKind, records: readonly HealthRecord[]) {
  const relevant = records.filter((record) => record.recordType === kind && isMeaningfulHealthRecord(record));
  const negative = relevant.find(isConfirmedNegativeHealthRecord);
  if (negative) return `${negative.title.replace(/[.]+$/, "")} — confirmed by member`;
  const names = relevant.slice(0, 3).map((record) => {
    const primary = canonicalDisplayFields(record.details)[0]?.value;
    return primary || record.title;
  });
  return `${relevant.length} saved item${relevant.length === 1 ? "" : "s"}${names.length ? `: ${names.join(", ")}${relevant.length > 3 ? "…" : ""}` : ""}`;
}
