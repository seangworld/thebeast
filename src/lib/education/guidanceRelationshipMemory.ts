import type { AgentMemoryRecord } from "../platform/agents";
import type { GuidanceDiscoveryProfile } from "./discoveryConversation";

export type GuidanceRelationshipMemoryValue = {
  goal?: string;
  educationalGoals?: readonly string[];
  careerInterests?: readonly string[];
  currentSituation?: string;
  constraints?: string;
  sourceConversationId: string;
  sourceMessageId: string;
  capturedAt: string;
};

export type GuidanceRelationshipReference = {
  text: string;
  memoryId: string;
  sourceConversationId: string;
  kind: "remembered" | "changed";
};

const relationshipMemoryKey = "education-relationship";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanList(value: unknown) {
  return Array.isArray(value)
    ? value.map(clean).filter(Boolean)
    : [];
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function same(left: string, right: string) {
  return normalized(left) === normalized(right);
}

export function explicitGuidanceGoalChange(
  message: string,
  currentGoal: string
) {
  if (!currentGoal.trim()) return undefined;
  const patterns = [
    /(?:my goal is now|i changed my goal to|i(?:'m| am) changing my goal to)\s+([^,.!?]+(?:\s+[^,.!?]+)*)/i,
    /(?:instead,?\s+)?i (?:now )?want to (?:become|pursue|work (?:in|as))\s+([^,.!?]+(?:\s+[^,.!?]+)*)/i,
  ];
  const changed = patterns
    .map((pattern) => message.match(pattern)?.[1]?.trim())
    .find(Boolean);
  return changed && !same(changed, currentGoal) ? changed : undefined;
}

function relationshipValue(record: AgentMemoryRecord | undefined) {
  if (!record || record.key !== relationshipMemoryKey || !record.evidence?.length) {
    return undefined;
  }
  const value = record.value as Partial<GuidanceRelationshipMemoryValue>;
  const sourceConversationId = clean(value.sourceConversationId);
  const sourceMessageId = clean(value.sourceMessageId);
  if (!sourceConversationId || !sourceMessageId) return undefined;
  return {
    goal: clean(value.goal),
    educationalGoals: cleanList(value.educationalGoals),
    careerInterests: cleanList(value.careerInterests),
    currentSituation: clean(value.currentSituation),
    constraints: clean(value.constraints),
    sourceConversationId,
    sourceMessageId,
    capturedAt: clean(value.capturedAt),
  };
}

export function guidanceRelationshipMemoryRecord({
  ownerId,
  profile,
  conversationId,
  messageId,
  capturedAt,
}: {
  ownerId: string;
  profile: GuidanceDiscoveryProfile;
  conversationId: string;
  messageId: string;
  capturedAt: string;
}): AgentMemoryRecord | undefined {
  const hasKnownContext = Boolean(
    profile.goal.trim() ||
      profile.educationalGoals.length ||
      profile.careerInterests.length ||
      profile.currentSituation.trim() ||
      profile.constraints.trim()
  );
  if (!hasKnownContext || !conversationId || !messageId) return undefined;

  const value: GuidanceRelationshipMemoryValue = {
    goal: profile.goal.trim() || undefined,
    educationalGoals: profile.educationalGoals,
    careerInterests: profile.careerInterests,
    currentSituation: profile.currentSituation.trim() || undefined,
    constraints: profile.constraints.trim() || undefined,
    sourceConversationId: conversationId,
    sourceMessageId: messageId,
    capturedAt,
  };
  return {
    id: `beasteducation:${ownerId}:${relationshipMemoryKey}`,
    agentId: "beasteducation.guidance-counselor",
    ownerId,
    scope: "user",
    key: relationshipMemoryKey,
    value,
    purpose:
      "Preserve member-stated education context for the long-term Guidance Counselor relationship.",
    evidence: [
      {
        source: conversationId,
        capturedAt,
        description: messageId,
      },
    ],
    createdAt: capturedAt,
    updatedAt: capturedAt,
  };
}

export function guidanceRelationshipReference({
  memories,
  previousProfile,
  currentProfile,
  currentConversationId,
}: {
  memories: readonly AgentMemoryRecord[];
  previousProfile: GuidanceDiscoveryProfile;
  currentProfile: GuidanceDiscoveryProfile;
  currentConversationId: string;
}): GuidanceRelationshipReference | undefined {
  const record = memories.find((item) => item.key === relationshipMemoryKey);
  const remembered = relationshipValue(record);
  if (!record || !remembered) return undefined;

  const previousGoal = remembered.goal || previousProfile.goal.trim();
  const currentGoal = currentProfile.goal.trim();
  if (
    previousGoal &&
    currentGoal &&
    !same(previousGoal, currentGoal)
  ) {
    return {
      text: `It looks like your goals have changed from ${previousGoal} to ${currentGoal}. I’ll use the new direction unless you want to keep both options open.`,
      memoryId: record.id,
      sourceConversationId: remembered.sourceConversationId,
      kind: "changed",
    };
  }

  const fromEarlierConversation =
    remembered.sourceConversationId !== currentConversationId;
  if (!fromEarlierConversation) return undefined;
  if (remembered.goal) {
    return {
      text: `Last time you mentioned you’re working toward ${remembered.goal}.`,
      memoryId: record.id,
      sourceConversationId: remembered.sourceConversationId,
      kind: "remembered",
    };
  }
  if (remembered.careerInterests.length) {
    return {
      text: `Earlier you were considering ${remembered.careerInterests.join(", ")}.`,
      memoryId: record.id,
      sourceConversationId: remembered.sourceConversationId,
      kind: "remembered",
    };
  }
  if (remembered.currentSituation) {
    return {
      text: `I remember you said your current situation is ${remembered.currentSituation}.`,
      memoryId: record.id,
      sourceConversationId: remembered.sourceConversationId,
      kind: "remembered",
    };
  }
  return undefined;
}
