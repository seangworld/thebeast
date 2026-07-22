import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentMemoryStore } from "./memory";
import type { AgentMemoryRecord, AgentMessage } from "./types";
import {
  autoTitleAgentConversation,
  type AgentConversationSummary,
  type AgentConversationThread,
  type AgentPersistenceStorage,
} from "./conversationPersistence";

export type ConversationMemoryDeleteAction = "retain" | "delete-linked";

export interface AgentConversationServerStore {
  list(ownerId: string, agentId: string): Promise<AgentConversationThread[]>;
  get(ownerId: string, conversationId: string): Promise<AgentConversationThread | null>;
  save(thread: AgentConversationThread): Promise<void>;
  appendMessages(ownerId: string, conversationId: string, messages: readonly AgentMessage[]): Promise<void>;
  delete(ownerId: string, conversationId: string, memoryAction: ConversationMemoryDeleteAction): Promise<void>;
}

function assertOwner(ownerId: string, recordOwnerId: string) {
  if (!ownerId || ownerId !== recordOwnerId) throw new Error("Agent record is not available for this owner.");
}

const emptySummary = (timestamp: string): AgentConversationSummary => ({
  overview: "No conversation summary yet.", decisions: [], unresolvedFollowUps: [], updatedAt: timestamp,
});

export class ServerAgentConversationRepository {
  constructor(
    private readonly store: AgentConversationServerStore,
    private readonly now = () => new Date().toISOString(),
    private readonly createId: () => string = () => crypto.randomUUID()
  ) {}

  async create(input: { ownerId: string; agentId: string; title?: string; tags?: readonly string[] }) {
    const timestamp = this.now();
    const thread: AgentConversationThread = {
      id: this.createId(), ownerId: input.ownerId, agentId: input.agentId,
      title: input.title?.trim() || "New conversation", createdAt: timestamp, updatedAt: timestamp,
      messages: [], messageCount: 0, pinned: false, archived: false, tags: input.tags || [],
      summary: emptySummary(timestamp), relatedInsightIds: [], relatedActionIds: [],
    };
    await this.store.save(thread);
    return thread;
  }

  async get(ownerId: string, conversationId: string) {
    const thread = await this.store.get(ownerId, conversationId);
    if (!thread) throw new Error(`Conversation ${conversationId} is not available for this owner.`);
    assertOwner(ownerId, thread.ownerId);
    return thread;
  }

  async list(input: { ownerId: string; agentId: string; includeArchived?: boolean; search?: string }) {
    const query = input.search?.trim().toLowerCase();
    return (await this.store.list(input.ownerId, input.agentId))
      .filter((thread) => input.includeArchived || !thread.archived)
      .filter((thread) => !query || [thread.title, thread.summary.overview, ...thread.tags].join(" ").toLowerCase().includes(query))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }

  async append(ownerId: string, conversationId: string, messages: readonly AgentMessage[], related?: { insightIds?: readonly string[]; actionIds?: readonly string[] }) {
    const current = await this.get(ownerId, conversationId);
    await this.store.appendMessages(ownerId, conversationId, messages);
    const combined = [...current.messages, ...messages];
    const updated: AgentConversationThread = {
      ...current,
      messages: combined,
      messageCount: combined.length,
      title: current.messageCount === 0 && messages[0] ? autoTitleAgentConversation(String(messages[0].content)) : current.title,
      relatedInsightIds: Array.from(new Set([...current.relatedInsightIds, ...(related?.insightIds || [])])),
      relatedActionIds: Array.from(new Set([...current.relatedActionIds, ...(related?.actionIds || [])])),
      updatedAt: this.now(),
    };
    await this.store.save(updated);
    return updated;
  }

  async rename(ownerId: string, conversationId: string, title: string) {
    if (!title.trim()) throw new Error("Conversation title is required.");
    return this.update(ownerId, conversationId, { title: title.trim() });
  }
  async pin(ownerId: string, conversationId: string, pinned: boolean) { return this.update(ownerId, conversationId, { pinned }); }
  async archive(ownerId: string, conversationId: string, archived = true) { return this.update(ownerId, conversationId, { archived }); }
  async summarize(ownerId: string, conversationId: string, summary: AgentConversationSummary) { return this.update(ownerId, conversationId, { summary }); }
  async tag(ownerId: string, conversationId: string, tags: readonly string[]) { return this.update(ownerId, conversationId, { tags }); }
  async delete(ownerId: string, conversationId: string, confirmed: boolean, memoryAction: ConversationMemoryDeleteAction) {
    if (!confirmed) throw new Error("Conversation deletion requires confirmation.");
    await this.get(ownerId, conversationId);
    await this.store.delete(ownerId, conversationId, memoryAction);
  }

  async importLegacy(input: { ownerId: string; agentId: string; storage: AgentPersistenceStorage }) {
    const marker = `beastagents:server-imported:${input.ownerId}:${input.agentId}`;
    if (input.storage.getItem(marker)) return 0;
    const prefix = `beastagents:conversations:${input.ownerId}:`;
    let imported = 0;
    for (let index = 0; index < input.storage.length; index += 1) {
      const key = input.storage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const raw = input.storage.getItem(key);
      if (!raw) continue;
      const thread = JSON.parse(raw) as AgentConversationThread;
      if (thread.ownerId !== input.ownerId || thread.agentId !== input.agentId) continue;
      if (await this.store.get(input.ownerId, thread.id)) continue;
      await this.store.save(thread);
      await this.store.appendMessages(input.ownerId, thread.id, thread.messages);
      imported += 1;
    }
    input.storage.setItem(marker, new Date().toISOString());
    return imported;
  }

  private async update(ownerId: string, conversationId: string, patch: Partial<AgentConversationThread>) {
    const current = await this.get(ownerId, conversationId);
    const updated = { ...current, ...patch, id: current.id, ownerId: current.ownerId, agentId: current.agentId, updatedAt: this.now() };
    await this.store.save(updated);
    return updated;
  }
}

type ConversationRow = {
  id: string; owner_id: string; agent_id: string; title: string; pinned: boolean; archived: boolean;
  tags: string[]; summary: AgentConversationSummary; related_insight_ids: string[]; related_action_ids: string[];
  message_count: number; created_at: string; updated_at: string;
  agent_conversation_messages?: MessageRow[];
};
type MessageRow = { id: string; conversation_id: string; sender: AgentMessage["sender"]; recipient: AgentMessage["recipient"]; content: unknown; created_at: string };

export class SupabaseAgentConversationStore implements AgentConversationServerStore {
  constructor(private readonly client: SupabaseClient) {}
  async list(ownerId: string, agentId: string) {
    const { data, error } = await this.client.from("agent_conversations").select("*, agent_conversation_messages(*)").eq("owner_id", ownerId).eq("agent_id", agentId).order("updated_at", { ascending: false });
    if (error) throw error;
    return ((data || []) as ConversationRow[]).map(mapConversationRow);
  }
  async get(ownerId: string, conversationId: string) {
    const { data, error } = await this.client.from("agent_conversations").select("*, agent_conversation_messages(*)").eq("owner_id", ownerId).eq("id", conversationId).maybeSingle();
    if (error) throw error;
    return data ? mapConversationRow(data as ConversationRow) : null;
  }
  async save(thread: AgentConversationThread) {
    const { error } = await this.client.from("agent_conversations").upsert({
      id: thread.id, owner_id: thread.ownerId, agent_id: thread.agentId, title: thread.title,
      pinned: thread.pinned, archived: thread.archived, tags: [...thread.tags], summary: thread.summary,
      related_insight_ids: [...thread.relatedInsightIds], related_action_ids: [...thread.relatedActionIds],
      message_count: thread.messageCount, created_at: thread.createdAt, updated_at: thread.updatedAt,
    }, { onConflict: "id" });
    if (error) throw error;
  }
  async appendMessages(ownerId: string, conversationId: string, messages: readonly AgentMessage[]) {
    if (!messages.length) return;
    const rows = messages.map((message) => ({ id: message.id, owner_id: ownerId, conversation_id: conversationId, sender: message.sender, recipient: message.recipient, content: message.content, created_at: message.timestamp }));
    const { error } = await this.client.from("agent_conversation_messages").upsert(rows, { onConflict: "id" });
    if (error) throw error;
  }
  async delete(ownerId: string, conversationId: string, memoryAction: ConversationMemoryDeleteAction) {
    if (memoryAction === "delete-linked") {
      const memoryResult = await this.client.from("agent_memories").delete().eq("owner_id", ownerId).eq("source_conversation_id", conversationId);
      if (memoryResult.error) throw memoryResult.error;
    }
    const { error } = await this.client.from("agent_conversations").delete().eq("owner_id", ownerId).eq("id", conversationId);
    if (error) throw error;
  }
}

function mapConversationRow(row: ConversationRow): AgentConversationThread {
  const messages = [...(row.agent_conversation_messages || [])]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((message): AgentMessage => ({ id: message.id, threadId: message.conversation_id, sender: message.sender, recipient: message.recipient, content: message.content, timestamp: message.created_at }));
  return { id: row.id, ownerId: row.owner_id, agentId: row.agent_id, title: row.title, pinned: row.pinned, archived: row.archived, tags: row.tags || [], summary: { ...row.summary, updatedAt: row.summary.updatedAt || row.updated_at }, relatedInsightIds: row.related_insight_ids || [], relatedActionIds: row.related_action_ids || [], messages, messageCount: row.message_count, createdAt: row.created_at, updatedAt: row.updated_at };
}

type MemoryRow = { id: string; owner_id: string; agent_id: string; scope: AgentMemoryRecord["scope"]; memory_key: string; value: unknown; purpose: string; evidence: AgentMemoryRecord["evidence"]; expires_at?: string | null; created_at: string; updated_at: string };

export class SupabaseAgentMemoryStore implements AgentMemoryStore {
  constructor(private readonly client: SupabaseClient) {}
  async put(record: AgentMemoryRecord) {
    const value = record.value as { sourceConversationId?: string; sourceMessageId?: string };
    const { error } = await this.client.from("agent_memories").upsert({ id: record.id, owner_id: record.ownerId, agent_id: record.agentId, scope: record.scope, memory_key: record.key, value: record.value, purpose: record.purpose, evidence: record.evidence || [], source_conversation_id: value?.sourceConversationId || null, source_message_id: value?.sourceMessageId || null, expires_at: record.expiresAt || null, created_at: record.createdAt, updated_at: record.updatedAt }, { onConflict: "id" });
    if (error) throw error;
    return record;
  }
  async query(input: { agentId: string; ownerId: string; scope?: AgentMemoryRecord["scope"] }) {
    let query = this.client.from("agent_memories").select("*").eq("owner_id", input.ownerId).eq("agent_id", input.agentId);
    if (input.scope) query = query.eq("scope", input.scope);
    const { data, error } = await query.order("updated_at", { ascending: false });
    if (error) throw error;
    return ((data || []) as MemoryRow[]).map((row) => ({ id: row.id, agentId: row.agent_id, ownerId: row.owner_id, scope: row.scope, key: row.memory_key, value: row.value, purpose: row.purpose, evidence: row.evidence, expiresAt: row.expires_at || undefined, createdAt: row.created_at, updatedAt: row.updated_at }));
  }
  async delete(input: { agentId: string; ownerId: string; id?: string }) {
    let query = this.client.from("agent_memories").delete().eq("owner_id", input.ownerId).eq("agent_id", input.agentId);
    if (input.id) query = query.eq("id", input.id);
    const { data, error } = await query.select("id");
    if (error) throw error;
    return data?.length || 0;
  }
  async correct(input: { agentId: string; ownerId: string; id: string; value: unknown; updatedAt: string }) {
    const { data, error } = await this.client.from("agent_memories").update({ value: input.value, updated_at: input.updatedAt }).eq("owner_id", input.ownerId).eq("agent_id", input.agentId).eq("id", input.id).select("*").single();
    if (error) throw error;
    const row = data as MemoryRow;
    return { id: row.id, agentId: row.agent_id, ownerId: row.owner_id, scope: row.scope, key: row.memory_key, value: row.value, purpose: row.purpose, evidence: row.evidence, expiresAt: row.expires_at || undefined, createdAt: row.created_at, updatedAt: row.updated_at };
  }
  async importLegacy(input: { ownerId: string; agentId: string; storage: AgentPersistenceStorage }) {
    const marker = `beastagents:server-memory-imported:${input.ownerId}:${input.agentId}`;
    if (input.storage.getItem(marker)) return 0;
    const prefix = `beastagents:memory:${input.ownerId}:${input.agentId}:`;
    let imported = 0;
    for (let index = 0; index < input.storage.length; index += 1) {
      const key = input.storage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const raw = input.storage.getItem(key);
      if (!raw) continue;
      const record = JSON.parse(raw) as AgentMemoryRecord;
      if (record.ownerId !== input.ownerId || record.agentId !== input.agentId) continue;
      await this.put(record);
      imported += 1;
    }
    input.storage.setItem(marker, new Date().toISOString());
    return imported;
  }
}
