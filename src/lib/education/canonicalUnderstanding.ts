import {
  canonicalDisplayFields,
  canonicalMissingActions,
  canonicalPrimaryValue,
  isStructuredCanonicalValue,
  parseCanonicalFields,
} from "../canonicalKnowledgePresentation";
import type { GuidanceUnderstandingItem } from "./guidanceUnderstanding";

export type EducationCanonicalRecord = {
  id: string;
  category: string;
  label: string;
  value: unknown;
  verification_status?: string | null;
};

const areas: Record<string, { area: GuidanceUnderstandingItem["area"]; label: string }> = {
  school: { area: "schools", label: "Schools" },
  degree: { area: "degrees", label: "Degrees" },
  certification: { area: "certifications", label: "Certifications" },
  license: { area: "certifications", label: "Certifications" },
  military: { area: "military-training", label: "Military experience" },
  military_service: { area: "military-training", label: "Military experience" },
  employment: { area: "experience", label: "Employment" },
  education_preference: { area: "learning-style", label: "Education preferences" },
};

export function buildCanonicalEducationUnderstanding(records: readonly EducationCanonicalRecord[]) {
  const structured = records.filter((record) => isStructuredCanonicalValue(record.value) && areas[record.category]);
  const grouped = new Map<string, EducationCanonicalRecord[]>();
  for (const record of structured) grouped.set(record.category, [...(grouped.get(record.category) || []), record]);
  const known: GuidanceUnderstandingItem[] = [];
  const needed: GuidanceUnderstandingItem[] = [];
  let priority = 40;
  for (const [category, categoryRecords] of Array.from(grouped.entries())) {
    const definition = areas[category];
    if (!definition) continue;
    const names = categoryRecords.map((record) => canonicalPrimaryValue(record.value, record.label));
    known.push({
      area: definition.area,
      label: definition.label,
      state: "known",
      confidence: "high",
      value: `${categoryRecords.length} saved item${categoryRecords.length === 1 ? "" : "s"}: ${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""}`,
      evidence: categoryRecords.map((record) => `${record.verification_status === "verified" ? "Verified" : "Member reported"}: ${canonicalPrimaryValue(record.value, record.label)}`),
      priority: priority++,
    });
    const firstMissing = categoryRecords.find((record) => canonicalMissingActions(String(parseCanonicalFields(record.value).entityType || category), record.value).length);
    if (firstMissing) {
      const action = canonicalMissingActions(String(parseCanonicalFields(firstMissing.value).entityType || category), firstMissing.value)[0];
      needed.push({
        area: definition.area,
        label: `${definition.label}: ${canonicalPrimaryValue(firstMissing.value, firstMissing.label)}`,
        state: "needed",
        confidence: "unknown",
        question: `${action} for ${canonicalPrimaryValue(firstMissing.value, firstMissing.label)}.`,
        evidence: canonicalDisplayFields(firstMissing.value).map((field) => `${field.label}: ${field.value}`),
        priority: priority++,
      });
    }
  }
  return { known, needed };
}
