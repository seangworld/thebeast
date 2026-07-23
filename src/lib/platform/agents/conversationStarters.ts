import type { AgentConversationThread } from "./conversationPersistence";
import type { MemberUnderstandingReasoningItem } from "./memberUnderstanding";
import type { Observation } from "./observations";
import type { ProfessionalJournalReasoningItem } from "./professionalJournal";
import type { StructuredAgentAction } from "./tools";

export type ConversationStarterKind =
  | "generic"
  | "personalized"
  | "recommended-today"
  | "continue-previous-work"
  | "suggested-follow-up"
  | "upcoming-event"
  | "recent-observation";

export type ConversationStarterEvidence = {
  sourceType: "configuration" | "current-context" | "observation" | "professional-journal" | "member-understanding" | "conversation-history" | "upcoming-event";
  sourceId: string;
  capturedAt: string;
  reason: string;
};

export type ConversationStarter = {
  id: string;
  ownerId: string;
  specialistId: string;
  kind: ConversationStarterKind;
  title: string;
  prompt: string;
  reason: string;
  priorityScore: number;
  personalized: boolean;
  evidence: readonly ConversationStarterEvidence[];
  relatedConversationId?: string;
  relatedObservationId?: string;
  action?: StructuredAgentAction;
  expiresAt?: string;
};

export type ConversationStarterTemplate = {
  id: string;
  title: string;
  prompt: string;
  priority?: number;
  matchingUnderstandingDimensions?: readonly MemberUnderstandingReasoningItem["dimension"][];
};

export type StarterCandidate = {
  id: string;
  kind: Exclude<ConversationStarterKind, "generic" | "continue-previous-work" | "suggested-follow-up" | "recent-observation">;
  title: string;
  prompt: string;
  reason: string;
  priority?: number;
  evidence: readonly ConversationStarterEvidence[];
  action?: StructuredAgentAction;
  expiresAt?: string;
};

export type UpcomingStarterEvent = {
  id: string;
  title: string;
  prompt: string;
  startsAt: string;
  source: string;
};

export type SpecialistConversationStarterProfile = {
  specialistId: string;
  genericStarters: readonly ConversationStarterTemplate[];
  observationStarter?: (observation: Observation) => Omit<StarterCandidate, "kind" | "evidence"> | undefined;
  journalStarter?: (entry: ProfessionalJournalReasoningItem) => Omit<StarterCandidate, "kind" | "evidence"> | undefined;
  understandingStarter?: (entry: MemberUnderstandingReasoningItem) => Omit<StarterCandidate, "kind" | "evidence"> | undefined;
};

export type GenerateConversationStartersInput = {
  ownerId: string;
  specialistId: string;
  asOf: string;
  observations?: readonly Observation[];
  journalEntries?: readonly ProfessionalJournalReasoningItem[];
  memberUnderstanding?: readonly MemberUnderstandingReasoningItem[];
  conversationHistory?: readonly AgentConversationThread[];
  recommendedToday?: readonly StarterCandidate[];
  upcomingEvents?: readonly UpcomingStarterEvent[];
  limit?: number;
};

function bounded(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function kindScore(kind: ConversationStarterKind) {
  const scores: Record<ConversationStarterKind, number> = {
    "recommended-today": 92,
    "suggested-follow-up": 90,
    "upcoming-event": 86,
    "recent-observation": 82,
    "continue-previous-work": 78,
    personalized: 72,
    generic: 45,
  };
  return scores[kind];
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export class SharedPersonalizedConversationStarters {
  private readonly profiles = new Map<string, SpecialistConversationStarterProfile>();

  registerProfile(profile: SpecialistConversationStarterProfile) {
    if (!profile.specialistId.trim() || !profile.genericStarters.length) throw new Error("Conversation starter profiles require a specialist and generic starters.");
    if (this.profiles.has(profile.specialistId)) throw new Error(`Conversation starter profile ${profile.specialistId} is already registered.`);
    const ids = new Set<string>();
    profile.genericStarters.forEach((starter) => {
      if (!starter.id.trim() || !starter.title.trim() || !starter.prompt.trim()) throw new Error("Conversation starter templates require an id, title, and prompt.");
      if (ids.has(starter.id)) throw new Error(`Conversation starter template ${starter.id} is duplicated.`);
      ids.add(starter.id);
    });
    this.profiles.set(profile.specialistId, profile);
    return profile;
  }

  profile(specialistId: string) {
    const profile = this.profiles.get(specialistId);
    if (!profile) throw new Error(`Specialist ${specialistId} has no conversation starter profile.`);
    return profile;
  }

  generate(input: GenerateConversationStartersInput) {
    const profile = this.profile(input.specialistId);
    const candidates: ConversationStarter[] = [];
    const add = (
      starter: Omit<ConversationStarter, "ownerId" | "specialistId" | "priorityScore"> & { priorityScore?: number }
    ) => {
      if (!starter.title.trim() || !starter.prompt.trim() || !starter.evidence.length) return;
      candidates.push({
        ...starter,
        ownerId: input.ownerId,
        specialistId: input.specialistId,
        priorityScore: bounded(starter.priorityScore ?? kindScore(starter.kind)),
      });
    };

    for (const starter of profile.genericStarters) {
      const matchingUnderstanding = (input.memberUnderstanding || []).filter((item) =>
        starter.matchingUnderstandingDimensions?.includes(item.dimension)
      );
      add({
        id: `generic:${starter.id}`,
        kind: matchingUnderstanding.length ? "personalized" : "generic",
        title: starter.title,
        prompt: starter.prompt,
        reason: matchingUnderstanding.length
          ? "Suggested using relevant member understanding."
          : "Available from this specialist's configured conversation playbook.",
        personalized: matchingUnderstanding.length > 0,
        evidence: matchingUnderstanding.length
          ? matchingUnderstanding.map((item) => ({
              sourceType: "member-understanding" as const,
              sourceId: item.understandingId,
              capturedAt: item.updatedAt,
              reason: item.understanding,
            }))
          : [{
              sourceType: "configuration",
              sourceId: starter.id,
              capturedAt: input.asOf,
              reason: "Configured generic specialist starter.",
            }],
        priorityScore: (starter.priority ?? kindScore("generic")) + Math.min(15, matchingUnderstanding.length * 5),
      });
    }

    const conversations = (input.conversationHistory || [])
      .filter((thread) => thread.ownerId === input.ownerId && thread.agentId === input.specialistId && !thread.archived && thread.messageCount > 0)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const latest = conversations[0];
    if (latest) {
      add({
        id: `continue:${latest.id}`,
        kind: "continue-previous-work",
        title: `Continue ${latest.title}`,
        prompt: `Continue our previous work on ${latest.title}.`,
        reason: "This is the most recently updated active conversation.",
        personalized: true,
        evidence: [{
          sourceType: "conversation-history",
          sourceId: latest.id,
          capturedAt: latest.updatedAt,
          reason: latest.summary.overview,
        }],
        relatedConversationId: latest.id,
      });
      latest.summary.unresolvedFollowUps.slice(0, 2).forEach((followUp, index) => add({
        id: `follow-up:${latest.id}:${index}`,
        kind: "suggested-follow-up",
        title: followUp,
        prompt: followUp,
        reason: "This follow-up remains unresolved in the prior conversation summary.",
        personalized: true,
        evidence: [{
          sourceType: "conversation-history",
          sourceId: latest.id,
          capturedAt: latest.summary.updatedAt,
          reason: "Unresolved structured follow-up.",
        }],
        relatedConversationId: latest.id,
      }));
    }

    for (const observation of input.observations || []) {
      if (observation.ownerId !== input.ownerId || observation.specialistId !== input.specialistId || !profile.observationStarter) continue;
      const starter = profile.observationStarter(observation);
      if (!starter) continue;
      add({
        ...starter,
        kind: "recent-observation",
        personalized: true,
        evidence: [{
          sourceType: "observation",
          sourceId: observation.id,
          capturedAt: observation.updatedAt,
          reason: observation.presentation.whyNoticed,
        }],
        relatedObservationId: observation.id,
        priorityScore: (starter.priority ?? kindScore("recent-observation")) + observation.assessment.priorityScore * 0.1,
      });
    }

    for (const journalEntry of input.journalEntries || []) {
      if (!profile.journalStarter) continue;
      const starter = profile.journalStarter(journalEntry);
      if (!starter) continue;
      add({
        ...starter,
        kind: "personalized",
        personalized: true,
        evidence: [{
          sourceType: "professional-journal",
          sourceId: journalEntry.entryId,
          capturedAt: journalEntry.timestamp,
          reason: journalEntry.interpretation,
        }],
        priorityScore: starter.priority ?? kindScore("personalized"),
      });
    }

    for (const understanding of input.memberUnderstanding || []) {
      if (!profile.understandingStarter) continue;
      const starter = profile.understandingStarter(understanding);
      if (!starter) continue;
      add({
        ...starter,
        kind: "personalized",
        personalized: true,
        evidence: [{
          sourceType: "member-understanding",
          sourceId: understanding.understandingId,
          capturedAt: understanding.updatedAt,
          reason: understanding.understanding,
        }],
        priorityScore: starter.priority ?? kindScore("personalized"),
      });
    }

    for (const recommended of input.recommendedToday || []) {
      add({
        ...recommended,
        kind: "recommended-today",
        personalized: recommended.evidence.some((item) => item.sourceType !== "configuration"),
        priorityScore: recommended.priority ?? kindScore("recommended-today"),
      });
    }

    for (const event of input.upcomingEvents || []) {
      add({
        id: `event:${event.id}`,
        kind: "upcoming-event",
        title: event.title,
        prompt: event.prompt,
        reason: `Suggested because ${event.title} is upcoming.`,
        personalized: true,
        evidence: [{
          sourceType: "upcoming-event",
          sourceId: event.id,
          capturedAt: event.startsAt,
          reason: event.source,
        }],
        expiresAt: event.startsAt,
      });
    }

    const currentTime = Date.parse(input.asOf);
    const active = candidates.filter((starter) => !starter.expiresAt || Date.parse(starter.expiresAt) >= currentTime);
    const deduplicated = new Map<string, ConversationStarter>();
    active
      .sort((a, b) => b.priorityScore - a.priorityScore || a.id.localeCompare(b.id))
      .forEach((starter) => {
        const key = normalize(starter.prompt);
        if (!deduplicated.has(key)) deduplicated.set(key, starter);
      });
    return Array.from(deduplicated.values()).slice(0, Math.max(1, input.limit ?? 8));
  }
}

export const specialistConversationStarterProfiles = {
  moneyCoach: {
    specialistId: "beastmoney.money-coach",
    genericStarters: [
      { id: "financial-checkup", title: "Financial Checkup", prompt: "Give me a financial checkup.", priority: 55 },
      { id: "latest-paycheck", title: "Review latest paycheck", prompt: "Help me review my latest paycheck.", priority: 50 },
      { id: "retirement-plan", title: "Continue Retirement Plan", prompt: "Help me continue my retirement plan.", priority: 50, matchingUnderstandingDimensions: ["goal"] },
      { id: "spending", title: "Review spending", prompt: "Help me review my recent spending.", priority: 50, matchingUnderstandingDimensions: ["habit", "behavior-pattern"] },
      { id: "velocity", title: "Velocity Banking", prompt: "Explain how Velocity Banking fits my current plan.", priority: 45 },
      { id: "emergency-fund", title: "Emergency Fund", prompt: "How is my emergency fund progressing?", priority: 50, matchingUnderstandingDimensions: ["goal"] },
    ],
    observationStarter: (observation: Observation) => ({
      id: `observation-${observation.id}`,
      title: observation.presentation.title,
      prompt: observation.presentation.suggestedQuestion || `Explain what you noticed about ${observation.presentation.title}.`,
      reason: observation.presentation.whyNoticed,
      priority: 80,
      action: observation.presentation.action,
    }),
  },
  healthAdvisor: {
    specialistId: "beasthealth.health-advisor",
    genericStarters: [
      { id: "medications", title: "Review medications", prompt: "Help me review my medications.", priority: 55 },
      { id: "labs", title: "Review lab results", prompt: "Help me understand my latest lab results.", priority: 55 },
      { id: "appointment", title: "Prepare for appointment", prompt: "Help me prepare for my next appointment.", priority: 55 },
    ],
  },
  guidanceCounselor: {
    specialistId: "beasteducation.guidance-counselor",
    genericStarters: [
      { id: "learning-plan", title: "Continue learning plan", prompt: "Help me continue my learning plan.", priority: 55, matchingUnderstandingDimensions: ["goal", "learning-preference"] },
      { id: "progress", title: "Review progress", prompt: "Help me review my learning progress.", priority: 55 },
      { id: "certification", title: "Find next certification", prompt: "Help me find the next certification to explore.", priority: 50, matchingUnderstandingDimensions: ["goal"] },
    ],
  },
} satisfies Record<string, SpecialistConversationStarterProfile>;

export function createDefaultConversationStarterEngine() {
  const engine = new SharedPersonalizedConversationStarters();
  Object.values(specialistConversationStarterProfiles).forEach((profile) => engine.registerProfile(profile));
  return engine;
}
