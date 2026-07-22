import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  ServerAgentConversationRepository,
  type AgentConversationServerStore,
  type AgentConversationThread,
  type AgentMessage,
  type ConversationMemoryDeleteAction,
} from "../src/lib/platform/agents";

class SharedServerStore implements AgentConversationServerStore {
  threads = new Map<string, AgentConversationThread>();
  deletion?: ConversationMemoryDeleteAction;
  async list(ownerId: string, agentId: string) { return Array.from(this.threads.values()).filter((thread) => thread.ownerId === ownerId && thread.agentId === agentId); }
  async get(ownerId: string, conversationId: string) { const thread = this.threads.get(conversationId); return thread?.ownerId === ownerId ? thread : null; }
  async save(thread: AgentConversationThread) { this.threads.set(thread.id, { ...thread }); }
  async appendMessages(ownerId: string, conversationId: string, messages: readonly AgentMessage[]) {
    const thread = await this.get(ownerId, conversationId);
    if (!thread) throw new Error("Conversation is not available for this owner.");
    this.threads.set(thread.id, { ...thread, messages: [...thread.messages, ...messages] });
  }
  async delete(ownerId: string, conversationId: string, memoryAction: ConversationMemoryDeleteAction) {
    const thread = await this.get(ownerId, conversationId);
    if (!thread) throw new Error("Conversation is not available for this owner.");
    this.deletion = memoryAction; this.threads.delete(conversationId);
  }
}

class LegacyStorage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  key(index: number) { return Array.from(this.values.keys())[index] || null; }
  getItem(key: string) { return this.values.get(key) || null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

const now = () => "2026-07-22T20:00:00.000Z";

test("MC-210 restores server conversations across repository sessions", async () => {
  const store = new SharedServerStore();
  const firstSession = new ServerAgentConversationRepository(store, now, () => "server-thread-1");
  const created = await firstSession.create({ ownerId: "owner-1", agentId: "money-coach" });
  await firstSession.append("owner-1", created.id, [{ id: "message-1", threadId: created.id, sender: { kind: "user", id: "owner-1" }, recipient: { kind: "agent", id: "money-coach" }, content: "Review my cash flow", timestamp: now() }]);

  const secondSession = new ServerAgentConversationRepository(store, now);
  const restored = await secondSession.get("owner-1", created.id);
  assert.equal(restored.title, "Review my cash flow");
  assert.equal(restored.messages.length, 1);
  assert.equal((await secondSession.list({ ownerId: "owner-2", agentId: "money-coach", includeArchived: true })).length, 0);
});

test("MC-210 preserves server rename pin archive search and selected memory deletion", async () => {
  const store = new SharedServerStore();
  const repository = new ServerAgentConversationRepository(store, now, () => "server-thread-2");
  const thread = await repository.create({ ownerId: "owner-1", agentId: "money-coach" });
  await repository.rename("owner-1", thread.id, "Debt plan");
  await repository.pin("owner-1", thread.id, true);
  await repository.archive("owner-1", thread.id, true);
  assert.equal((await repository.list({ ownerId: "owner-1", agentId: "money-coach", includeArchived: true, search: "debt" }))[0].pinned, true);
  await repository.delete("owner-1", thread.id, true, "delete-linked");
  assert.equal(store.deletion, "delete-linked");
});

test("MC-210 imports matching legacy conversations once without making local storage authoritative", async () => {
  const store = new SharedServerStore();
  const storage = new LegacyStorage();
  const legacy: AgentConversationThread = { id: "legacy-thread", ownerId: "owner-1", agentId: "money-coach", title: "Imported review", createdAt: now(), updatedAt: now(), messages: [], messageCount: 0, pinned: false, archived: false, tags: [], summary: { overview: "Legacy summary", decisions: [], unresolvedFollowUps: [], updatedAt: now() }, relatedInsightIds: [], relatedActionIds: [] };
  storage.setItem("beastagents:conversations:owner-1:legacy-thread", JSON.stringify(legacy));
  storage.setItem("beastagents:conversations:owner-2:foreign-thread", JSON.stringify({ ...legacy, id: "foreign-thread", ownerId: "owner-2" }));
  const repository = new ServerAgentConversationRepository(store, now);

  assert.equal(await repository.importLegacy({ ownerId: "owner-1", agentId: "money-coach", storage }), 1);
  assert.equal(await repository.importLegacy({ ownerId: "owner-1", agentId: "money-coach", storage }), 0);
  assert.equal((await repository.list({ ownerId: "owner-1", agentId: "money-coach" }))[0].title, "Imported review");
  assert.equal((await repository.list({ ownerId: "owner-2", agentId: "money-coach" })).length, 0);
});

test("MC-210 migration creates specialist-neutral owner-scoped RLS tables", () => {
  const sql = readFileSync("supabase/migrations/20260722000100_add_agent_conversations_and_memory.sql", "utf8");
  for (const table of ["agent_conversations", "agent_conversation_messages", "agent_memories"]) {
    assert.match(sql, new RegExp(`create table if not exists public\\.${table}`));
  }
  assert.equal((sql.match(/enable row level security/g) || []).length, 3);
  assert.match(sql, /auth\.uid\(\) = owner_id/);
  assert.match(sql, /source_conversation_id text references public\.agent_conversations\(id\) on delete set null/);
  assert.doesNotMatch(sql, /money_coach/i);
});
