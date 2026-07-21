import type { AgentDefinition, AgentId, AgentModuleId, AgentModuleManifest } from "./types";

function required(value: string, label: string) {
  if (!value.trim()) throw new Error(`${label} is required.`);
}

export class AgentRegistry {
  private readonly agents = new Map<AgentId, AgentDefinition>();
  private readonly modules = new Map<AgentModuleId, AgentModuleManifest>();

  registerModule(manifest: AgentModuleManifest) {
    required(manifest.id, "Agent module id");
    required(manifest.displayName, "Agent module display name");
    required(manifest.version, "Agent module version");
    if (this.modules.has(manifest.id)) throw new Error(`Agent module ${manifest.id} is already registered.`);
    const agentIds = new Set<AgentId>();
    for (const agent of manifest.agents || []) {
      if (agent.moduleId !== manifest.id) throw new Error(`Agent ${agent.id} must be owned by module ${manifest.id}.`);
      this.validateAgent(agent);
      if (agentIds.has(agent.id) || this.agents.has(agent.id)) {
        throw new Error(`Agent ${agent.id} is already registered.`);
      }
      agentIds.add(agent.id);
    }
    for (const agent of manifest.agents || []) this.agents.set(agent.id, Object.freeze({ ...agent }));
    this.modules.set(manifest.id, manifest);
    return manifest;
  }

  registerAgent(agent: AgentDefinition) {
    this.validateAgent(agent);
    if (this.agents.has(agent.id)) throw new Error(`Agent ${agent.id} is already registered.`);
    this.agents.set(agent.id, Object.freeze({ ...agent }));
    return agent;
  }

  private validateAgent(agent: AgentDefinition) {
    required(agent.id, "Agent id");
    required(agent.moduleId, "Agent module id");
    required(agent.displayName, "Agent display name");
    required(agent.promptTemplateId, "Agent prompt template id");
    required(agent.experience.userStoryProviderId, "Agent user-story provider id");
    required(agent.experience.fallbackAction, "Agent fallback action");
  }

  hasModule(moduleId: AgentModuleId) {
    return this.modules.has(moduleId);
  }

  get(agentId: AgentId) {
    return this.agents.get(agentId);
  }

  require(agentId: AgentId) {
    const agent = this.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} is not registered.`);
    return agent;
  }

  list(moduleId?: AgentModuleId) {
    return Array.from(this.agents.values()).filter((agent) => !moduleId || agent.moduleId === moduleId);
  }

  listModules() {
    return Array.from(this.modules.values());
  }
}
