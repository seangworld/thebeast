import {
  buildGuidanceCounselorUnderstanding,
  type GuidanceUnderstandingConfidence,
} from "./education/guidanceUnderstanding";
import type { GuidanceDiscoveryProfile } from "./education/discoveryConversation";

export type BeastAdminKnowledgeConfidence =
  | GuidanceUnderstandingConfidence
  | "low"
  | "not-recorded";

export type BeastAdminKnowledgeMember = {
  id: string;
  displayName: string;
  email: string | null;
  role: string;
};

export type BeastAdminKnowledgeMemory = {
  id: string;
  professionalId: string;
  scope: "turn" | "thread" | "agent" | "user";
  key: string;
  value: unknown;
  purpose: string;
  evidence: unknown[];
  sourceConversationId: string | null;
  sourceMessageId: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BeastAdminKnowledgeFollowUp = {
  id: string;
  professionalId: string;
  question: string;
  conversationTitle: string;
  updatedAt: string;
};

export type BeastAdminKnowledgeProfile = GuidanceDiscoveryProfile & {
  updatedAt: string;
};

export type BeastAdminKnowledgeSourceSnapshot = {
  member: BeastAdminKnowledgeMember;
  educationProfile: BeastAdminKnowledgeProfile | null;
  memories: BeastAdminKnowledgeMemory[];
  conversationFollowUps: BeastAdminKnowledgeFollowUp[];
};

export type BeastAdminKnowledgeItem = {
  id: string;
  label: string;
  value: string;
  confidence: BeastAdminKnowledgeConfidence;
  confidenceBasis: string;
  professionalId: string;
  source: "education-profile" | "professional-memory";
  evidence: string[];
  updatedAt: string;
};

export type BeastAdminOutstandingQuestion = {
  id: string;
  question: string;
  professionalId: string;
  source: "education-intake" | "conversation-follow-up";
  updatedAt: string | null;
};

export type BeastAdminCrossModuleContext = {
  id: string;
  professionalId: string;
  label: string;
  value: string;
  scope: BeastAdminKnowledgeMemory["scope"];
  purpose: string;
  updatedAt: string;
};

export type BeastAdminKnowledgeInspector = {
  member: BeastAdminKnowledgeMember;
  knownFacts: BeastAdminKnowledgeItem[];
  workingHypotheses: BeastAdminKnowledgeItem[];
  outstandingQuestions: BeastAdminOutstandingQuestion[];
  crossModuleContext: BeastAdminCrossModuleContext[];
  memoryHistory: BeastAdminKnowledgeMemory[];
  professionals: string[];
  coverage: {
    educationProfile: "available" | "empty";
    professionalMemory: "available" | "empty";
    crossModuleUnderstanding: "persisted-memory-only";
  };
};

const memoryScopes = ["turn", "thread", "agent", "user"] as const;
const confidenceValues = ["high", "medium", "low"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function strings(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function optionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function normalizeMember(value: unknown): BeastAdminKnowledgeMember | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.displayName !== "string" ||
    typeof value.role !== "string" ||
    (value.email !== null && typeof value.email !== "string")
  ) {
    return null;
  }
  return {
    id: value.id,
    displayName: value.displayName.trim() || "Member",
    email: value.email,
    role: value.role,
  };
}

function normalizeProfile(value: unknown): BeastAdminKnowledgeProfile | null {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    typeof value.goal !== "string" ||
    typeof value.currentSituation !== "string" ||
    typeof value.strengths !== "string" ||
    typeof value.growthAreas !== "string" ||
    typeof value.constraints !== "string" ||
    typeof value.weeklyHours !== "number" ||
    !Number.isFinite(value.weeklyHours) ||
    typeof value.availableStudyTimeKnown !== "boolean" ||
    (value.collegeInterest !== null &&
      typeof value.collegeInterest !== "boolean") ||
    (value.tradeInterest !== null && typeof value.tradeInterest !== "boolean") ||
    typeof value.currentEmployment !== "string" ||
    typeof value.militaryExperience !== "string" ||
    typeof value.otherEducationalContext !== "string" ||
    !isDate(value.updatedAt)
  ) {
    return null;
  }

  const listFields = [
    "selectedProviders",
    "careerInterests",
    "educationalGoals",
    "learningPreferences",
    "certifications",
  ] as const;
  if (
    listFields.some(
      (field) =>
        !Array.isArray(value[field]) ||
        strings(value[field]).length !== value[field].length
    )
  ) {
    return null;
  }

  return {
    goal: value.goal,
    currentSituation: value.currentSituation,
    strengths: value.strengths,
    growthAreas: value.growthAreas,
    constraints: value.constraints,
    weeklyHours: value.weeklyHours,
    availableStudyTimeKnown: value.availableStudyTimeKnown,
    selectedProviders: strings(value.selectedProviders) as GuidanceDiscoveryProfile["selectedProviders"],
    careerInterests: strings(value.careerInterests),
    educationalGoals: strings(value.educationalGoals),
    learningPreferences: strings(value.learningPreferences),
    certifications: strings(value.certifications),
    collegeInterest: value.collegeInterest,
    tradeInterest: value.tradeInterest,
    currentEmployment: value.currentEmployment,
    militaryExperience: value.militaryExperience,
    otherEducationalContext: value.otherEducationalContext,
    educationHistory: strings(value.educationHistory),
    militaryTraining: strings(value.militaryTraining),
    schools: strings(value.schools),
    degrees: strings(value.degrees),
    experience: strings(value.experience),
    skills: strings(value.skills),
    educationBudget:
      typeof value.educationBudget === "string" ? value.educationBudget : "",
    giBill: typeof value.giBill === "boolean" ? value.giBill : null,
    vre: typeof value.vre === "boolean" ? value.vre : null,
    employerReimbursement:
      typeof value.employerReimbursement === "boolean"
        ? value.employerReimbursement
        : null,
    scholarshipInterest:
      typeof value.scholarshipInterest === "boolean"
        ? value.scholarshipInterest
        : null,
    targetTimeline:
      typeof value.targetTimeline === "string" ? value.targetTimeline : "",
    discoveryAnswers: isRecord(value.discoveryAnswers)
      ? value.discoveryAnswers
      : {},
    updatedAt: value.updatedAt,
  };
}

function normalizeMemories(value: unknown): BeastAdminKnowledgeMemory[] | null {
  if (!Array.isArray(value)) return null;
  const memories = value.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.professionalId !== "string" ||
      !memoryScopes.includes(item.scope as BeastAdminKnowledgeMemory["scope"]) ||
      typeof item.key !== "string" ||
      typeof item.purpose !== "string" ||
      !Array.isArray(item.evidence) ||
      (item.sourceConversationId !== null &&
        typeof item.sourceConversationId !== "string") ||
      (item.sourceMessageId !== null &&
        typeof item.sourceMessageId !== "string") ||
      (item.expiresAt !== null && !isDate(item.expiresAt)) ||
      !isDate(item.createdAt) ||
      !isDate(item.updatedAt)
    ) {
      return [];
    }
    return [
      {
        id: item.id,
        professionalId: item.professionalId,
        scope: item.scope as BeastAdminKnowledgeMemory["scope"],
        key: item.key,
        value: item.value,
        purpose: item.purpose,
        evidence: item.evidence,
        sourceConversationId: item.sourceConversationId,
        sourceMessageId: item.sourceMessageId,
        expiresAt: item.expiresAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    ];
  });
  return memories.length === value.length ? memories : null;
}

function normalizeFollowUps(value: unknown): BeastAdminKnowledgeFollowUp[] | null {
  if (!Array.isArray(value)) return null;
  const followUps = value.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      typeof item.professionalId !== "string" ||
      typeof item.question !== "string" ||
      typeof item.conversationTitle !== "string" ||
      !isDate(item.updatedAt)
    ) {
      return [];
    }
    return [
      {
        id: item.id,
        professionalId: item.professionalId,
        question: item.question,
        conversationTitle: item.conversationTitle,
        updatedAt: item.updatedAt,
      },
    ];
  });
  return followUps.length === value.length ? followUps : null;
}

export function normalizeBeastAdminKnowledgeSourceSnapshot(
  value: unknown
): BeastAdminKnowledgeSourceSnapshot | null {
  if (!isRecord(value)) return null;
  const member = normalizeMember(value.member);
  const educationProfile = normalizeProfile(value.educationProfile);
  const memories = normalizeMemories(value.memories);
  const conversationFollowUps = normalizeFollowUps(
    value.conversationFollowUps
  );
  if (
    !member ||
    (value.educationProfile !== null && !educationProfile) ||
    !memories ||
    !conversationFollowUps
  ) {
    return null;
  }
  return { member, educationProfile, memories, conversationFollowUps };
}

function memoryValueText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (!isRecord(value)) return "";
  for (const field of [
    "content",
    "goal",
    "currentObjective",
    "currentSituation",
    "constraints",
  ]) {
    const candidate = value[field];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  for (const field of [
    "educationalGoals",
    "careerInterests",
    "goals",
  ]) {
    const candidate = strings(value[field]);
    if (candidate.length) return candidate.join(", ");
  }
  return "";
}

function memoryConfidence(value: unknown): BeastAdminKnowledgeConfidence {
  if (!isRecord(value)) return "not-recorded";
  return confidenceValues.includes(
    value.confidence as (typeof confidenceValues)[number]
  )
    ? (value.confidence as (typeof confidenceValues)[number])
    : "not-recorded";
}

function humanizeKey(value: string) {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizedFingerprint(label: string, value: string) {
  return `${label}:${value}`.toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ");
}

export function buildBeastAdminKnowledgeInspector(
  source: BeastAdminKnowledgeSourceSnapshot
): BeastAdminKnowledgeInspector {
  const knownFacts: BeastAdminKnowledgeItem[] = [];
  const workingHypotheses: BeastAdminKnowledgeItem[] = [];
  const outstandingQuestions: BeastAdminOutstandingQuestion[] = [];

  if (source.educationProfile) {
    const understanding = buildGuidanceCounselorUnderstanding(
      source.educationProfile
    );
    for (const item of understanding.whatIKnow) {
      knownFacts.push({
        id: `education-known-${item.area}`,
        label: item.label,
        value: item.value || "",
        confidence: item.confidence,
        confidenceBasis: item.evidence.join("; "),
        professionalId: "beasteducation.guidance-counselor",
        source: "education-profile",
        evidence: [...item.evidence],
        updatedAt: source.educationProfile.updatedAt,
      });
    }
    for (const item of understanding.whatIThink) {
      workingHypotheses.push({
        id: `education-thought-${item.area}`,
        label: item.label,
        value: item.value || "",
        confidence: item.confidence,
        confidenceBasis: item.evidence.join("; "),
        professionalId: "beasteducation.guidance-counselor",
        source: "education-profile",
        evidence: [...item.evidence],
        updatedAt: source.educationProfile.updatedAt,
      });
    }
    for (const item of understanding.whatIStillNeed) {
      outstandingQuestions.push({
        id: `education-needed-${item.area}`,
        question: item.question || "",
        professionalId: "beasteducation.guidance-counselor",
        source: "education-intake",
        updatedAt: source.educationProfile.updatedAt,
      });
    }
  }

  const existing = new Set(
    [...knownFacts, ...workingHypotheses].map((item) =>
      normalizedFingerprint(item.label, item.value)
    )
  );
  for (const memory of source.memories) {
    const value = memoryValueText(memory.value);
    const confidence = memoryConfidence(memory.value);
    if (!value || confidence === "not-recorded") continue;
    const label = humanizeKey(memory.key);
    const fingerprint = normalizedFingerprint(label, value);
    if (existing.has(fingerprint)) continue;
    existing.add(fingerprint);
    const item: BeastAdminKnowledgeItem = {
      id: `memory-${memory.id}`,
      label,
      value,
      confidence,
      confidenceBasis: memory.evidence.length
        ? `${memory.evidence.length} stored evidence reference${
            memory.evidence.length === 1 ? "" : "s"
          }`
        : "No evidence reference is stored.",
      professionalId: memory.professionalId,
      source: "professional-memory",
      evidence: memory.evidence.map((entry) =>
        isRecord(entry) && typeof entry.source === "string"
          ? entry.source
          : "Stored evidence"
      ),
      updatedAt: memory.updatedAt,
    };
    if (confidence === "high") knownFacts.push(item);
    else workingHypotheses.push(item);
  }

  outstandingQuestions.push(
    ...source.conversationFollowUps.map((followUp) => ({
      id: followUp.id,
      question: followUp.question,
      professionalId: followUp.professionalId,
      source: "conversation-follow-up" as const,
      updatedAt: followUp.updatedAt,
    }))
  );

  const crossModuleContext = source.memories
    .filter((memory) => memory.scope === "user")
    .map((memory) => ({
      id: `context-${memory.id}`,
      professionalId: memory.professionalId,
      label: humanizeKey(memory.key),
      value: memoryValueText(memory.value) || "Structured value stored",
      scope: memory.scope,
      purpose: memory.purpose,
      updatedAt: memory.updatedAt,
    }));

  const professionals = Array.from(
    new Set([
      ...source.memories.map((memory) => memory.professionalId),
      ...source.conversationFollowUps.map(
        (followUp) => followUp.professionalId
      ),
      ...(source.educationProfile
        ? ["beasteducation.guidance-counselor"]
        : []),
    ])
  ).sort();

  return {
    member: source.member,
    knownFacts: knownFacts.sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    ),
    workingHypotheses: workingHypotheses.sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    ),
    outstandingQuestions: outstandingQuestions.sort((a, b) =>
      (b.updatedAt || "").localeCompare(a.updatedAt || "")
    ),
    crossModuleContext: crossModuleContext.sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    ),
    memoryHistory: [...source.memories].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    ),
    professionals,
    coverage: {
      educationProfile: source.educationProfile ? "available" : "empty",
      professionalMemory: source.memories.length ? "available" : "empty",
      crossModuleUnderstanding: "persisted-memory-only",
    },
  };
}

export function filterBeastAdminKnowledgeInspector(
  inspector: BeastAdminKnowledgeInspector,
  professionalId: string
): BeastAdminKnowledgeInspector {
  if (professionalId === "all") return inspector;
  return {
    ...inspector,
    knownFacts: inspector.knownFacts.filter(
      (item) => item.professionalId === professionalId
    ),
    workingHypotheses: inspector.workingHypotheses.filter(
      (item) => item.professionalId === professionalId
    ),
    outstandingQuestions: inspector.outstandingQuestions.filter(
      (item) => item.professionalId === professionalId
    ),
    crossModuleContext: inspector.crossModuleContext.filter(
      (item) => item.professionalId === professionalId
    ),
    memoryHistory: inspector.memoryHistory.filter(
      (item) => item.professionalId === professionalId
    ),
  };
}

export function formatProfessionalName(professionalId: string) {
  const labels: Record<string, string> = {
    "beastmoney.money-coach": "Money Coach",
    "beasteducation.guidance-counselor": "Guidance Counselor",
    "beasthealth.health-advisor": "Health Advisor",
    "beasthome.home-assistant": "Home Assistant",
    "beastgoals.goals-coach": "Goals Coach",
  };
  return labels[professionalId] || humanizeKey(professionalId);
}
