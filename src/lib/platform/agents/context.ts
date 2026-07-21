import type { AgentContextFragment, AgentContextProvider, AgentContextRequest } from "./types";
import type { AgentRegistry } from "./registry";
import { AgentPermissionService } from "./permissions";

export class AgentContextAssembler {
  private readonly providers = new Map<string, AgentContextProvider>();

  constructor(
    private readonly agents: AgentRegistry,
    private readonly permissions: AgentPermissionService,
  ) {}

  register(provider: AgentContextProvider) {
    if (!provider.id.trim()) throw new Error("Agent context provider id is required.");
    if (this.providers.has(provider.id)) throw new Error(`Agent context provider ${provider.id} is already registered.`);
    this.providers.set(provider.id, provider);
    return provider;
  }

  has(providerId: string) {
    return this.providers.has(providerId);
  }

  async assemble(request: AgentContextRequest) {
    const agent = this.agents.require(request.agentId);
    const requested = request.requestedProviderIds?.length
      ? request.requestedProviderIds.map((id) => this.providers.get(id)).filter(Boolean)
      : Array.from(this.providers.values());
    const fragments = (await Promise.all(requested.map((provider) => provider!.provide(request)))).flat();
    return fragments.filter((fragment): fragment is AgentContextFragment => {
      if (!fragment.requiredPermission) return fragment.sensitivity === "public";
      return this.permissions.can(agent, fragment.requiredPermission.resource, fragment.requiredPermission.action);
    });
  }
}
