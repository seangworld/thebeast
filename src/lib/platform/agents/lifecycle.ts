import type { AgentLifecycleState } from "./types";
import type { AgentRegistry } from "./registry";
import type { AgentEventBus } from "./events";

const transitions: Record<AgentLifecycleState, readonly AgentLifecycleState[]> = {
  registered: ["initializing", "stopped"],
  initializing: ["ready", "failed", "stopped"],
  ready: ["running", "suspended", "stopped", "failed"],
  running: ["ready", "suspended", "stopped", "failed"],
  suspended: ["ready", "stopped", "failed"],
  stopped: ["initializing"],
  failed: ["initializing", "stopped"],
};

export class AgentLifecycleService {
  private readonly states = new Map<string, AgentLifecycleState>();

  constructor(private readonly registry: AgentRegistry, private readonly events: AgentEventBus) {}

  state(agentId: string) {
    this.registry.require(agentId);
    return this.states.get(agentId) || "registered";
  }

  async transition(agentId: string, next: AgentLifecycleState, reason?: string) {
    const previous = this.state(agentId);
    if (!transitions[previous].includes(next)) throw new Error(`Invalid agent lifecycle transition: ${previous} -> ${next}.`);
    this.states.set(agentId, next);
    await this.events.publish({
      id: `agent-lifecycle-${agentId}-${Date.now()}`,
      type: "agent.lifecycle.changed",
      source: "beastos.agents.lifecycle",
      timestamp: new Date().toISOString(),
      payload: { agentId, previous, next, reason },
    });
    return next;
  }
}
