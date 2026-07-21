import type { AgentToolContext, AgentToolDefinition, AgentToolId } from "./types";
import { AgentPermissionService } from "./permissions";
import type { AgentRegistry } from "./registry";

export class AgentToolRegistry {
  private readonly tools = new Map<AgentToolId, AgentToolDefinition>();

  constructor(
    private readonly agents: AgentRegistry,
    private readonly permissions: AgentPermissionService,
  ) {}

  register(tool: AgentToolDefinition) {
    if (!tool.id.trim() || !tool.description.trim()) throw new Error("Agent tool id and description are required.");
    if (this.tools.has(tool.id)) throw new Error(`Agent tool ${tool.id} is already registered.`);
    this.tools.set(tool.id, tool);
    return tool;
  }

  get(toolId: AgentToolId) {
    return this.tools.get(toolId);
  }

  has(toolId: AgentToolId) {
    return this.tools.has(toolId);
  }

  listForAgent(agentId: string) {
    const agent = this.agents.require(agentId);
    return agent.requestedToolIds
      .map((id) => this.tools.get(id))
      .filter((tool): tool is AgentToolDefinition => Boolean(tool))
      .filter((tool) => this.permissions.can(agent, tool.requiredPermission.resource, tool.requiredPermission.action));
  }

  async invoke<TOutput = unknown>(toolId: AgentToolId, input: unknown, context: AgentToolContext) {
    const agent = this.agents.require(context.agentId);
    if (context.moduleId !== agent.moduleId) {
      throw new Error(`Agent ${agent.id} cannot be invoked through module ${context.moduleId}.`);
    }
    const tool = this.tools.get(toolId);
    if (!tool) throw new Error(`Agent tool ${toolId} is not registered.`);
    if (!agent.requestedToolIds.includes(toolId)) throw new Error(`Agent ${agent.id} did not request tool ${toolId}.`);
    this.permissions.assert(agent, tool.requiredPermission.resource, tool.requiredPermission.action);
    return tool.execute(input, context) as Promise<TOutput>;
  }
}
