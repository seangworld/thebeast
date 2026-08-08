import type { ProfessionalConfig } from "./config";
import { navigationRegistry } from "./navigation";
import type { RuntimeContext } from "./types";
import { authoritativeProfessionalPrompt } from "./professionalPrompts";

export function buildRuntimeInstructions(config: ProfessionalConfig) {
  return `You are ${config.name}, the member's ${config.role} in Beast.

Mission: ${config.mission}
Allowed scope: ${config.scope.join("; ")}.
Never: ${config.prohibitedActions.join("; ")}.
Tone: ${config.tone}.

You are the primary semantic reasoning layer. Determine whether the message answers your last question, asks a clarification, corrects prior information, requests Beast product support, supplies several facts, needs a tool, needs current research, or needs a handoff. Do not use a scripted discovery sequence. Do not repeat identity, privacy, scope, goals, or disclaimers unless this turn requires them. Lead with the useful answer. Ask at most one high-value follow-up.

Conversation is evidence, not the structured record. Extract each distinct entity into its own proposal. Never store a question as member data. Never invent missing fields. All record writes are proposals until deterministic approval and owner-scoped validation occur.

Product routes are authoritative and must be selected exactly from the provided registry. Research only when current external facts matter. Research queries must be minimum-necessary and de-identified. Use only allowed domains. Never fabricate sources.

Return JSON matching the supplied schema. Natural response text must be concise and conversational.

Authoritative professional instructions:
${authoritativeProfessionalPrompt(config.id)}`;
}

export function buildRuntimeInput(config: ProfessionalConfig, context: RuntimeContext) {
  return JSON.stringify({
    currentMessage: context.message,
    conversationState: context.state,
    recentConversation: context.recentMessages.slice(-12),
    relevantMemory: context.memories.slice(0, 12),
    structuredRecords: context.structuredRecords.slice(0, 30),
    currentWorkspace: context.workspace,
    productNavigation: navigationRegistry(config),
    allowedTools: config.allowedTools,
    allowedResearchDomains: config.researchDomains,
  });
}

export const runtimeJsonSchema = {
  type: "object", additionalProperties: false,
  required: ["intent", "response", "nextQuestion", "state", "proposals", "navigationTarget", "toolCalls", "research", "handoff"],
  properties: {
    intent: { type: "string", enum: ["answer", "answer_previous_question", "clarification", "correction", "product_support", "handoff"] },
    response: { type: "string" }, nextQuestion: { type: ["string", "null"] },
    state: { type: "object", additionalProperties: false, required: ["currentTopic", "currentWorkspace", "lastProfessionalQuestion", "unresolvedQuestions", "corrections", "pendingApprovals", "currentGoal", "previousDecisions"], properties: {
      currentTopic: { type: ["string", "null"] }, currentWorkspace: { type: ["string", "null"] }, lastProfessionalQuestion: { type: ["string", "null"] }, unresolvedQuestions: { type: "array", items: { type: "string" } }, corrections: { type: "array", items: { type: "string" } }, pendingApprovals: { type: "array", items: { type: "string" } }, currentGoal: { type: ["string", "null"] }, previousDecisions: { type: "array", items: { type: "string" } },
    } },
    proposals: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "domain", "entityType", "fields", "sourceMessageId", "confidence", "missingFields", "contradictions", "approvalStatus", "relatedRecordId", "proposedAction"], properties: {
      id: { type: "string" }, domain: { type: "string", enum: ["money", "education", "military", "employment", "health", "goal", "preference"] }, entityType: { type: "string" }, fields: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "value"], properties: { name: { type: "string" }, value: { type: ["string", "number", "boolean", "null"] } } } }, sourceMessageId: { type: "string" }, confidence: { type: "number", minimum: 0, maximum: 1 }, missingFields: { type: "array", items: { type: "string" } }, contradictions: { type: "array", items: { type: "string" } }, approvalStatus: { type: "string", enum: ["proposed", "approved", "rejected"] }, relatedRecordId: { type: ["string", "null"] }, proposedAction: { type: "string", enum: ["create", "update", "none"] },
    } } },
    navigationTarget: { type: ["string", "null"] },
    toolCalls: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "arguments"], properties: { name: { type: "string" }, arguments: { type: "array", items: { type: "object", additionalProperties: false, required: ["name", "value"], properties: { name: { type: "string" }, value: { type: ["string", "number", "boolean", "null"] } } } } } } },
    research: { anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, required: ["query", "reason", "domains"], properties: { query: { type: "string" }, reason: { type: "string" }, domains: { type: "array", items: { type: "string" } } } }] },
    handoff: { anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, required: ["professionalId", "reason"], properties: { professionalId: { type: "string" }, reason: { type: "string" } } }] },
  },
} as const;
