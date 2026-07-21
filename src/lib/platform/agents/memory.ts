import type { AgentMemoryRecord, AgentMemoryScope } from "./types";

export interface AgentMemoryStore {
  put(record: AgentMemoryRecord): Promise<AgentMemoryRecord>;
  query(input: { agentId: string; ownerId: string; scope?: AgentMemoryScope }): Promise<readonly AgentMemoryRecord[]>;
  delete(input: { agentId: string; ownerId: string; id?: string }): Promise<number>;
}

export class InMemoryAgentMemoryStore implements AgentMemoryStore {
  private readonly records = new Map<string, AgentMemoryRecord>();

  async put(record: AgentMemoryRecord) {
    if (!record.id.trim() || !record.ownerId.trim() || !record.purpose.trim()) {
      throw new Error("Agent memory id, owner, and purpose are required.");
    }
    const existing = this.records.get(record.id);
    if (existing && (existing.ownerId !== record.ownerId || existing.agentId !== record.agentId)) {
      throw new Error(`Agent memory ${record.id} belongs to a different owner or agent.`);
    }
    this.records.set(record.id, Object.freeze({ ...record }));
    return record;
  }

  async query({ agentId, ownerId, scope }: { agentId: string; ownerId: string; scope?: AgentMemoryScope }) {
    const now = Date.now();
    return Array.from(this.records.values()).filter(
      (record) =>
        record.agentId === agentId &&
        record.ownerId === ownerId &&
        (!scope || record.scope === scope) &&
        (!record.expiresAt || Date.parse(record.expiresAt) > now),
    );
  }

  async delete({ agentId, ownerId, id }: { agentId: string; ownerId: string; id?: string }) {
    let deleted = 0;
    for (const [recordId, record] of Array.from(this.records.entries())) {
      if (record.agentId === agentId && record.ownerId === ownerId && (!id || id === recordId)) {
        this.records.delete(recordId);
        deleted += 1;
      }
    }
    return deleted;
  }
}
