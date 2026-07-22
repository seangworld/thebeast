import assert from "node:assert/strict";
import test from "node:test";
import { PersistentAgentConversationRepository, PersistentAgentMemoryStore, type AgentMemoryRecord, type AgentMessage } from "../src/lib/platform/agents";

class Storage { private values = new Map<string, string>(); get length() { return this.values.size; } key(index: number) { return Array.from(this.values.keys())[index] || null; } getItem(key: string) { return this.values.get(key) || null; } setItem(key: string, value: string) { this.values.set(key, value); } removeItem(key: string) { this.values.delete(key); } }
const now = () => "2026-07-23T12:00:00.000Z";
const message = (threadId: string, content: unknown, id = "message-1"): AgentMessage => ({ id, threadId, sender: { kind: "user", id: "owner-1" }, recipient: { kind: "agent", id: "money-coach" }, content, timestamp: now() });

test("MC-209 saves owner-scoped threads with auto titles transcripts and summaries", () => {
  const repository = new PersistentAgentConversationRepository(new Storage(), "test", now, () => "thread-1");
  const created = repository.create({ ownerId: "owner-1", agentId: "money-coach" });
  repository.append("owner-1", created.id, [message(created.id, "How is my debt payoff progressing?")]);
  repository.summarize("owner-1", created.id, { overview: "Reviewed debt progress.", decisions: [], unresolvedFollowUps: ["Review payment"], updatedAt: now() });
  const restored = repository.get("owner-1", created.id);
  assert.equal(restored.title, "How is my debt payoff progressing?"); assert.equal(restored.messageCount, 1); assert.match(restored.summary.overview, /debt/);
  assert.throws(() => repository.get("owner-2", created.id), /not available/);
});

test("MC-209 supports rename search pin archive resume and confirmed deletion", () => {
  const repository = new PersistentAgentConversationRepository(new Storage(), "test", now, () => "thread-1");
  const thread = repository.create({ ownerId: "owner-1", agentId: "money-coach", tags: ["debt"] });
  repository.rename("owner-1", thread.id, "Debt review"); repository.pin("owner-1", thread.id, true);
  assert.equal(repository.list({ ownerId: "owner-1", agentId: "money-coach", search: "debt" })[0].pinned, true);
  repository.archive("owner-1", thread.id); assert.equal(repository.list({ ownerId: "owner-1", agentId: "money-coach" }).length, 0);
  assert.throws(() => repository.delete("owner-1", thread.id, false), /confirmation/);
  repository.delete("owner-1", thread.id, true); assert.equal(repository.list({ ownerId: "owner-1", agentId: "money-coach", includeArchived: true }).length, 0);
});

test("MC-209 keeps durable memory separate correctable removable and owner scoped", async () => {
  const store = new PersistentAgentMemoryStore(new Storage(), "memory");
  const record: AgentMemoryRecord = { id: "memory-1", agentId: "money-coach", ownerId: "owner-1", scope: "user", key: "preference", value: "Prefer concise updates", purpose: "Communication preference", evidence: [{ source: "thread-1", capturedAt: now(), description: "message-1" }], createdAt: now(), updatedAt: now() };
  await store.put(record); assert.equal((await store.query({ agentId: "money-coach", ownerId: "owner-1" })).length, 1); assert.equal((await store.query({ agentId: "money-coach", ownerId: "owner-2" })).length, 0);
  assert.equal((await store.correct({ agentId: "money-coach", ownerId: "owner-1", id: "memory-1", value: "Prefer detailed updates", updatedAt: now() })).value, "Prefer detailed updates");
  assert.equal(await store.delete({ agentId: "money-coach", ownerId: "owner-1", id: "memory-1" }), 1);
});

test("MC-209 assembles bounded recent context", () => {
  const repository = new PersistentAgentConversationRepository(new Storage(), "test", now, () => "thread-1"); const thread = repository.create({ ownerId: "owner-1", agentId: "money-coach" });
  repository.append("owner-1", thread.id, Array.from({ length: 20 }, (_, index) => message(thread.id, `Message ${index}`, `message-${index}`)));
  const context = repository.context("owner-1", thread.id, [], 6); assert.equal(context.recentMessages.length, 6); assert.equal(context.thread.messages.length, 20);
});
