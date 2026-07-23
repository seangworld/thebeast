import type { ProfessionalBehaviorProfile } from "./professionalBehavior";
import type { ProfessionalIdentityProfile } from "./professionalIdentity";

export type AgentId = string;
export type AgentModuleId = string;
export type AgentToolId = string;
export type AgentThreadId = string;

export type AgentLifecycleState =
  | "registered"
  | "initializing"
  | "ready"
  | "running"
  | "suspended"
  | "stopped"
  | "failed";

export type AgentPermissionEffect = "allow" | "deny";

export type AgentPermission = {
  resource: string;
  actions: readonly string[];
  effect: AgentPermissionEffect;
};

export type AgentExperienceContract = {
  userStoryProviderId: string;
  proactiveGuidance: true;
  progressiveCompletion: true;
  relationshipMemoryScope: Extract<AgentMemoryScope, "thread" | "agent" | "user">;
  fallbackAction: string;
};

export type AgentDefinition = {
  id: AgentId;
  moduleId: AgentModuleId;
  displayName: string;
  description: string;
  version: string;
  promptTemplateId: string;
  requestedToolIds: readonly AgentToolId[];
  requestedPermissions: readonly AgentPermission[];
  experience: AgentExperienceContract;
  professionalBehavior?: ProfessionalBehaviorProfile;
  professionalIdentity?: ProfessionalIdentityProfile;
  metadata?: Readonly<Record<string, string>>;
};

export type AgentToolContext = {
  agentId: AgentId;
  moduleId: AgentModuleId;
  threadId?: AgentThreadId;
  signal?: AbortSignal;
};

export type AgentToolDefinition<TInput = unknown, TOutput = unknown> = {
  id: AgentToolId;
  moduleId: AgentModuleId | "beastos";
  description: string;
  inputSchema: Readonly<Record<string, unknown>>;
  requiredPermission: { resource: string; action: string };
  execute: (input: TInput, context: AgentToolContext) => Promise<TOutput>;
};

export type AgentMemoryScope = "turn" | "thread" | "agent" | "user";
export type AgentMemoryRecord = {
  id: string;
  agentId: AgentId;
  ownerId: string;
  scope: AgentMemoryScope;
  key: string;
  value: unknown;
  purpose: string;
  evidence?: readonly AgentEvidenceReference[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
};

export type AgentEvidenceReference = { source: string; capturedAt: string; description?: string };

export type AgentPlaybookStatus = "draft" | "pending_review" | "approved" | "retired";
export type AgentPlaybook = {
  agentId: AgentId;
  version: string;
  status: AgentPlaybookStatus;
  effectiveDate?: string;
  mission: string;
  professionalRules: readonly string[];
  recommendationHierarchy: readonly string[];
  communicationRules: readonly string[];
  safetyBoundaries: readonly string[];
  prohibitions: readonly string[];
  approval?: { approvedBy: string; approvedAt: string; decisionRef: string };
  changeSummary: string;
  supersedes?: string;
};

export type AgentUserPreferences = {
  ownerId: string;
  agentId: AgentId;
  values: Readonly<Record<string, unknown>>;
  updatedAt: string;
};

export type AgentCurrentContext = {
  id: string;
  ownerId: string;
  agentId: AgentId;
  content: unknown;
  evidence: readonly AgentEvidenceReference[];
  requiredPermission?: { resource: string; action: string };
  capturedAt: string;
  expiresAt?: string;
};

export type LearningJournalStatus = "proposed" | "under_review" | "accepted" | "rejected" | "deferred" | "implemented";
export type AgentLearningProposal = {
  id: string;
  agentId: AgentId;
  status: LearningJournalStatus;
  observation: string;
  proposedChange: string;
  evidence: readonly AgentEvidenceReference[];
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  implementedInPlaybookVersion?: string;
};

export type AgentRunAudit = {
  runId: string;
  requestId: string;
  agentId: AgentId;
  ownerId: string;
  playbookVersion: string;
  promptVersion: string;
  toolsAvailable: readonly string[];
  toolsUsed: readonly string[];
  memoryReferences: readonly string[];
  trigger: string;
  outcome: string;
  rationale: string;
  timestamp: string;
};

export type AgentContextFragment = {
  id: string;
  providerId: string;
  source: string;
  content: unknown;
  sensitivity: "public" | "internal" | "sensitive";
  requiredPermission?: { resource: string; action: string };
};

export type AgentContextRequest = {
  agentId: AgentId;
  ownerId: string;
  threadId?: AgentThreadId;
  requestedProviderIds?: readonly string[];
};

export type AgentContextProvider = {
  id: string;
  moduleId: AgentModuleId | "beastos";
  description: string;
  provide: (request: AgentContextRequest) => Promise<readonly AgentContextFragment[]>;
};

export type AgentEvent<TPayload = unknown> = {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  correlationId?: string;
  payload: TPayload;
};

export type AgentPromptTemplate = {
  id: string;
  moduleId: AgentModuleId | "beastos";
  version: string;
  system: string;
  constraints: readonly string[];
  variables: readonly string[];
};

export type AgentModuleManifest = {
  id: AgentModuleId;
  displayName: string;
  version: string;
  agents?: readonly AgentDefinition[];
  tools?: readonly AgentToolDefinition[];
  contextProviders?: readonly AgentContextProvider[];
  promptTemplates?: readonly AgentPromptTemplate[];
};

export type AgentMessage = {
  id: string;
  threadId: AgentThreadId;
  sender: { kind: "user" | "agent" | "system"; id: string };
  recipient: { kind: "agent" | "module" | "broadcast"; id?: string };
  content: unknown;
  timestamp: string;
  correlationId?: string;
};

export type AgentRequest = {
  requestId: string;
  threadId: AgentThreadId;
  agentId: AgentId;
  ownerId: string;
  input: unknown;
  contextProviderIds?: readonly string[];
};

export type AgentResponse = {
  requestId: string;
  agentId: AgentId;
  status: "accepted" | "rejected";
  reason: string;
  nextAction: string;
  context: readonly AgentContextFragment[];
  availableToolIds: readonly AgentToolId[];
  governance?: Omit<AgentRunAudit, "outcome" | "rationale" | "toolsUsed">;
};
