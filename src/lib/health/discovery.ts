import type { HealthRecord, HealthRecordKind } from "./foundation";
import { getPersonalHubSection } from "../platform/personalHub";

export const healthDiscoveryTopicIds = [
  "health-symptoms-needed",
  "health-conditions-needed",
  "health-medications-needed",
  "health-allergies-needed",
  "health-procedures-needed",
  "health-primary-care-needed",
  "health-specialists-needed",
  "health-insurance-needed",
  "health-emergency-contacts",
  "health-family-history-needed",
  "health-lifestyle-needed",
  "health-goals-needed",
  "health-appointments-needed",
  "health-vaccination-status-needed",
] as const;

export type HealthDiscoveryTopicId = (typeof healthDiscoveryTopicIds)[number];
export type HealthDiscoveryCategoryId =
  | "health-profile"
  | "conditions"
  | "medications"
  | "procedures"
  | "care-team"
  | "family-history"
  | "lifestyle"
  | "appointments";

export type HealthDiscoveryTopic = {
  id: HealthDiscoveryTopicId;
  label: string;
  category: HealthDiscoveryCategoryId;
  recordKind?: HealthRecordKind;
  prompt: string;
  href: string;
  source: "beasthealth" | "beastos";
};

export type HealthDiscoveryState = {
  lastTopic: HealthDiscoveryTopicId | null;
  skippedTopics: HealthDiscoveryTopicId[];
};

export type HealthDiscoveryTopicStatus = "complete" | "skipped" | "available" | "unavailable";

export type HealthDiscoveryProgress = {
  topics: Array<HealthDiscoveryTopic & { status: HealthDiscoveryTopicStatus }>;
  categories: Array<{
    id: HealthDiscoveryCategoryId;
    label: string;
    complete: number;
    total: number;
    percent: number;
  }>;
  completed: number;
  total: number;
  percent: number;
  nextTopic: (HealthDiscoveryTopic & { status: HealthDiscoveryTopicStatus }) | null;
};

const emergencyContacts = getPersonalHubSection("emergency-contacts");

export const healthDiscoveryTopics: HealthDiscoveryTopic[] = [
  {
    id: "health-symptoms-needed",
    label: "Primary health concerns",
    category: "health-profile",
    recordKind: "profile",
    prompt: "What is the main health concern you would like your Health Advisor to understand first? Share only what you are comfortable saving.",
    href: "/dashboard/health/ai-advisor",
    source: "beasthealth",
  },
  {
    id: "health-conditions-needed",
    label: "Current conditions",
    category: "conditions",
    recordKind: "condition",
    prompt: "Are there any clinician-confirmed conditions or ongoing concerns you want included in your health story?",
    href: "/dashboard/health/ai-advisor",
    source: "beasthealth",
  },
  {
    id: "health-medications-needed",
    label: "Current medications",
    category: "medications",
    recordKind: "medication",
    prompt: "What would you like me to know about your current medication status? It is okay to say that you do not take any.",
    href: "/dashboard/health/ai-advisor",
    source: "beasthealth",
  },
  {
    id: "health-allergies-needed",
    label: "Allergies",
    category: "health-profile",
    recordKind: "profile",
    prompt: "What allergies or sensitivities, if any, would you like me to remember? Share only what you know from your records or care team.",
    href: "/dashboard/health/ai-advisor",
    source: "beasthealth",
  },
  {
    id: "health-procedures-needed",
    label: "Past procedures",
    category: "procedures",
    recordKind: "procedure",
    prompt: "What past or planned procedures would you like included in your health story?",
    href: "/dashboard/health/ai-advisor",
    source: "beasthealth",
  },
  {
    id: "health-primary-care-needed",
    label: "Primary care provider",
    category: "care-team",
    recordKind: "provider",
    prompt: "Who is your primary care provider or practice, if you have one?",
    href: "/dashboard/health/ai-advisor",
    source: "beasthealth",
  },
  {
    id: "health-specialists-needed",
    label: "Specialists",
    category: "care-team",
    recordKind: "provider",
    prompt: "Which specialists or specialty practices should I know about for future appointment preparation?",
    href: "/dashboard/health/ai-advisor",
    source: "beasthealth",
  },
  {
    id: "health-insurance-needed",
    label: "Insurance",
    category: "health-profile",
    recordKind: "profile",
    prompt: "What insurance or coverage context would help with care logistics? Do not share member or policy numbers here.",
    href: "/dashboard/health/ai-advisor",
    source: "beasthealth",
  },
  {
    id: "health-emergency-contacts",
    label: "Emergency contacts",
    category: "health-profile",
    prompt: emergencyContacts?.description || "Emergency contacts are managed by BeastOS.",
    href: emergencyContacts?.href || "/dashboard/settings#emergency-contacts",
    source: "beastos",
  },
  {
    id: "health-family-history-needed",
    label: "Family history",
    category: "family-history",
    recordKind: "family_history",
    prompt: "Is there any family health history you want me to remember, and which relative does it concern?",
    href: "/dashboard/health/ai-advisor",
    source: "beasthealth",
  },
  {
    id: "health-lifestyle-needed",
    label: "Lifestyle",
    category: "lifestyle",
    recordKind: "lifestyle",
    prompt: "What should I understand about your sleep, activity, nutrition, or other daily health routines?",
    href: "/dashboard/health/ai-advisor",
    source: "beasthealth",
  },
  {
    id: "health-goals-needed",
    label: "Health goals",
    category: "health-profile",
    recordKind: "profile",
    prompt: "What health-related goal would you like support organizing or discussing with a clinician?",
    href: "/dashboard/health/ai-advisor",
    source: "beasthealth",
  },
  {
    id: "health-appointments-needed",
    label: "Upcoming appointments",
    category: "appointments",
    recordKind: "appointment",
    prompt: "What upcoming appointment should I know about, including the date, provider, and purpose you were given?",
    href: "/dashboard/health/ai-advisor",
    source: "beasthealth",
  },
  {
    id: "health-vaccination-status-needed",
    label: "Vaccination status",
    category: "health-profile",
    recordKind: "profile",
    prompt: "What vaccination information would you like organized from a record you can verify? It is okay to return to this later.",
    href: "/dashboard/health/ai-advisor",
    source: "beasthealth",
  },
];

const categoryLabels: Record<HealthDiscoveryCategoryId, string> = {
  "health-profile": "Health Profile",
  conditions: "Conditions",
  medications: "Medications",
  procedures: "Procedures",
  "care-team": "Care Team",
  "family-history": "Family History",
  lifestyle: "Lifestyle",
  appointments: "Appointments",
};

export function isHealthDiscoveryTopicId(value: unknown): value is HealthDiscoveryTopicId {
  return typeof value === "string" && healthDiscoveryTopicIds.includes(value as HealthDiscoveryTopicId);
}

export function normalizeHealthDiscoveryState(value: unknown): HealthDiscoveryState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { lastTopic: null, skippedTopics: [] };
  }
  const row = value as { last_topic?: unknown; skipped_topics?: unknown };
  return {
    lastTopic: isHealthDiscoveryTopicId(row.last_topic) ? row.last_topic : null,
    skippedTopics: Array.isArray(row.skipped_topics)
      ? Array.from(new Set(row.skipped_topics.filter(isHealthDiscoveryTopicId)))
      : [],
  };
}

function topicHasRecord(topic: HealthDiscoveryTopic, records: readonly HealthRecord[]) {
  if (!topic.recordKind) return false;
  return records.some((record) => {
    if (record.status === "archived" || record.recordType !== topic.recordKind) return false;
    if (["condition", "medication", "procedure", "family_history", "lifestyle", "appointment"].includes(topic.recordKind!)) {
      return true;
    }
    return record.details.topic === topic.id;
  });
}

export function buildHealthDiscoveryProgress(
  records: readonly HealthRecord[],
  state: HealthDiscoveryState
): HealthDiscoveryProgress {
  const topics = healthDiscoveryTopics.map((topic) => {
    const status: HealthDiscoveryTopicStatus =
      topic.source === "beastos" && emergencyContacts?.availability !== "available"
        ? "unavailable"
        : topicHasRecord(topic, records)
          ? "complete"
          : state.skippedTopics.includes(topic.id)
            ? "skipped"
            : "available";
    return { ...topic, status };
  });
  const availableTopics = topics.filter((topic) => topic.status !== "unavailable");
  const completed = availableTopics.filter((topic) => topic.status === "complete").length;
  const categories = (Object.keys(categoryLabels) as HealthDiscoveryCategoryId[]).map((id) => {
    const categoryTopics = topics.filter((topic) => topic.category === id && topic.status !== "unavailable");
    const complete = categoryTopics.filter((topic) => topic.status === "complete").length;
    return {
      id,
      label: categoryLabels[id],
      complete,
      total: categoryTopics.length,
      percent: categoryTopics.length ? Math.round((complete / categoryTopics.length) * 100) : 0,
    };
  });
  const resumable = topics.filter((topic) => topic.status === "available");
  const nextTopic =
    resumable.find((topic) => topic.id === state.lastTopic) ||
    resumable[0] ||
    topics.find((topic) => topic.status === "skipped") ||
    null;
  return {
    topics,
    categories,
    completed,
    total: availableTopics.length,
    percent: availableTopics.length ? Math.round((completed / availableTopics.length) * 100) : 0,
    nextTopic,
  };
}

export function buildHealthDiscoveryConversationHref(topic: HealthDiscoveryTopic) {
  const parameters = new URLSearchParams({ topic: topic.id, prompt: topic.prompt });
  return `${topic.href}?${parameters.toString()}`;
}
