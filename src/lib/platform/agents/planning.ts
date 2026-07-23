export type AgentPlanStepKind = "understand" | "clarify" | "retrieve-information" | "retrieve-memory" | "retrieve-specialist-knowledge" | "retrieve-external-knowledge" | "use-tool" | "reason" | "answer";
export type AgentPlanStepStatus = "pending" | "in-progress" | "completed" | "skipped" | "blocked";
export type PlanningRequirementKind = "information" | "tool" | "memory" | "specialist-knowledge" | "external-knowledge";

export type PlanningRequirement = {
  id: string;
  kind: PlanningRequirementKind;
  description: string;
  required: boolean;
  alreadyAvailable?: boolean;
  toolId?: string;
  providerId?: string;
};

export type AgentPlanningPolicy = {
  specialistId: string;
  clarificationConfidenceThreshold: number;
  maximumSteps: number;
  allowedToolIds: readonly string[] | "registered";
  allowedKnowledgeProviderIds: readonly string[] | "registered";
  allowExternalKnowledge: boolean;
  stopWhenEnoughInformationExists: boolean;
};

export type AgentPlanningRequest = {
  specialistId: string;
  input: string;
  intent?: string;
  topics?: readonly string[];
  confidence: number;
  ambiguous?: boolean;
  requirements?: readonly PlanningRequirement[];
  contextSummary?: string;
};

export type AgentPlanStep = {
  id: string;
  kind: AgentPlanStepKind;
  label: string;
  purpose: string;
  required: boolean;
  dependsOn: readonly string[];
  requirementId?: string;
  toolId?: string;
  providerId?: string;
  status: AgentPlanStepStatus;
};

export type AgentPlan = {
  id: string;
  specialistId: string;
  input: string;
  intent?: string;
  topics: readonly string[];
  requiresClarification: boolean;
  clarificationQuestion?: string;
  steps: readonly AgentPlanStep[];
  createdAt: string;
};

export type PlanningArtifact = {
  stepId: string;
  kind: AgentPlanStepKind;
  content: unknown;
  sourceIds?: readonly string[];
  sufficient?: boolean;
};

export type AgentPlanExecution = {
  plan: AgentPlan;
  steps: readonly AgentPlanStep[];
  artifacts: readonly PlanningArtifact[];
  terminatedEarly: boolean;
  requiresClarification: boolean;
  clarificationQuestion?: string;
  answerReady: boolean;
};

export type AgentPlanExecutor = {
  execute(step: AgentPlanStep, state: { plan: AgentPlan; artifacts: readonly PlanningArtifact[] }): Promise<PlanningArtifact | undefined>;
  enoughInformation?(state: { plan: AgentPlan; artifacts: readonly PlanningArtifact[] }): boolean;
};

function step(values: Omit<AgentPlanStep, "status">): AgentPlanStep {
  return { ...values, status: "pending" };
}

function retrievalKind(requirement: PlanningRequirement): AgentPlanStepKind {
  if (requirement.kind === "memory") return "retrieve-memory";
  if (requirement.kind === "specialist-knowledge") return "retrieve-specialist-knowledge";
  if (requirement.kind === "external-knowledge") return "retrieve-external-knowledge";
  if (requirement.kind === "tool") return "use-tool";
  return "retrieve-information";
}

export class SharedAgentPlanningEngine {
  private readonly policies = new Map<string, AgentPlanningPolicy>();

  registerPolicy(policy: AgentPlanningPolicy) {
    if (!policy.specialistId.trim() || policy.maximumSteps < 2 || policy.clarificationConfidenceThreshold < 0 || policy.clarificationConfidenceThreshold > 1) throw new Error("Agent planning policies require a specialist, valid confidence threshold, and at least two steps.");
    if (this.policies.has(policy.specialistId)) throw new Error(`Specialist ${policy.specialistId} already has an agent planning policy.`);
    this.policies.set(policy.specialistId, Object.freeze({ ...policy }));
    return policy;
  }

  hasPolicy(specialistId: string) { return this.policies.has(specialistId); }
  policy(specialistId: string) {
    const policy = this.policies.get(specialistId);
    if (!policy) throw new Error(`Specialist ${specialistId} has no agent planning policy.`);
    return policy;
  }

  createPlan(request: AgentPlanningRequest, now = new Date()): AgentPlan {
    const policy = this.policy(request.specialistId);
    const understand = step({ id: "understand", kind: "understand", label: "Understand the request", purpose: "Identify the requested outcome, intent, topics, and missing context.", required: true, dependsOn: [] });
    const needsClarification = Boolean(request.ambiguous) || request.confidence < policy.clarificationConfidenceThreshold || !request.input.trim();
    if (needsClarification) {
      return { id: `${request.specialistId}:${now.getTime()}`, specialistId: request.specialistId, input: request.input, intent: request.intent, topics: request.topics || [], requiresClarification: true, clarificationQuestion: request.topics?.length ? `What would you like to know or decide about ${request.topics.join(" and ")}?` : "What would you like help understanding or deciding?", steps: [understand, step({ id: "clarify", kind: "clarify", label: "Ask a focused clarification", purpose: "Resolve ambiguity before retrieving information or producing an answer.", required: true, dependsOn: [understand.id] })], createdAt: now.toISOString() };
    }
    const requirements = (request.requirements || []).filter((requirement) => !requirement.alreadyAvailable);
    const retrievalSteps = requirements.flatMap((requirement): AgentPlanStep[] => {
      if (requirement.kind === "external-knowledge" && !policy.allowExternalKnowledge) return [];
      if (requirement.kind === "tool" && requirement.toolId && policy.allowedToolIds !== "registered" && !policy.allowedToolIds.includes(requirement.toolId)) return [];
      if ((requirement.kind === "specialist-knowledge" || requirement.kind === "external-knowledge") && requirement.providerId && policy.allowedKnowledgeProviderIds !== "registered" && !policy.allowedKnowledgeProviderIds.includes(requirement.providerId)) return [];
      return [step({ id: `retrieve-${requirement.id}`, kind: retrievalKind(requirement), label: requirement.description, purpose: `Retrieve the evidence required for ${requirement.description.toLowerCase()}.`, required: requirement.required, dependsOn: [understand.id], requirementId: requirement.id, toolId: requirement.toolId, providerId: requirement.providerId })];
    });
    const reasonDependencies = retrievalSteps.filter((item) => item.required).map((item) => item.id);
    const reason = step({ id: "reason", kind: "reason", label: "Combine evidence", purpose: "Resolve sources and produce a concise evidence-backed conclusion without exposing hidden chain-of-thought.", required: true, dependsOn: reasonDependencies.length ? reasonDependencies : [understand.id] });
    const answer = step({ id: "answer", kind: "answer", label: "Compose the response", purpose: "Answer directly using the specialist identity, playbook, evidence, uncertainty, and useful next action.", required: true, dependsOn: [reason.id] });
    const steps = [understand, ...retrievalSteps, reason, answer];
    if (steps.length > policy.maximumSteps) throw new Error(`Agent plan requires ${steps.length} steps but policy allows ${policy.maximumSteps}.`);
    return { id: `${request.specialistId}:${now.getTime()}`, specialistId: request.specialistId, input: request.input, intent: request.intent, topics: request.topics || [], requiresClarification: false, steps, createdAt: now.toISOString() };
  }

  async execute(plan: AgentPlan, executor: AgentPlanExecutor): Promise<AgentPlanExecution> {
    const policy = this.policy(plan.specialistId);
    const steps = plan.steps.map((item) => ({ ...item }));
    const artifacts: PlanningArtifact[] = [];
    let terminatedEarly = false;
    if (plan.requiresClarification) {
      for (const current of steps) current.status = "completed";
      return { plan, steps, artifacts, terminatedEarly: true, requiresClarification: true, clarificationQuestion: plan.clarificationQuestion, answerReady: false };
    }
    for (const current of steps) {
      const enough = policy.stopWhenEnoughInformationExists && (executor.enoughInformation?.({ plan, artifacts }) || artifacts.some((artifact) => artifact.sufficient));
      const isRetrieval = current.kind.startsWith("retrieve-") || current.kind === "use-tool";
      if (enough && isRetrieval) { current.status = "skipped"; terminatedEarly = true; continue; }
      const dependencyBlocked = current.dependsOn.some((id) => steps.find((candidate) => candidate.id === id)?.status === "blocked");
      if (dependencyBlocked) { current.status = "blocked"; continue; }
      current.status = "in-progress";
      try {
        const artifact = await executor.execute(current, { plan, artifacts });
        if (artifact) artifacts.push(artifact);
        current.status = "completed";
      } catch {
        current.status = current.required ? "blocked" : "skipped";
      }
    }
    const answerReady = steps.find((item) => item.id === "answer")?.status === "completed";
    return { plan, steps, artifacts, terminatedEarly, requiresClarification: false, answerReady };
  }
}

const sharedPolicy = (specialistId: string): AgentPlanningPolicy => ({ specialistId, clarificationConfidenceThreshold: 0.7, maximumSteps: 12, allowedToolIds: "registered", allowedKnowledgeProviderIds: "registered", allowExternalKnowledge: true, stopWhenEnoughInformationExists: true });
export const specialistAgentPlanningPolicies = {
  moneyCoach: sharedPolicy("beastmoney.money-coach"), guidanceCounselor: sharedPolicy("beasteducation.guidance-counselor"),
  healthAdvisor: sharedPolicy("beasthealth.health-advisor"), personalAssistant: sharedPolicy("beastos.personal-assistant"),
} as const;
