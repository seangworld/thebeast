import type { AgentModuleManifest, AgentRequest, AgentResponse } from "./types";
import { AgentRegistry } from "./registry";
import { AgentPermissionService } from "./permissions";
import { AgentToolRegistry, createDefaultAgentActionToolRegistry } from "./tools";
import { InMemoryAgentMemoryStore, type AgentMemoryStore } from "./memory";
import { AgentContextAssembler } from "./context";
import { AgentEventBus } from "./events";
import { AgentLifecycleService } from "./lifecycle";
import { AgentPromptFramework } from "./prompts";
import { AgentCommunicationService } from "./communication";
import {
  AgentCurrentContextStore, AgentLearningJournal, AgentPlaybookRegistry, AgentPreferenceStore,
  AgentRunAuditStore, GovernedRunAssembler,
} from "./governance";
import type { AgentPlaybook } from "./types";
import { ProfessionalBehaviorRegistry } from "./professionalBehavior";
import { ProfessionalIdentityRegistry } from "./professionalIdentity";
import { SharedInsightEngine } from "./insights";
import { KnowledgeSourceFramework, specialistKnowledgeSourcePolicies } from "./knowledgeSources";
import { SharedAgentPlanningEngine, specialistAgentPlanningPolicies } from "./planning";

export class BeastAgentsPlatform {
  readonly registry = new AgentRegistry();
  readonly permissions = new AgentPermissionService();
  readonly events = new AgentEventBus();
  readonly tools = new AgentToolRegistry(this.registry, this.permissions);
  readonly actionTools = createDefaultAgentActionToolRegistry();
  readonly context = new AgentContextAssembler(this.registry, this.permissions);
  readonly lifecycle = new AgentLifecycleService(this.registry, this.events);
  readonly prompts = new AgentPromptFramework();
  readonly communication = new AgentCommunicationService(this.events);
  readonly professionalBehavior = new ProfessionalBehaviorRegistry();
  readonly professionalIdentity = new ProfessionalIdentityRegistry();
  readonly insights = new SharedInsightEngine();
  readonly knowledgeSources = new KnowledgeSourceFramework();
  readonly planner = new SharedAgentPlanningEngine();
  readonly playbooks = new AgentPlaybookRegistry();
  readonly preferences = new AgentPreferenceStore();
  readonly currentContext = new AgentCurrentContextStore();
  readonly learningJournal = new AgentLearningJournal();
  readonly audits = new AgentRunAuditStore();
  readonly governedRuns: GovernedRunAssembler;

  constructor(readonly memory: AgentMemoryStore = new InMemoryAgentMemoryStore()) {
    this.governedRuns = new GovernedRunAssembler(this.playbooks, this.preferences, memory, this.currentContext, this.permissions);
    Object.values(specialistKnowledgeSourcePolicies).forEach((policy) => this.knowledgeSources.registerPolicy(policy));
    Object.values(specialistAgentPlanningPolicies).forEach((policy) => this.planner.registerPolicy(policy));
  }

  registerPlaybook(playbook: AgentPlaybook) { return this.playbooks.register(playbook); }

  registerModule(manifest: AgentModuleManifest) {
    this.preflightModule(manifest);
    this.registry.registerModule(manifest);
    for (const agent of manifest.agents || []) {
      if (agent.professionalBehavior && !this.professionalBehavior.get(agent.professionalBehavior.id)) {
        this.professionalBehavior.register(agent.professionalBehavior);
      }
      if (agent.professionalIdentity && !this.professionalIdentity.get(agent.professionalIdentity.id)) {
        this.professionalIdentity.register(agent.professionalIdentity);
      }
      if (agent.knowledgeSourcePolicy && !this.knowledgeSources.hasPolicy(agent.id)) {
        if (agent.knowledgeSourcePolicy.specialistId !== agent.id) throw new Error(`Agent ${agent.id} knowledge source policy must use the same specialist id.`);
        this.knowledgeSources.registerPolicy(agent.knowledgeSourcePolicy);
      }
      if (agent.planningPolicy && !this.planner.hasPolicy(agent.id)) {
        if (agent.planningPolicy.specialistId !== agent.id) throw new Error(`Agent ${agent.id} planning policy must use the same specialist id.`);
        this.planner.registerPolicy(agent.planningPolicy);
      }
    }
    for (const tool of manifest.tools || []) this.tools.register(tool);
    for (const provider of manifest.contextProviders || []) this.context.register(provider);
    for (const prompt of manifest.promptTemplates || []) this.prompts.register(prompt);
    return manifest;
  }

  private preflightModule(manifest: AgentModuleManifest) {
    if (this.registry.hasModule(manifest.id)) throw new Error(`Agent module ${manifest.id} is already registered.`);
    const assertOwned = (kind: string, item: { id: string; moduleId: string }) => {
      if (item.moduleId !== manifest.id) throw new Error(`${kind} ${item.id} must be owned by module ${manifest.id}.`);
    };
    const assertUnique = <T extends { id: string }>(kind: string, items: readonly T[], exists: (id: string) => boolean) => {
      const ids = new Set<string>();
      for (const item of items) {
        if (ids.has(item.id) || exists(item.id)) throw new Error(`${kind} ${item.id} is already registered.`);
        ids.add(item.id);
      }
    };
    const agents = manifest.agents || [];
    const tools = manifest.tools || [];
    const providers = manifest.contextProviders || [];
    const prompts = manifest.promptTemplates || [];
    agents.forEach((item) => assertOwned("Agent", item));
    tools.forEach((item) => assertOwned("Agent tool", item));
    providers.forEach((item) => assertOwned("Agent context provider", item));
    prompts.forEach((item) => assertOwned("Agent prompt", item));
    assertUnique("Agent tool", tools, (id) => this.tools.has(id));
    assertUnique("Agent context provider", providers, (id) => this.context.has(id));
    assertUnique("Agent prompt", prompts, (id) => this.prompts.has(id));
    const suppliedTools = new Set(tools.map((tool) => tool.id));
    const suppliedProviders = new Set(providers.map((provider) => provider.id));
    const suppliedPrompts = new Set(prompts.map((prompt) => prompt.id));
    for (const agent of agents) {
      this.permissions.validateRequestedPermissions(agent.requestedPermissions);
      if (!suppliedProviders.has(agent.experience.userStoryProviderId) && !this.context.has(agent.experience.userStoryProviderId)) {
        throw new Error(`Agent ${agent.id} references unregistered user-story provider ${agent.experience.userStoryProviderId}.`);
      }
      if (!suppliedPrompts.has(agent.promptTemplateId) && !this.prompts.has(agent.promptTemplateId)) {
        throw new Error(`Agent ${agent.id} references unregistered prompt ${agent.promptTemplateId}.`);
      }
      for (const toolId of agent.requestedToolIds) {
        if (!suppliedTools.has(toolId) && !this.tools.has(toolId)) {
          throw new Error(`Agent ${agent.id} references unregistered tool ${toolId}.`);
        }
      }
    }
  }

  async accept(request: AgentRequest): Promise<AgentResponse> {
    const agent = this.registry.require(request.agentId);
    const state = this.lifecycle.state(agent.id);
    if (state !== "ready" && state !== "running") {
      return {
        requestId: request.requestId,
        agentId: agent.id,
        status: "rejected",
        reason: `Agent ${agent.displayName} is ${state}.`,
        nextAction: agent.experience.fallbackAction,
        context: [],
        availableToolIds: [],
      };
    }
    const governance = await this.governedRuns.assemble(agent, request.ownerId);
    const context = await this.context.assemble({
      agentId: agent.id,
      ownerId: request.ownerId,
      threadId: request.threadId,
      requestedProviderIds: request.contextProviderIds,
    });
    const availableToolIds = this.tools.listForAgent(agent.id).map((tool) => tool.id);
    const timestamp = new Date().toISOString();
    const runMetadata = {
      runId: request.requestId,
      requestId: request.requestId,
      agentId: agent.id,
      ownerId: request.ownerId,
      playbookVersion: governance.playbook.version,
      promptVersion: this.prompts.version(agent.promptTemplateId),
      toolsAvailable: availableToolIds,
      memoryReferences: governance.memory.map((item) => item.id),
      trigger: typeof request.input === "string" ? request.input.slice(0, 120) : "structured_request",
      timestamp,
    };
    this.audits.append({ ...runMetadata, toolsUsed: [], outcome: "accepted", rationale: "Approved playbook, permissions, and owner-scoped context were assembled." });
    return {
      requestId: request.requestId,
      agentId: agent.id,
      status: "accepted",
      reason: "Agent is ready with permission-filtered context and tools.",
      nextAction: "Continue with the smallest useful guided step.",
      context,
      availableToolIds,
      governance: runMetadata,
    };
  }
}

export const beastAgentsFoundationRules = [
  "BeastAgents is BeastOS-owned shared infrastructure; modules retain all business-specific logic.",
  "Modules integrate through one manifest registration boundary for agents, tools, context providers, and prompt templates.",
  "Permissions are default-deny and are checked again when context or tools are used.",
  "Memory is owner-scoped, purpose-limited, exportable through future approved adapters, and deletable.",
  "The foundation creates no background workers, credentials, database tables, network calls, or autonomous release authority.",
  "Every agent registration must identify user-story context, proactive guidance, relationship memory, progressive completion, and a no-dead-end fallback.",
  "Every applicable run requires an effective owner-approved playbook; preferences, memory, and learning proposals cannot rewrite policy.",
  "Run audits record decisions, evidence references, actions, and concise rationale—never hidden chain-of-thought.",
] as const;

export const generationTwoDesignPrinciples = [
  "Know the user's story.",
  "Guide before asked.",
  "Remember meaningful interactions.",
  "AI-first.",
  "Progressive completion.",
  "No dead ends.",
  "No empty pages.",
  "Responsive everywhere.",
  "Modules cooperate.",
  "Agents own relationships.",
] as const;
