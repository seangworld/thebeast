import type { AgentMemoryRecord, AgentMessage } from "./types";
import type { AgentMemoryStore } from "./memory";

export interface AgentPersistenceStorage {
  readonly length: number;
  key(index: number): string | null;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type AgentConversationSummary = {
  overview: string;
  decisions: readonly string[];
  unresolvedFollowUps: readonly string[];
  updatedAt: string;
};

export type AgentConversationThread = {
  id: string;
  ownerId: string;
  agentId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: readonly AgentMessage[];
  messageCount: number;
  pinned: boolean;
  archived: boolean;
  tags: readonly string[];
  summary: AgentConversationSummary;
  relatedInsightIds: readonly string[];
  relatedActionIds: readonly string[];
};

export type AgentConversationContext = {
  thread: AgentConversationThread;
  recentMessages: readonly AgentMessage[];
  summary: AgentConversationSummary;
  relevantMemories: readonly AgentMemoryRecord[];
};

const emptySummary = (timestamp: string): AgentConversationSummary => ({
  overview: "No conversation summary yet.", decisions: [], unresolvedFollowUps: [], updatedAt: timestamp,
});

export function autoTitleAgentConversation(firstMessage: string) {
  const title = firstMessage.trim().replace(/\s+/g, " ");
  return title ? title.slice(0, 60) : "New conversation";
}

export class PersistentAgentConversationRepository {
  constructor(
    private readonly storage: AgentPersistenceStorage,
    private readonly namespace = "beastagents:conversations",
    private readonly now = () => new Date().toISOString(),
    private readonly createId = () => `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  ) {}

  create(input: { ownerId: string; agentId: string; title?: string; tags?: readonly string[] }) {
    const timestamp = this.now();
    const thread: AgentConversationThread = {
      id: this.createId(), ownerId: input.ownerId, agentId: input.agentId,
      title: input.title?.trim() || "New conversation", createdAt: timestamp, updatedAt: timestamp,
      messages: [], messageCount: 0, pinned: false, archived: false, tags: input.tags || [],
      summary: emptySummary(timestamp), relatedInsightIds: [], relatedActionIds: [],
    };
    this.write(thread);
    return thread;
  }

  get(ownerId: string, threadId: string) {
    const thread = this.readAll(ownerId).find((item) => item.id === threadId);
    if (!thread) throw new Error(`Conversation ${threadId} is not available for this owner.`);
    return thread;
  }

  list(input: { ownerId: string; agentId: string; includeArchived?: boolean; search?: string }) {
    const query = input.search?.trim().toLowerCase();
    return this.readAll(input.ownerId)
      .filter((item) => item.agentId === input.agentId)
      .filter((item) => input.includeArchived || !item.archived)
      .filter((item) => !query || [item.title, item.summary.overview, ...item.tags].join(" ").toLowerCase().includes(query))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }

  append(ownerId: string, threadId: string, messages: readonly AgentMessage[], related?: { insightIds?: readonly string[]; actionIds?: readonly string[] }) {
    const current = this.get(ownerId, threadId);
    const combined = [...current.messages, ...messages];
    return this.update(ownerId, threadId, {
      messages: combined,
      messageCount: combined.length,
      title: current.messageCount === 0 && messages[0] ? autoTitleAgentConversation(String(messages[0].content)) : current.title,
      relatedInsightIds: Array.from(new Set([...current.relatedInsightIds, ...(related?.insightIds || [])])),
      relatedActionIds: Array.from(new Set([...current.relatedActionIds, ...(related?.actionIds || [])])),
    });
  }

  rename(ownerId: string, threadId: string, title: string) {
    if (!title.trim()) throw new Error("Conversation title is required.");
    return this.update(ownerId, threadId, { title: title.trim() });
  }
  pin(ownerId: string, threadId: string, pinned: boolean) { return this.update(ownerId, threadId, { pinned }); }
  archive(ownerId: string, threadId: string, archived = true) { return this.update(ownerId, threadId, { archived }); }
  summarize(ownerId: string, threadId: string, summary: AgentConversationSummary) { return this.update(ownerId, threadId, { summary }); }
  tag(ownerId: string, threadId: string, tags: readonly string[]) { return this.update(ownerId, threadId, { tags }); }

  delete(ownerId: string, threadId: string, confirmed: boolean) {
    if (!confirmed) throw new Error("Conversation deletion requires confirmation.");
    this.get(ownerId, threadId);
    this.storage.removeItem(this.key(ownerId, threadId));
  }

  context(ownerId: string, threadId: string, memories: readonly AgentMemoryRecord[], recentLimit = 12): AgentConversationContext {
    const thread = this.get(ownerId, threadId);
    return { thread, recentMessages: thread.messages.slice(-recentLimit), summary: thread.summary,
      relevantMemories: memories.filter((item) => item.ownerId === ownerId && item.agentId === thread.agentId && item.value && (!item.evidence?.length || item.evidence.some((evidence) => evidence.source === threadId))), };
  }

  private update(ownerId: string, threadId: string, patch: Partial<AgentConversationThread>) {
    const current = this.get(ownerId, threadId);
    const updated = { ...current, ...patch, id: current.id, ownerId: current.ownerId, agentId: current.agentId, updatedAt: this.now() };
    this.write(updated);
    return updated;
  }
  private write(thread: AgentConversationThread) { this.storage.setItem(this.key(thread.ownerId, thread.id), JSON.stringify(thread)); }
  private key(ownerId: string, threadId: string) { return `${this.namespace}:${ownerId}:${threadId}`; }
  private readAll(ownerId: string) {
    const records: AgentConversationThread[] = [];
    for (let index = 0; index < this.storage.length; index += 1) {
      const key = this.storage.key(index);
      if (key?.startsWith(`${this.namespace}:${ownerId}:`)) {
        const value = this.storage.getItem(key);
        if (value) records.push(JSON.parse(value) as AgentConversationThread);
      }
    }
    return records;
  }
}

export class PersistentAgentMemoryStore implements AgentMemoryStore {
  constructor(private readonly storage: AgentPersistenceStorage, private readonly namespace = "beastagents:memory") {}
  async put(record: AgentMemoryRecord) {
    if (!record.id.trim() || !record.ownerId.trim() || !record.purpose.trim()) throw new Error("Agent memory id, owner, and purpose are required.");
    const existing = await this.query({ agentId: record.agentId, ownerId: record.ownerId });
    const collision = existing.find((item) => item.id === record.id);
    if (collision && (collision.ownerId !== record.ownerId || collision.agentId !== record.agentId)) throw new Error(`Agent memory ${record.id} belongs to a different owner or agent.`);
    this.storage.setItem(this.key(record), JSON.stringify(record)); return record;
  }
  async query(input: { agentId: string; ownerId: string; scope?: AgentMemoryRecord["scope"] }) {
    const records: AgentMemoryRecord[] = [];
    const prefix = `${this.namespace}:${input.ownerId}:${input.agentId}:`;
    for (let index = 0; index < this.storage.length; index += 1) { const key = this.storage.key(index); if (key?.startsWith(prefix)) { const raw = this.storage.getItem(key); if (raw) records.push(JSON.parse(raw)); } }
    return records.filter((item) => (!input.scope || item.scope === input.scope) && (!item.expiresAt || Date.parse(item.expiresAt) > Date.now()));
  }
  async delete(input: { agentId: string; ownerId: string; id?: string }) {
    const records = await this.query(input); const targets = input.id ? records.filter((item) => item.id === input.id) : records;
    targets.forEach((item) => this.storage.removeItem(this.key(item))); return targets.length;
  }
  async correct(input: { agentId: string; ownerId: string; id: string; value: unknown; updatedAt: string }) {
    const record = (await this.query(input)).find((item) => item.id === input.id);
    if (!record) throw new Error(`Agent memory ${input.id} is not available for this owner.`);
    return this.put({ ...record, value: input.value, updatedAt: input.updatedAt });
  }
  private key(record: Pick<AgentMemoryRecord, "ownerId" | "agentId" | "id">) { return `${this.namespace}:${record.ownerId}:${record.agentId}:${record.id}`; }
}
