import type { HealthAdvisorRecommendation, HealthDocumentContext } from "./healthAdvisor";
import type { HealthRecord, HealthRecordKind } from "./foundation";
import { healthWorkspaceHrefs } from "./foundation";
import {
  healthKnownSummary,
  healthRecordMissingQuestion,
  isMeaningfulHealthRecord,
} from "./canonicalCoverage";

export type HealthUnderstandingConfidence = "high" | "medium" | "low" | "unknown";
export type HealthUnderstandingState = "known" | "thought" | "needed";

export type HealthUnderstandingArea =
  | "primary-health-concerns"
  | "conditions"
  | "medications"
  | "allergies"
  | "procedures"
  | "providers"
  | "insurance"
  | "family-history"
  | "lifestyle"
  | "health-goals"
  | "appointments"
  | "vaccinations"
  | "lab-records"
  | "working-idea";

export type HealthUnderstandingItem = {
  id: string;
  area: HealthUnderstandingArea;
  label: string;
  state: HealthUnderstandingState;
  confidence: HealthUnderstandingConfidence;
  value?: string;
  evidence: readonly string[];
  question?: string;
  priority: number;
  href?: string;
  why?: string;
  recordId?: string;
};

export type HealthAdvisorUnderstanding = {
  items: readonly HealthUnderstandingItem[];
  whatIKnow: readonly HealthUnderstandingItem[];
  whatIThink: readonly HealthUnderstandingItem[];
  whatIStillNeed: readonly HealthUnderstandingItem[];
};

type UnderstandingDefinition = {
  area: Exclude<HealthUnderstandingArea, "working-idea">;
  label: string;
  priority: number;
  kind: HealthRecordKind;
  topic?: string;
  question: string;
  href: string;
  matches?: (record: HealthRecord) => boolean;
};

const definitions: readonly UnderstandingDefinition[] = [
  {
    area: "primary-health-concerns",
    label: "Primary health concerns",
    priority: 10,
    kind: "profile",
    topic: "health-symptoms-needed",
    question: "What is the main health concern you would like your Health Advisor to understand first?",
    href: healthWorkspaceHrefs.profile,
  },
  {
    area: "conditions",
    label: "Conditions",
    priority: 20,
    kind: "condition",
    question: "Are there any clinician-confirmed conditions or ongoing concerns you want included in your health story?",
    href: healthWorkspaceHrefs.condition,
  },
  {
    area: "medications",
    label: "Current medications",
    priority: 30,
    kind: "medication",
    question: "What would you like me to know about your current medication status? It is okay to say that you do not take any.",
    href: healthWorkspaceHrefs.medication,
  },
  {
    area: "allergies",
    label: "Allergies",
    priority: 40,
    kind: "profile",
    topic: "health-allergies-needed",
    question: "What allergies or sensitivities, if any, would you like me to remember from information you can verify?",
    href: healthWorkspaceHrefs.profile,
  },
  {
    area: "procedures",
    label: "Procedures",
    priority: 50,
    kind: "procedure",
    question: "What past or planned procedures would you like included in your health story?",
    href: healthWorkspaceHrefs.procedure,
  },
  {
    area: "providers",
    label: "Providers",
    priority: 60,
    kind: "provider",
    question: "Which primary care provider, practice, or specialist should I know about for future preparation?",
    href: healthWorkspaceHrefs.provider,
  },
  {
    area: "insurance",
    label: "Insurance",
    priority: 70,
    kind: "profile",
    topic: "health-insurance-needed",
    question: "What insurance or coverage context would help organize care logistics? Do not share member or policy numbers here.",
    href: healthWorkspaceHrefs.profile,
  },
  {
    area: "family-history",
    label: "Family history",
    priority: 80,
    kind: "family_history",
    question: "Is there any family health history you want me to remember, and which relative does it concern?",
    href: healthWorkspaceHrefs.family_history,
  },
  {
    area: "lifestyle",
    label: "Lifestyle",
    priority: 90,
    kind: "lifestyle",
    question: "What should I understand about your sleep, activity, nutrition, or other daily health routines?",
    href: healthWorkspaceHrefs.lifestyle,
  },
  {
    area: "health-goals",
    label: "Health goals",
    priority: 100,
    kind: "profile",
    topic: "health-goals-needed",
    question: "What health-related goal would you like support organizing or discussing with a clinician?",
    href: healthWorkspaceHrefs.profile,
  },
  {
    area: "appointments",
    label: "Upcoming appointments",
    priority: 110,
    kind: "appointment",
    question: "What upcoming appointment should I know about, including the date, provider, and purpose you were given?",
    href: healthWorkspaceHrefs.appointment,
  },
  {
    area: "vaccinations",
    label: "Vaccinations",
    priority: 120,
    kind: "profile",
    topic: "health-vaccination-status-needed",
    question: "What vaccination information would you like organized from a record you can verify?",
    href: healthWorkspaceHrefs.profile,
  },
  {
    area: "lab-records",
    label: "Lab records",
    priority: 130,
    kind: "document",
    topic: "health-lab-records-needed",
    question: "Which lab record would you like to add or organize? I will preserve its source without interpreting the result.",
    href: healthWorkspaceHrefs.document,
    matches: (record) => {
      if (record.recordType !== "document") return false;
      if (record.details.topic === "health-lab-records-needed") return true;
      const documentType = typeof record.details.document_type === "string"
        ? record.details.document_type
        : "";
      return /\b(?:lab|laboratory|test result)\b/i.test(`${record.title} ${documentType}`);
    },
  },
];

const promptIds: Record<Exclude<HealthUnderstandingArea, "working-idea">, string> = {
  "primary-health-concerns": "health-symptoms-needed",
  conditions: "health-conditions-needed",
  medications: "health-medications-needed",
  allergies: "health-allergies-needed",
  procedures: "health-procedures-needed",
  providers: "health-care-team-needed",
  insurance: "health-insurance-needed",
  "family-history": "health-family-history-needed",
  lifestyle: "health-lifestyle-needed",
  "health-goals": "health-goals-needed",
  appointments: "health-appointments-needed",
  vaccinations: "health-vaccination-status-needed",
  "lab-records": "health-lab-records-needed",
};

function active(records: readonly HealthRecord[]) {
  return records.filter((record) => record.status !== "archived");
}

function recordsForDefinition(
  definition: UnderstandingDefinition,
  records: readonly HealthRecord[]
) {
  return records.filter((record) => {
    if (!isMeaningfulHealthRecord(record)) return false;
    if (definition.matches) return definition.matches(record);
    if (record.recordType !== definition.kind) return false;
    return definition.topic ? record.details.topic === definition.topic : true;
  });
}

function evidenceFor(record: HealthRecord) {
  const source = record.source?.trim() || "Owner-entered BeastHealth record";
  return `${source}: ${record.title} (updated ${record.updatedAt.slice(0, 10)})`;
}

function knownItems(
  definition: UnderstandingDefinition,
  records: readonly HealthRecord[]
): HealthUnderstandingItem[] {
  return records.map((record) => ({
    id: `health-known-${definition.area}-${record.id}`,
    area: definition.area,
    label: records.length === 1 ? definition.label : record.title,
    state: "known" as const,
    confidence: "high" as const,
    value: records.length === 1 ? healthKnownSummary(definition.kind, records) : record.title,
    evidence: [evidenceFor(record)],
    priority: definition.priority,
    href: `${definition.href}#health-record-${record.id}`,
    recordId: record.id,
  }));
}

function neededItem(definition: UnderstandingDefinition): HealthUnderstandingItem {
  return {
    id: promptIds[definition.area],
    area: definition.area,
    label: definition.label,
    state: "needed",
    confidence: "unknown",
    evidence: [],
    question: definition.question,
    priority: definition.priority,
  };
}

function recommendationConfidence(
  label: HealthAdvisorRecommendation["confidence"]["label"]
): HealthUnderstandingConfidence {
  return label === "high"
    ? "high"
    : label === "moderate"
      ? "medium"
      : label === "low"
        ? "low"
        : "unknown";
}

export function buildHealthAdvisorUnderstanding(input: {
  records: readonly HealthRecord[];
  recommendations?: readonly HealthAdvisorRecommendation[];
  documents?: readonly HealthDocumentContext[];
}): HealthAdvisorUnderstanding {
  const activeRecords = active(input.records);
  const factualItems = definitions.flatMap((definition) => {
    const matches = recordsForDefinition(definition, activeRecords);
    return matches.length ? knownItems(definition, matches) : [neededItem(definition)];
  });
  const fieldNeeds: HealthUnderstandingItem[] = definitions.flatMap((definition) => {
    const record = recordsForDefinition(definition, activeRecords).find((candidate) =>
      Boolean(healthRecordMissingQuestion(candidate))
    );
    const question = record ? healthRecordMissingQuestion(record) : null;
    if (!record || !question) return [];
    return [{
      id: promptIds[definition.area],
      area: definition.area,
      label: `${definition.label}: ${record.title}`,
      state: "needed" as const,
      confidence: "unknown" as const,
      evidence: [evidenceFor(record)],
      question,
      priority: definition.priority + 1,
      href: definition.href,
    }];
  });
  const documentEvidence = (input.documents || [])
    .filter((document) => /\b(?:lab|laboratory|test result)\b/i.test(document.title))
    .map((document) => `${document.sourceLabel}: ${document.title}`);
  const labIndex = factualItems.findIndex((item) => item.area === "lab-records");
  if (labIndex >= 0 && documentEvidence.length && factualItems[labIndex]?.state === "needed") {
    factualItems[labIndex] = {
      ...factualItems[labIndex],
      state: "known",
      confidence: "high",
      value: `${documentEvidence.length} owner-authorized lab record${documentEvidence.length === 1 ? "" : "s"} available.`,
      evidence: documentEvidence,
      question: undefined,
      href: healthWorkspaceHrefs.document,
    };
  }
  const thinking: HealthUnderstandingItem[] = (input.recommendations || []).map(
    (recommendation, index) => ({
      id: `health-thought-${recommendation.sourceRecommendationId}`,
      area: "working-idea",
      label: recommendation.title,
      state: "thought",
      confidence: recommendationConfidence(recommendation.confidence.label),
      value: `Working idea only — ${recommendation.recommendation}`,
      evidence: recommendation.supportingEvidence.map((evidence) => {
        const source = evidence.source;
        return `Evidence source: ${typeof source === "string" ? source : "saved BeastHealth context"}`;
      }),
      why: `${recommendation.confidence.basis} This is organizational guidance, not a diagnosis or medical fact.`,
      priority: 1000 + index,
      href: recommendation.href,
    })
  );
  const items = [...factualItems, ...fieldNeeds, ...thinking];
  return {
    items,
    whatIKnow: factualItems.filter((item) => item.state === "known"),
    whatIThink: thinking,
    whatIStillNeed: [
      ...factualItems.filter((item) => item.state === "needed"),
      ...fieldNeeds,
    ],
  };
}

export function nextHealthUnderstandingNeed(understanding: HealthAdvisorUnderstanding) {
  return [...understanding.whatIStillNeed].sort(
    (left, right) => left.priority - right.priority
  )[0];
}
