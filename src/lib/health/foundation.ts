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
  why: string;
  how: string;
  nextStep: string;
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
      "This helps Beast understand your health so it can give you better guidance.",
    why: "Your health background helps put your records, goals, and appointments in context.",
    how: "Beast uses only the information you save to organize your health story and prepare useful questions.",
    nextStep: "Add one thing that would help someone understand your health today. You can skip anything and return later.",
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
      "Tell us about any health conditions you have now or had in the past.",
    why: "Knowing your conditions helps keep related medicines, visits, and records together.",
    how: "Beast organizes what you enter. It does not diagnose a condition or decide what treatment you need.",
    nextStep: "Add one condition you already know about, or review something you saved earlier.",
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
      "List the medicines you take so Beast can understand your health story.",
    why: "A clear medicine list can help you prepare for visits and keep your records organized.",
    how: "Beast stores the name, amount, schedule, and source exactly as you enter them.",
    nextStep: "Add one medicine from a label or prescription, or check that a saved medicine is still correct.",
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
    description: "Keep track of surgeries, treatments, and other procedures you have had or are planning.",
    why: "Dates and details help connect procedures with your doctors, documents, and health timeline.",
    how: "Beast organizes the information you save without deciding what it means medically.",
    nextStep: "Add one procedure you know about, including the date if you have it.",
    singular: "procedure",
    titleLabel: "Procedure",
    detailLabel: "Facility or care context",
    sourceLabel: "Provider or source",
    guidance:
      "Procedure records are organizational only and are not clinical interpretation.",
  },
  vital: {
    kind: "vital",
    title: "Health Measurements",
    description:
      "Keep track of measurements like blood pressure, temperature, weight, or heart rate.",
    why: "Saved dates and units make it easier to bring accurate information to a health visit.",
    how: "Beast shows measurements exactly as you enter them and does not decide whether they are normal.",
    nextStep: "Add one measurement with its date, number, unit, and source.",
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
      "Upload records like visit summaries, lab reports, or vaccination records.",
    why: "Keeping records together makes them easier to find when you prepare for care.",
    how: "Beast can suggest information found in a document, but you review it before anything is added to your health record.",
    nextStep: "Upload one useful health record or review information Beast found in a document.",
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
      "Share everyday habits like sleep, movement, food, and other routines that affect your health story.",
    why: "Daily routines can give useful context for your goals and conversations with a doctor.",
    how: "Beast keeps only what you choose to share and does not turn it into medical advice.",
    nextStep: "Add one routine you want to remember or discuss later.",
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
      "Tell us about health conditions that run in your family, if you know them.",
    why: "Family history can be useful information to bring to a doctor or specialist.",
    how: "Beast records the relative and source you provide without deciding your personal risk.",
    nextStep: "Add one family health detail you know, or skip this area and return later.",
    singular: "family-history record",
    titleLabel: "Condition or health pattern",
    detailLabel: "Relationship and context",
    sourceLabel: "Source",
    guidance:
      "Family history does not establish personal risk, diagnosis, or treatment.",
  },
  provider: {
    kind: "provider",
    title: "Providers",
    description:
      "Tell us about your doctors and specialists.",
    why: "A care-team list helps connect appointments, records, and questions to the right person or office.",
    how: "Beast keeps the names and contact details you enter. It does not verify credentials or insurance coverage.",
    nextStep: "Add your primary doctor, a specialist, or a medical practice you use.",
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
      "Keep track of upcoming visits and appointments from the past.",
    why: "Saving the date, doctor, and purpose helps you prepare records and questions.",
    how: "Beast organizes the visit details you enter; always confirm instructions with the doctor or office.",
    nextStep: "Add your next confirmed appointment or review an earlier visit.",
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
