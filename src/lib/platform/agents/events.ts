import type { AgentEvent } from "./types";

export type AgentEventHandler<T = unknown> = (event: AgentEvent<T>) => void | Promise<void>;

export class AgentEventBus {
  private readonly handlers = new Map<string, Set<AgentEventHandler>>();

  subscribe<T = unknown>(type: string, handler: AgentEventHandler<T>) {
    const handlers = this.handlers.get(type) || new Set<AgentEventHandler>();
    handlers.add(handler as AgentEventHandler);
    this.handlers.set(type, handlers);
    return () => handlers.delete(handler as AgentEventHandler);
  }

  async publish<T>(event: AgentEvent<T>) {
    if (!event.id.trim() || !event.type.trim() || !event.source.trim()) throw new Error("Agent event identity is required.");
    const handlers = [
      ...Array.from(this.handlers.get(event.type) || []),
      ...Array.from(this.handlers.get("*") || []),
    ];
    await Promise.all(handlers.map((handler) => handler(event)));
    return handlers.length;
  }
}
