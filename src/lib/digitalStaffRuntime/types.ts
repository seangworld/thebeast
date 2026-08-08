export type ProfessionalId =
  | "beastfusion.fusion-director"
  | "beastmoney.money-coach"
  | "beasteducation.guidance-counselor"
  | "beasthealth.health-advisor";

export type KnowledgeDomain =
  | "money"
  | "education"
  | "military"
  | "employment"
  | "health"
  | "goal"
  | "preference";

export type StructuredKnowledgeProposal = {
  id: string;
  domain: KnowledgeDomain;
  entityType: string;
  fields: Record<string, string | number | boolean | null>;
  sourceMessageId: string;
  confidence: number;
  missingFields: string[];
  contradictions: string[];
  approvalStatus: "proposed" | "approved" | "rejected";
  relatedRecordId: string | null;
  proposedAction: "create" | "update" | "none";
};

export type ConversationState = {
  currentTopic: string | null;
  currentWorkspace: string | null;
  lastProfessionalQuestion: string | null;
  unresolvedQuestions: string[];
  corrections: string[];
  pendingApprovals: string[];
  currentGoal: string | null;
  previousDecisions: string[];
};

export type RuntimeMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
};

export type RuntimeContext = {
  ownerId: string;
  professionalId: ProfessionalId;
  conversationId: string;
  message: RuntimeMessage;
  recentMessages: RuntimeMessage[];
  state: ConversationState;
  memories: Array<{ key: string; value: unknown; updatedAt: string }>;
  structuredRecords: Array<{ domain: string; record: unknown; updatedAt?: string }>;
  workspace: string | null;
};

export type RuntimeResearchRequest = {
  query: string;
  reason: string;
  domains: string[];
};

export type RuntimePlan = {
  intent: "answer" | "answer_previous_question" | "clarification" | "correction" | "product_support" | "handoff";
  response: string;
  nextQuestion: string | null;
  state: ConversationState;
  proposals: StructuredKnowledgeProposal[];
  navigationTarget: string | null;
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>;
  research: RuntimeResearchRequest | null;
  handoff: { professionalId: ProfessionalId; reason: string } | null;
};

export type RuntimeResult = RuntimePlan & {
  model: string;
  latencyMs: number;
  researchSources: Array<{ title: string; url: string; supportedClaim: string; retrievedAt: string }>;
  validationFailures: string[];
};
