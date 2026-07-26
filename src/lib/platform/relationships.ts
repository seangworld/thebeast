import type { PlatformModule } from "./types";

export type ProfessionalRelationshipDefinition = {
  agentId: string;
  role: string;
  module: PlatformModule;
  href: string;
  actionLabel: string;
  defaultNextConversation: string;
};

export type RelationshipConversationEvidence = {
  id: string;
  agentId: string;
  title: string;
  summary?: {
    overview?: string;
    decisions?: readonly string[];
    unresolvedFollowUps?: readonly string[];
  } | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
};

export type RelationshipMemoryEvidence = {
  id: string;
  agentId: string;
  key: string;
  value: unknown;
  updatedAt: string;
};

export type ProfessionalRelationship = {
  agentId: string;
  role: string;
  module: PlatformModule;
  href: string;
  actionLabel: string;
  state: "active" | "not-started";
  relationshipDuration: string;
  lastConversation: string;
  currentObjective: string;
  recentProgress: string;
  nextRecommendedConversation: string;
  understandingConfidence: {
    label: "Not established" | "Developing" | "Growing" | "High";
    basis: string;
  };
  evidence: {
    conversationCount: number;
    messageCount: number;
    memoryCount: number;
  };
};

export const professionalRelationshipDefinitions: readonly ProfessionalRelationshipDefinition[] =
  [
    {
      agentId: "beastmoney.money-coach",
      role: "Money Coach",
      module: "money",
      href: "/dashboard/money",
      actionLabel: "Talk with Money Coach",
      defaultNextConversation:
        "Review your current priorities and the next financial decision.",
    },
    {
      agentId: "beasteducation.guidance-counselor",
      role: "Guidance Counselor",
      module: "learning",
      href: "/dashboard/education",
      actionLabel: "Talk with Guidance Counselor",
      defaultNextConversation:
        "Review your direction, roadmap, and next educational step.",
    },
    {
      agentId: "beasthealth.health-advisor",
      role: "Health Advisor",
      module: "health",
      href: "/dashboard/health/ai-advisor",
      actionLabel: "Talk with Health Advisor",
      defaultNextConversation: "Begin or continue your health intake.",
    },
  ] as const;

export const relationshipCenterRules = [
  "Relationship Center summarizes owner-scoped professional evidence already stored by BeastOS.",
  "A relationship begins only after a member and professional have exchanged saved messages.",
  "Objectives, progress, and follow-ups are shown only when supported by conversation or memory evidence.",
  "Understanding confidence is qualitative and based on saved conversations and durable memories, not hidden AI judgment.",
  "Relationship Center never changes professional behavior, memory, conversations, or module-owned records.",
] as const;

function validDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatElapsed(start: Date, now: Date) {
  const days = Math.max(
    1,
    Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  );
  if (days < 7) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 45) {
    const weeks = Math.max(1, Math.floor(days / 7));
    return `${weeks} week${weeks === 1 ? "" : "s"}`;
  }
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30));
    return `${months} month${months === 1 ? "" : "s"}`;
  }
  const years = Math.max(1, Math.floor(days / 365));
  return `${years} year${years === 1 ? "" : "s"}`;
}

function formatLastConversation(value: string, now: Date) {
  const date = validDate(value);
  if (!date) return "No saved conversation yet";
  const days = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 86_400_000)
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function objectiveFromMemory(memory: RelationshipMemoryEvidence) {
  if (!memory.value || typeof memory.value !== "object") {
    return /goal|objective/i.test(memory.key) ? text(memory.value) : undefined;
  }
  const value = memory.value as Record<string, unknown>;
  const direct =
    text(value.currentObjective) ||
    text(value.goal);
  if (direct) return direct;
  for (const field of ["educationalGoals", "careerInterests", "goals"]) {
    const values = value[field];
    if (Array.isArray(values)) {
      const first = values.find((item) => text(item));
      if (first) return text(first);
    }
  }
  if (/goal|objective|education-relationship/i.test(memory.key)) {
    return text(value.content);
  }
  return undefined;
}

function confidence(
  conversationCount: number,
  messageCount: number,
  memoryCount: number
): ProfessionalRelationship["understandingConfidence"] {
  const basis = `${conversationCount} saved conversation${
    conversationCount === 1 ? "" : "s"
  }, ${messageCount} message${messageCount === 1 ? "" : "s"}, and ${
    memoryCount
  } durable memor${memoryCount === 1 ? "y" : "ies"}.`;
  if (conversationCount === 0) {
    return {
      label: "Not established",
      basis: "No saved conversation evidence is available yet.",
    };
  }
  if (memoryCount >= 3 && conversationCount >= 3) {
    return { label: "High", basis };
  }
  if (memoryCount >= 1 || conversationCount >= 2 || messageCount >= 8) {
    return { label: "Growing", basis };
  }
  return { label: "Developing", basis };
}

export function buildProfessionalRelationship({
  definition,
  conversations,
  memories,
  now = new Date(),
}: {
  definition: ProfessionalRelationshipDefinition;
  conversations: readonly RelationshipConversationEvidence[];
  memories: readonly RelationshipMemoryEvidence[];
  now?: Date;
}): ProfessionalRelationship {
  const meaningfulConversations = conversations
    .filter((item) => item.agentId === definition.agentId)
    .filter((item) => item.messageCount > 0)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const relationshipMemories = memories
    .filter((item) => item.agentId === definition.agentId)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const latestConversation = meaningfulConversations[0];
  const earliestConversation = [...meaningfulConversations]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((item) => validDate(item.createdAt))
    .find((item): item is Date => Boolean(item));
  const memoryObjective = relationshipMemories
    .map(objectiveFromMemory)
    .find((item): item is string => Boolean(item));
  const conversationObjective =
    latestConversation &&
    latestConversation.title.trim() &&
    latestConversation.title !== "New conversation"
      ? latestConversation.title.trim()
      : undefined;
  const summary = latestConversation?.summary;
  const recentProgress =
    summary?.overview?.trim() &&
    summary.overview !== "No conversation summary yet."
      ? summary.overview.trim()
      : "No recent progress has been captured yet.";
  const nextConversation =
    summary?.unresolvedFollowUps?.find((item) => item.trim())?.trim() ||
    (latestConversation
      ? definition.defaultNextConversation
      : `Start your first conversation with your ${definition.role}.`);
  const messageCount = meaningfulConversations.reduce(
    (total, item) => total + item.messageCount,
    0
  );

  return {
    agentId: definition.agentId,
    role: definition.role,
    module: definition.module,
    href: definition.href,
    actionLabel: definition.actionLabel,
    state: meaningfulConversations.length ? "active" : "not-started",
    relationshipDuration: earliestConversation
      ? `Working together for ${formatElapsed(earliestConversation, now)}`
      : "Relationship not started",
    lastConversation: latestConversation
      ? formatLastConversation(latestConversation.updatedAt, now)
      : "No saved conversation yet",
    currentObjective:
      memoryObjective ||
      conversationObjective ||
      "No current objective has been established yet.",
    recentProgress,
    nextRecommendedConversation: nextConversation,
    understandingConfidence: confidence(
      meaningfulConversations.length,
      messageCount,
      relationshipMemories.length
    ),
    evidence: {
      conversationCount: meaningfulConversations.length,
      messageCount,
      memoryCount: relationshipMemories.length,
    },
  };
}

export function buildRelationshipCenter({
  conversations,
  memories,
  now = new Date(),
}: {
  conversations: readonly RelationshipConversationEvidence[];
  memories: readonly RelationshipMemoryEvidence[];
  now?: Date;
}) {
  return professionalRelationshipDefinitions.map((definition) =>
    buildProfessionalRelationship({
      definition,
      conversations,
      memories,
      now,
    })
  );
}
