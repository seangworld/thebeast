import {
  healthWorkspaceHrefs,
  type HealthRecord,
  type HealthRecordKind,
} from "./foundation";

export const livingHealthTimelineEventTypes = [
  "condition",
  "medication",
  "procedure",
  "symptom",
  "appointment",
  "hospitalization",
  "lab_result",
  "vaccination",
  "document",
  "provider_visit",
  "health_goal",
  "lifestyle_milestone",
  "physician_conclusion",
  "measurement",
  "family_history",
  "health_profile",
  "provider_record",
] as const;

export type LivingHealthTimelineEventType =
  (typeof livingHealthTimelineEventTypes)[number];

export type LivingHealthTimelineLink = {
  id: string;
  label: string;
  href: string;
  recordType: HealthRecordKind;
};

export type LivingHealthTimelineEvent = {
  id: string;
  eventType: LivingHealthTimelineEventType;
  eventLabel: string;
  title: string;
  date: string;
  dateKey: string;
  status: HealthRecord["status"];
  source: string | null;
  primaryRecord: LivingHealthTimelineLink;
  linkedRecords: readonly LivingHealthTimelineLink[];
  documents: readonly LivingHealthTimelineLink[];
  providers: readonly LivingHealthTimelineLink[];
  conditions: readonly LivingHealthTimelineLink[];
  conversationReferences: readonly string[];
  searchableText: string;
};

const eventLabels: Record<LivingHealthTimelineEventType, string> = {
  condition: "Condition",
  medication: "Medication",
  procedure: "Procedure",
  symptom: "Symptom",
  appointment: "Appointment",
  hospitalization: "Hospitalization",
  lab_result: "Lab result",
  vaccination: "Vaccination",
  document: "Document",
  provider_visit: "Provider visit",
  health_goal: "Health goal",
  lifestyle_milestone: "Lifestyle milestone",
  physician_conclusion: "Physician conclusion",
  measurement: "Measurement",
  family_history: "Family history",
  health_profile: "Health profile",
  provider_record: "Provider record",
};

export function formatLivingHealthEventType(type: LivingHealthTimelineEventType) {
  return eventLabels[type];
}

const detailIdFields = [
  "linked_record_id",
  "linked_record_ids",
  "related_record_id",
  "related_record_ids",
  "condition_id",
  "medication_id",
] as const;
const documentIdFields = ["document_id", "document_ids"] as const;
const providerIdFields = ["provider_id", "provider_ids"] as const;
const conversationIdFields = ["conversation_id", "conversation_ids"] as const;

function detailString(record: HealthRecord, key: string) {
  const value = record.details[key];
  return typeof value === "string" ? value.trim() : "";
}

function splitReferences(value: string) {
  return value
    .split(/[\s,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function references(record: HealthRecord, fields: readonly string[]) {
  return Array.from(
    new Set(fields.flatMap((field) => splitReferences(detailString(record, field))))
  );
}

function dateKey(value: string) {
  return value.slice(0, 10);
}

function recordLink(record: HealthRecord): LivingHealthTimelineLink {
  return {
    id: record.id,
    label: record.title,
    recordType: record.recordType,
    href: `${healthWorkspaceHrefs[record.recordType]}#health-record-${record.id}`,
  };
}

function recordText(record: HealthRecord) {
  return [
    record.title,
    record.source || "",
    record.notes || "",
    ...Object.values(record.details).map((value) => String(value || "")),
  ]
    .join(" ")
    .toLocaleLowerCase();
}

export function classifyLivingHealthEvent(
  record: HealthRecord
): LivingHealthTimelineEventType {
  const topic = detailString(record, "topic");
  const eventType = detailString(record, "event_type");
  const text = `${record.title} ${eventType}`;

  if (
    topic === "health-hospitalization-needed" ||
    eventType === "hospitalization" ||
    /\b(?:hospitalization|hospital admission|inpatient stay)\b/i.test(text)
  ) {
    return "hospitalization";
  }
  if (
    topic === "health-lab-records-needed" ||
    eventType === "lab_result" ||
    /\b(?:lab|laboratory|test result)\b/i.test(text)
  ) {
    return "lab_result";
  }
  if (
    topic === "health-vaccination-status-needed" ||
    eventType === "vaccination" ||
    /\b(?:vaccination|vaccine|immunization)\b/i.test(text)
  ) {
    return "vaccination";
  }
  if (topic === "health-symptoms-needed" || eventType === "symptom") {
    return "symptom";
  }
  if (
    topic === "health-clinician-outcomes-needed" ||
    eventType === "physician_conclusion"
  ) {
    return "physician_conclusion";
  }
  if (topic === "health-goals-needed" || eventType === "health_goal") {
    return "health_goal";
  }
  if (
    topic === "health-provider-visit-needed" ||
    eventType === "provider_visit" ||
    (record.recordType === "appointment" &&
      ["historical", "resolved"].includes(record.status))
  ) {
    return "provider_visit";
  }

  const byKind: Record<HealthRecordKind, LivingHealthTimelineEventType> = {
    profile: "health_profile",
    condition: "condition",
    medication: "medication",
    procedure: "procedure",
    vital: "measurement",
    document: "document",
    lifestyle: "lifestyle_milestone",
    family_history: "family_history",
    provider: "provider_record",
    appointment: "appointment",
  };
  return byKind[record.recordType];
}

function uniqueLinks(links: readonly LivingHealthTimelineLink[]) {
  return Array.from(new Map(links.map((link) => [link.id, link])).values());
}

export function buildLivingHealthTimeline(
  records: readonly HealthRecord[]
): LivingHealthTimelineEvent[] {
  const activeRecords = records.filter((record) => record.status !== "archived");
  const recordsById = new Map(activeRecords.map((record) => [record.id, record]));
  const providers = activeRecords.filter((record) => record.recordType === "provider");
  const conditions = activeRecords.filter((record) => record.recordType === "condition");

  return activeRecords
    .map((record): LivingHealthTimelineEvent => {
      const primaryRecord = recordLink(record);
      const text = recordText(record);
      const explicitLinkedRecords = references(record, detailIdFields)
        .map((id) => recordsById.get(id))
        .filter((item): item is HealthRecord => Boolean(item));
      const inferredProviders = providers.filter(
        (provider) =>
          provider.id !== record.id &&
          provider.title.length >= 3 &&
          text.includes(provider.title.toLocaleLowerCase())
      );
      const inferredConditions = conditions.filter(
        (condition) =>
          condition.id !== record.id &&
          condition.title.length >= 3 &&
          text.includes(condition.title.toLocaleLowerCase())
      );
      const explicitDocuments = references(record, documentIdFields)
        .map((id) => recordsById.get(id))
        .filter(
          (item): item is HealthRecord =>
            Boolean(item) && item?.recordType === "document"
        );
      const explicitProviders = references(record, providerIdFields)
        .map((id) => recordsById.get(id))
        .filter(
          (item): item is HealthRecord =>
            Boolean(item) && item?.recordType === "provider"
        );
      const linkedRecords = uniqueLinks([
        primaryRecord,
        ...explicitLinkedRecords.map(recordLink),
        ...inferredProviders.map(recordLink),
        ...inferredConditions.map(recordLink),
      ]);
      const documentLinks = uniqueLinks([
        ...(record.recordType === "document" ? [primaryRecord] : []),
        ...explicitDocuments.map(recordLink),
      ]);
      const providerLinks = uniqueLinks([
        ...(record.recordType === "provider" ? [primaryRecord] : []),
        ...explicitProviders.map(recordLink),
        ...inferredProviders.map(recordLink),
      ]);
      const conditionLinks = uniqueLinks([
        ...(record.recordType === "condition" ? [primaryRecord] : []),
        ...explicitLinkedRecords
          .filter((item) => item.recordType === "condition")
          .map(recordLink),
        ...inferredConditions.map(recordLink),
      ]);
      const eventType = classifyLivingHealthEvent(record);
      const eventDate = record.occurredOn || record.createdAt;
      const conversationReferences = references(record, conversationIdFields);
      const searchableText = [
        eventLabels[eventType],
        text,
        ...linkedRecords.map((item) => item.label),
        ...conversationReferences,
      ]
        .join(" ")
        .toLocaleLowerCase();

      return {
        id: record.id,
        eventType,
        eventLabel: eventLabels[eventType],
        title: record.title,
        date: eventDate,
        dateKey: dateKey(eventDate),
        status: record.status,
        source: record.source,
        primaryRecord,
        linkedRecords,
        documents: documentLinks,
        providers: providerLinks,
        conditions: conditionLinks,
        conversationReferences,
        searchableText,
      };
    })
    .sort((left, right) =>
      right.date.localeCompare(left.date) || left.title.localeCompare(right.title)
    );
}

export function filterLivingHealthTimeline(
  events: readonly LivingHealthTimelineEvent[],
  input: {
    query?: string;
    eventType?: LivingHealthTimelineEventType | "all";
  }
) {
  const query = input.query?.trim().toLocaleLowerCase() || "";
  return events.filter(
    (event) =>
      (!input.eventType || input.eventType === "all" || event.eventType === input.eventType) &&
      (!query || event.searchableText.includes(query))
  );
}

export function findLivingTimelineDateTarget(
  events: readonly LivingHealthTimelineEvent[],
  targetDate: string
) {
  if (!targetDate || !events.length) return null;
  const exact = events.find((event) => event.dateKey === targetDate);
  if (exact) return exact;
  const target = new Date(`${targetDate}T12:00:00`).getTime();
  if (!Number.isFinite(target)) return null;
  return [...events].sort((left, right) => {
    const leftDistance = Math.abs(
      new Date(`${left.dateKey}T12:00:00`).getTime() - target
    );
    const rightDistance = Math.abs(
      new Date(`${right.dateKey}T12:00:00`).getTime() - target
    );
    return leftDistance - rightDistance;
  })[0] || null;
}
