import type { AgentMessage } from "./types";
import type { AgentEventBus } from "./events";

export class AgentCommunicationService {
  private readonly messages = new Map<string, AgentMessage[]>();

  constructor(private readonly events: AgentEventBus) {}

  async send(message: AgentMessage) {
    if (!message.id.trim() || !message.threadId.trim()) throw new Error("Agent message id and thread id are required.");
    const thread = this.messages.get(message.threadId) || [];
    thread.push(Object.freeze({ ...message }));
    this.messages.set(message.threadId, thread);
    await this.events.publish({
      id: `agent-message-${message.id}`,
      type: "agent.message.sent",
      source: "beastos.agents.communication",
      timestamp: message.timestamp,
      correlationId: message.correlationId,
      payload: message,
    });
    return message;
  }

  history(threadId: string) {
    return [...(this.messages.get(threadId) || [])];
  }
}
