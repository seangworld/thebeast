import assert from "node:assert/strict";
import test from "node:test";
import { applyApprovedKnowledgeProposal } from "../src/lib/digitalStaffRuntime/persistence";

function fakeClient() {
  const calls: Array<{ table: string; operation: string; payload: unknown }> = [];
  const chain: Record<string, unknown> = {
    from(table: string) { this.table = table; return this; },
    insert(payload: unknown) { calls.push({ table: String(this.table), operation: "insert", payload }); return this; },
    update(payload: unknown) { calls.push({ table: String(this.table), operation: "update", payload }); return this; },
    select() { return this; }, eq() { return this; }, limit() { return this; },
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: { id: "canonical-record" }, error: null }),
  };
  return { client: chain as never, calls };
}

const base = { id: "proposal-1", sourceMessageId: "message-1", confidence: 0.92, missingFields: [], contradictions: [], approvalStatus: "proposed" as const, relatedRecordId: null, proposedAction: "create" as const };

test("Health proposals write structured canonical records with provenance", async () => {
  const { client, calls } = fakeClient();
  await applyApprovedKnowledgeProposal({ client, ownerId: "owner-1", professionalId: "beasthealth.health-advisor", proposal: { ...base, domain: "health", entityType: "supplement", fields: { name: "Vitamin D", dose: "1000 IU" } } });
  assert.equal(calls[0].table, "beast_health_records");
  assert.equal((calls[0].payload as { record_type: string }).record_type, "medication");
  assert.equal((calls[0].payload as { details: { sourceMessageId: string } }).details.sourceMessageId, "message-1");
});

test("Education proposals normalize entity categories and avoid raw sentence persistence", async () => {
  const { client, calls } = fakeClient();
  await applyApprovedKnowledgeProposal({ client, ownerId: "owner-1", professionalId: "beasteducation.guidance-counselor", proposal: { ...base, domain: "education", entityType: "institution", fields: { institution: "State University", year: 2026 } } });
  assert.equal(calls[0].table, "education_career_profile_items");
  assert.equal((calls[0].payload as { category: string }).category, "school");
  assert.match((calls[0].payload as { value: string }).value, /State University/);
  assert.doesNotMatch((calls[0].payload as { value: string }).value, /raw sentence/);
});

test("Money priority proposals update the canonical Money goal contract", async () => {
  const { client, calls } = fakeClient();
  await applyApprovedKnowledgeProposal({ client, ownerId: "owner-1", professionalId: "beastmoney.money-coach", proposal: { ...base, domain: "money", entityType: "priority", fields: { priority: "Pay down the highest-interest debt" } } });
  assert.equal(calls[0].table, "beast_goals");
  assert.equal((calls[0].payload as { category: string }).category, "Money");
  assert.equal((calls[0].payload as { source_reference: string }).source_reference, "message-1");
});

test("AP-104 merge updates only the matched owner-scoped Health record contract", async () => {
  const { client, calls } = fakeClient();
  await applyApprovedKnowledgeProposal({ client, ownerId: "owner-1", professionalId: "beasthealth.health-advisor", proposal: { ...base, domain: "health", entityType: "medication", fields: { name: "Metoprolol", dose: "25 mg" }, relatedRecordId: "medication-1", proposedAction: "update" } });
  assert.equal(calls[0].table, "beast_health_records");
  assert.equal(calls[0].operation, "update");
  assert.equal((calls[0].payload as { details: { dose: string } }).details.dose, "25 mg");
});
