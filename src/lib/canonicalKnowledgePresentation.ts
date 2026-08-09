type DisplayField = { label: string; value: string };

const hiddenKeys = new Set([
  "confidence",
  "context",
  "conversation_message_id",
  "entitytype",
  "linkedappointmentid",
  "linkeddocumentid",
  "proposalid",
  "provenance",
  "reconciliation",
  "sourcemessageid",
  "subtype",
]);

const labels: Record<string, string> = {
  attendanceend: "Attendance ended",
  attendancestart: "Attendance started",
  certificationname: "Certification",
  completiondate: "Completion date",
  condition: "Condition",
  diagnosisdate: "Diagnosis date",
  dose: "Dose",
  dosage: "Dose",
  enddate: "End date",
  expirationdate: "Expiration date",
  frequency: "Frequency",
  gpa: "GPA",
  graduationdate: "Graduation date",
  graduationyear: "Graduation year",
  institution: "Institution",
  institutiontype: "Institution type",
  location: "Location",
  medicationname: "Medication",
  prescriber: "Prescriber",
  purpose: "Purpose",
  renewaldate: "Renewal date",
  startdate: "Start date",
  supplementname: "Supplement",
  treatment: "Treatment",
};

function normalizedKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, "").toLowerCase();
}

function sentenceCase(key: string) {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return spaced ? `${spaced[0].toUpperCase()}${spaced.slice(1)}` : "Detail";
}

function displayValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    const values = value.map(displayValue).filter((item): item is string => Boolean(item));
    return values.length ? values.join(", ") : null;
  }
  return null;
}

export function parseCanonicalFields(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function canonicalDisplayFields(value: unknown): DisplayField[] {
  return Object.entries(parseCanonicalFields(value)).flatMap(([key, rawValue]) => {
    const normalized = normalizedKey(key);
    if (hiddenKeys.has(normalized)) return [];
    const shown = displayValue(rawValue);
    if (!shown) return [];
    return [{ label: labels[normalized] || sentenceCase(key), value: shown }];
  });
}

export function canonicalPrimaryValue(value: unknown, fallback: string) {
  const fields = parseCanonicalFields(value);
  for (const key of [
    "institution",
    "schoolName",
    "certificationName",
    "certificate",
    "medicationName",
    "supplementName",
    "condition",
    "employer",
    "role",
    "preference",
    "name",
    "title",
  ]) {
    const shown = displayValue(fields[key]);
    if (shown) return shown;
  }
  return fallback;
}

export function canonicalMissingActions(entityType: string, value: unknown) {
  const fields = parseCanonicalFields(value);
  const normalized = entityType.toLowerCase();
  const required = /medication|supplement/.test(normalized)
    ? [["dose", "dosage", "Add dosage"], ["frequency", "schedule", "Add frequency"]]
    : /condition|diagnos/.test(normalized)
      ? [["diagnosisDate", "onsetDate", "Add diagnosis date"]]
      : [];
  return required.flatMap(([first, second, action]) =>
    displayValue(fields[first]) || displayValue(fields[second]) ? [] : [action]
  );
}

export function isStructuredCanonicalValue(value: unknown) {
  return Object.keys(parseCanonicalFields(value)).some((key) => {
    const normalized = normalizedKey(key);
    return !hiddenKeys.has(normalized) && !["context", "topic", "linkeddocumentid", "linkedappointmentid"].includes(normalized);
  });
}

export function preferStructuredCanonicalRecords<T>(
  records: readonly T[],
  options: {
    category: (record: T) => string;
    value: (record: T) => unknown;
    isLegacyAggregate: (record: T) => boolean;
  }
) {
  const structuredCategories = new Set(
    records
      .filter((record) => isStructuredCanonicalValue(options.value(record)))
      .map(options.category)
  );
  return records.filter(
    (record) =>
      !structuredCategories.has(options.category(record)) ||
      isStructuredCanonicalValue(options.value(record)) ||
      !options.isLegacyAggregate(record)
  );
}
