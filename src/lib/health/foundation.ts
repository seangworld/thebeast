export const healthAdvisorProfessionalId = "beasthealth.health-advisor";

export const healthRecordKinds = [
  "profile",
  "condition",
  "medication",
  "procedure",
  "vital",
  "document",
  "lifestyle",
  "family_history",
  "provider",
  "appointment",
] as const;

export type HealthRecordKind = (typeof healthRecordKinds)[number];
export type HealthRecordStatus =
  | "active"
  | "historical"
  | "resolved"
  | "planned"
  | "archived";

export type HealthRecord = {
  id: string;
  ownerId: string;
  recordType: HealthRecordKind;
  title: string;
  status: HealthRecordStatus;
  occurredOn: string | null;
  source: string | null;
  details: Record<string, string | number | boolean | null>;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HealthRecordRow = {
  id: string;
  owner_id: string;
  record_type: string;
  title: string;
  status: string;
  occurred_on: string | null;
  source: string | null;
  details: unknown;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type HealthWorkspaceDefinition = {
  kind: HealthRecordKind;
  title: string;
  description: string;
  singular: string;
  titleLabel: string;
  detailLabel: string;
  sourceLabel: string;
  guidance: string;
};

export const healthWorkspaceDefinitions: Record<
  HealthRecordKind,
  HealthWorkspaceDefinition
> = {
  profile: {
    kind: "profile",
    title: "Health Profile",
    description:
      "Owner-controlled health background and care preferences without duplicating BeastOS identity.",
    singular: "profile item",
    titleLabel: "Profile item",
    detailLabel: "Value or context",
    sourceLabel: "Source or care contact",
    guidance:
      "Use this for health context you choose to maintain. Shared identity remains in BeastOS Personal Hub.",
  },
  condition: {
    kind: "condition",
    title: "Conditions",
    description:
      "A personal record of conditions and status—not a diagnostic system.",
    singular: "condition",
    titleLabel: "Condition name",
    detailLabel: "Care context",
    sourceLabel: "Clinician or source",
    guidance:
      "Record only information you know. BeastHealth does not diagnose or determine treatment.",
  },
  medication: {
    kind: "medication",
    title: "Medications",
    description:
      "Medication, dose, schedule, and status records under owner control.",
    singular: "medication",
    titleLabel: "Medication name",
    detailLabel: "Dose and schedule",
    sourceLabel: "Prescriber or pharmacy",
    guidance:
      "This record does not check interactions or tell you to start, stop, or change medication.",
  },
  procedure: {
    kind: "procedure",
    title: "Procedures",
    description: "Procedure history, dates, providers, and recovery context.",
    singular: "procedure",
    titleLabel: "Procedure",
    detailLabel: "Facility or care context",
    sourceLabel: "Provider or source",
    guidance:
      "Procedure records are organizational only and are not clinical interpretation.",
  },
  vital: {
    kind: "vital",
    title: "Vitals",
    description:
      "Dated measurements recorded exactly as entered, without clinical interpretation.",
    singular: "measurement",
    titleLabel: "Measurement type",
    detailLabel: "Value and unit",
    sourceLabel: "Device, office, or source",
    guidance:
      "BeastHealth does not determine whether a measurement is normal or provide emergency guidance.",
  },
  document: {
    kind: "document",
    title: "Documents",
    description:
      "Health-specific references to records managed through BeastOS Documents.",
    singular: "document reference",
    titleLabel: "Document label",
    detailLabel: "Document type or reference",
    sourceLabel: "Provider or source",
    guidance:
      "Document extraction creates review proposals only. Nothing becomes a permanent health record until the owner approves it, and BeastHealth does not interpret clinical meaning.",
  },
  lifestyle: {
    kind: "lifestyle",
    title: "Lifestyle",
    description:
      "Owner-entered sleep, movement, nutrition, and wellness context.",
    singular: "lifestyle record",
    titleLabel: "Habit or context",
    detailLabel: "Cadence or details",
    sourceLabel: "Source",
    guidance:
      "Lifestyle records are personal context, not coaching or a medical recommendation.",
  },
  family_history: {
    kind: "family_history",
    title: "Family History",
    description:
      "Sensitive family health context with explicit relationship provenance.",
    singular: "family-history record",
    titleLabel: "Condition or health pattern",
    detailLabel: "Relationship and context",
    sourceLabel: "Source",
    guidance:
      "Family history does not establish personal risk, diagnosis, or treatment.",
  },
  provider: {
    kind: "provider",
    title: "Provider Directory",
    description:
      "A private directory of care providers and contact context.",
    singular: "provider",
    titleLabel: "Provider or practice",
    detailLabel: "Specialty and contact details",
    sourceLabel: "Directory source",
    guidance:
      "Directory entries are owner-maintained and do not verify credentials, availability, or network participation.",
  },
  appointment: {
    kind: "appointment",
    title: "Appointments",
    description:
      "Upcoming and historical care appointments with owner-entered preparation context.",
    singular: "appointment",
    titleLabel: "Appointment or visit",
    detailLabel: "Purpose and preparation context",
    sourceLabel: "Provider, office, or source",
    guidance:
      "Confirm dates, locations, and instructions with the provider. BeastHealth does not determine clinical priorities.",
  },
};

export const healthWorkspaceHrefs: Record<HealthRecordKind, string> = {
  profile: "/dashboard/health/profile",
  condition: "/dashboard/health/conditions",
  medication: "/dashboard/health/medications",
  procedure: "/dashboard/health/procedures",
  vital: "/dashboard/health/vitals",
  document: "/dashboard/health/documents",
  lifestyle: "/dashboard/health/lifestyle",
  family_history: "/dashboard/health/family-history",
  provider: "/dashboard/health/provider-directory",
  appointment: "/dashboard/health/appointments",
};

function isHealthRecordKind(value: string): value is HealthRecordKind {
  return healthRecordKinds.includes(value as HealthRecordKind);
}

function isHealthRecordStatus(value: string): value is HealthRecordStatus {
  return ["active", "historical", "resolved", "planned", "archived"].includes(
    value
  );
}

function normalizeDetails(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) =>
      item === null ||
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean"
    )
  );
}

export function normalizeHealthRecord(row: HealthRecordRow): HealthRecord | null {
  if (
    !row.id ||
    !row.owner_id ||
    !isHealthRecordKind(row.record_type) ||
    !isHealthRecordStatus(row.status) ||
    !row.title?.trim() ||
    !row.created_at ||
    !row.updated_at
  ) {
    return null;
  }
  return {
    id: row.id,
    ownerId: row.owner_id,
    recordType: row.record_type,
    title: row.title.trim(),
    status: row.status,
    occurredOn: row.occurred_on || null,
    source: row.source?.trim() || null,
    details: normalizeDetails(row.details),
    notes: row.notes?.trim() || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function buildHealthOverview(records: readonly HealthRecord[]) {
  const visible = records.filter((record) => record.status !== "archived");
  const counts = Object.fromEntries(
    healthRecordKinds.map((kind) => [
      kind,
      visible.filter((record) => record.recordType === kind).length,
    ])
  ) as Record<HealthRecordKind, number>;
  const populatedSections = healthRecordKinds.filter((kind) => counts[kind] > 0);
  return {
    counts,
    totalRecords: visible.length,
    populatedSections,
    lastUpdatedAt:
      [...visible].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
        ?.updatedAt || null,
  };
}

export function buildHealthTimeline(records: readonly HealthRecord[]) {
  return records
    .filter((record) => record.status !== "archived")
    .map((record) => ({
      id: record.id,
      recordType: record.recordType,
      title: record.title,
      status: record.status,
      date: record.occurredOn || record.createdAt,
      source: record.source,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const healthAdvisorReadiness = {
  professionalId: healthAdvisorProfessionalId,
  status: "active" as const,
  active: true,
  executionEnabled: true,
  recommendationHistoryEnabled: true,
  confidenceEnabled: true,
  outcomeLearningEnabled: true,
  preparedCapabilities: [
    "Owner-scoped health record context",
    "Source and date provenance",
    "Existing Execution History foundation",
    "Permissioned BeastDocuments summaries",
    "Existing recommendation lifecycle and confidence contracts",
    "Member-reported outcome-learning contract",
  ],
  limitations: [
    "No diagnosis, treatment, medication change, clinical interpretation, or emergency guidance is provided.",
    "Recommendations are limited to record review and appointment preparation.",
    "Execution History records decisions and outcomes; it does not execute clinical actions.",
  ],
};
