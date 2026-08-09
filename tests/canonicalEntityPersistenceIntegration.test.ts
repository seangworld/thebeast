import assert from "node:assert/strict";
import test from "node:test";
// Node 24 provides this built-in database; the repository's older @types/node does not declare it yet.
// @ts-expect-error runtime-provided Node 24 module
import { DatabaseSync } from "node:sqlite";
import { loadCanonicalMemberHealthRecords } from "../src/lib/health/canonicalRecords";
import { applyApprovedKnowledgeProposal } from "../src/lib/digitalStaffRuntime/persistence";
import { decomposeHistoricalProposals, reconcileHistoricalProposals, type CanonicalKnowledgeRecord, type HistoricalConversationMessage, type StructuredKnowledgeProposal } from "../src/lib/digitalStaffRuntime";
import { presentCanonicalHealthRecords } from "../src/lib/health/canonicalRecords";

type Row = Record<string, unknown>;

class SqliteHealthQuery {
  private operation: "select" | "insert" | "update" = "select";
  private payload: Row | null = null;
  private filters: Array<[string, unknown]> = [];
  private maxRows: number | null = null;
  constructor(private readonly db: DatabaseSync) {}
  select() { return this; }
  insert(payload: Row) { this.operation = "insert"; this.payload = payload; return this; }
  update(payload: Row) { this.operation = "update"; this.payload = payload; return this; }
  eq(column: string, value: unknown) { this.filters.push([column, value]); return this; }
  limit(value: number) { this.maxRows = value; return this; }
  order() { return this; }
  private where() {
    const clauses = this.filters.map(([column]) => column.startsWith("details->>") ? `json_extract(details, '$.${column.slice(10)}') = ?` : `${column} = ?`);
    return { sql: clauses.length ? ` where ${clauses.join(" and ")}` : "", values: this.filters.map(([, value]) => value) };
  }
  private rows() {
    const where = this.where();
    const limit = this.maxRows ? ` limit ${this.maxRows}` : "";
    return this.db.prepare(`select * from beast_health_records${where.sql} order by created_at desc${limit}`).all(...where.values).map((row: Row) => ({ ...row, details: JSON.parse(String(row.details || "{}")) }));
  }
  async maybeSingle() { return { data: this.rows()[0] || null, error: null }; }
  async single() {
    if (this.operation === "insert" && this.payload) {
      const id = `record-${crypto.randomUUID()}`;
      const now = new Date().toISOString();
      const row: Row = { id, created_at: now, updated_at: now, occurred_on: null, notes: null, ...this.payload };
      this.db.prepare("insert into beast_health_records (id, owner_id, record_type, title, status, occurred_on, source, details, notes, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(row.id, row.owner_id, row.record_type, row.title, row.status, row.occurred_on, row.source, JSON.stringify(row.details), row.notes, row.created_at, row.updated_at);
      return { data: { id }, error: null };
    }
    return { data: this.rows()[0] || null, error: null };
  }
  then(resolve: (value: { data: Row[]; error: null }) => unknown, reject: (reason: unknown) => unknown) {
    return Promise.resolve({ data: this.rows(), error: null }).then(resolve, reject);
  }
}

class SqliteHealthClient {
  constructor(readonly db: DatabaseSync) {}
  from(table: string) {
    if (table !== "beast_health_records") throw new Error(`Unexpected table ${table}`);
    return new SqliteHealthQuery(this.db);
  }
}

class SqliteEducationQuery {
  private operation: "select" | "insert" = "select";
  private payload: Row | null = null;
  private filters: Array<[string, unknown]> = [];
  constructor(private readonly db: DatabaseSync) {}
  select() { return this; }
  insert(payload: Row) { this.operation = "insert"; this.payload = payload; return this; }
  update() { throw new Error("Unexpected Education update"); }
  eq(column: string, value: unknown) { this.filters.push([column, value]); return this; }
  limit() { return this; }
  private rows() {
    const clauses = this.filters.map(([column]) => column.startsWith("details->>") ? `json_extract(details, '$.${column.slice(10)}') = ?` : `${column} = ?`);
    const where = clauses.length ? ` where ${clauses.join(" and ")}` : "";
    return this.db.prepare(`select * from education_career_profile_items${where}`).all(...this.filters.map(([, value]) => value)).map((row: Row) => ({ ...row, details: JSON.parse(String(row.details || "{}")) }));
  }
  async maybeSingle() { return { data: this.rows()[0] || null, error: null }; }
  async single() {
    if (this.operation === "insert" && this.payload) {
      const id = `education-${crypto.randomUUID()}`;
      const row: Row = { id, ...this.payload };
      this.db.prepare("insert into education_career_profile_items (id, owner_id, phase, category, label, value, verification_status, confidence, details, source_type, source_reference) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(id, row.owner_id, row.phase, row.category, row.label, row.value, row.verification_status, row.confidence, JSON.stringify(row.details), row.source_type, row.source_reference);
      return { data: { id }, error: null };
    }
    return { data: this.rows()[0] || null, error: null };
  }
}

class SqliteEducationClient {
  constructor(readonly db: DatabaseSync) {}
  from(table: string) {
    if (table !== "education_career_profile_items") throw new Error(`Unexpected table ${table}`);
    return new SqliteEducationQuery(this.db);
  }
}

function proposal(): StructuredKnowledgeProposal {
  return { id: "aggregate-proposal", domain: "health", entityType: "medication", fields: { name: "Medication A, Medication B, Supplement C, Medication D and Medication E" }, sourceMessageId: "historical-message", confidence: 0.94, missingFields: [], contradictions: [], approvalStatus: "proposed", relatedRecordId: null, proposedAction: "create" };
}

test("BH-206 persists five decomposed records and reloads five workspace entities from a database", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("create table beast_health_records (id text primary key, owner_id text not null, record_type text not null, title text not null, status text not null, occurred_on text, source text, details text not null, notes text, created_at text not null, updated_at text not null)");
  const ownerId = "owner-1";
  const historical: HistoricalConversationMessage = { id: "historical-message", role: "user", text: "I take Medication A, Medication B, Supplement C, Medication D and Medication E.", createdAt: "2025-01-02T12:00:00.000Z", ownerId, conversationId: "conversation-1", professionalId: "beasthealth.health-advisor" };
  db.prepare("insert into beast_health_records values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("aggregate", ownerId, "medication", "Current medications", "active", null, "Member-reported Health Advisor conversation", JSON.stringify({ topic: "health-medications-needed", context: historical.text }), null, historical.createdAt, historical.createdAt);

  const decomposed = decomposeHistoricalProposals(historical, [proposal()]);
  const reconciled = reconcileHistoricalProposals({ professionalId: historical.professionalId, message: historical, proposals: decomposed, canonicalRecords: [], reconciledAt: "2026-08-09T12:00:00.000Z" });
  const client = new SqliteHealthClient(db);
  for (const item of reconciled.proposals) await applyApprovedKnowledgeProposal({ client: client as never, ownerId, professionalId: historical.professionalId, proposal: item });

  const workspaceRecords = await loadCanonicalMemberHealthRecords(client as never, ownerId);
  assert.equal(workspaceRecords.length, 5);
  assert.deepEqual(workspaceRecords.map((record) => record.title).sort(), ["Medication A", "Medication B", "Medication D", "Medication E", "Supplement C"]);
  assert.equal(workspaceRecords.some((record) => record.title === "Current medications"), false);

  for (const item of reconciled.proposals) await applyApprovedKnowledgeProposal({ client: client as never, ownerId, professionalId: historical.professionalId, proposal: item });
  assert.equal(Number((db.prepare("select count(*) as count from beast_health_records where owner_id = ?").get(ownerId) as { count: number }).count), 6);

  const canonical: CanonicalKnowledgeRecord[] = workspaceRecords.map((record) => ({ id: record.id, domain: "health", entityType: String(record.details.subtype || record.recordType), fields: record.details }));
  const rerun = reconcileHistoricalProposals({ professionalId: historical.professionalId, message: historical, proposals: decomposed, canonicalRecords: canonical, reconciledAt: "2026-08-09T12:05:00.000Z" });
  assert.equal(rerun.proposals.length, 0, JSON.stringify(rerun.proposals));
  db.close();
});

test("BH-209 keeps a legacy aggregate visible until every preserved item is accepted", () => {
  const base = { ownerId: "owner-1", status: "active" as const, occurredOn: null, source: "Member-reported Health Advisor conversation", notes: null, createdAt: "2026-08-09T12:00:00.000Z", updatedAt: "2026-08-09T12:00:00.000Z" };
  const aggregate = { id: "aggregate", recordType: "medication" as const, title: "Current medications", details: { topic: "health-medications-needed", context: "I take Medication A, Medication B, Supplement C, Medication D and Medication E." }, ...base };
  const partial = [aggregate, ...["Medication A", "Medication B"].map((title, index) => ({ id: `canonical-${index}`, recordType: "medication" as const, title, details: { medicationName: title }, ...base }))];
  assert.equal(presentCanonicalHealthRecords(partial).some((record) => record.id === "aggregate"), true);
  const complete = [...partial, ...["Supplement C", "Medication D", "Medication E"].map((title, index) => ({ id: `canonical-rest-${index}`, recordType: "medication" as const, title, details: { medicationName: title }, ...base }))];
  assert.equal(presentCanonicalHealthRecords(complete).some((record) => record.id === "aggregate"), false);
});

test("BE-206 persists mixed historical Education entities as separate database records", async () => {
  const db = new DatabaseSync(":memory:");
  db.exec("create table education_career_profile_items (id text primary key, owner_id text not null, phase text, category text not null, label text not null, value text not null, verification_status text, confidence real, details text not null, source_type text, source_reference text)");
  const ownerId = "owner-education";
  const historical: HistoricalConversationMessage = { id: "education-message", role: "user", text: "I attended a school, served in the military, work for an employer, and prefer certifications.", createdAt: "2025-01-02T12:00:00.000Z", ownerId, conversationId: "education-conversation", professionalId: "beasteducation.guidance-counselor" };
  const extracted: StructuredKnowledgeProposal[] = [
    { ...proposal(), id: "school", domain: "education", entityType: "school", fields: { institution: "School A" }, sourceMessageId: historical.id },
    { ...proposal(), id: "military", domain: "military", entityType: "military_service", fields: { branch: "Service branch" }, sourceMessageId: historical.id },
    { ...proposal(), id: "employment", domain: "employment", entityType: "employment", fields: { employer: "Employer A" }, sourceMessageId: historical.id },
    { ...proposal(), id: "preference", domain: "preference", entityType: "education_preference", fields: { preference: "Certifications" }, sourceMessageId: historical.id },
  ];
  const reconciled = reconcileHistoricalProposals({ professionalId: historical.professionalId, message: historical, proposals: extracted, canonicalRecords: [], reconciledAt: "2026-08-09T12:00:00.000Z" });
  const client = new SqliteEducationClient(db);
  for (const item of reconciled.proposals) await applyApprovedKnowledgeProposal({ client: client as never, ownerId, professionalId: historical.professionalId, proposal: item });
  const rows = db.prepare("select category, label, value from education_career_profile_items where owner_id = ? order by category").all(ownerId) as Row[];
  assert.equal(rows.length, 4);
  assert.deepEqual(new Set(rows.map((row) => row.category)), new Set(["school", "military", "employment", "other"]));
  assert.ok(rows.every((row) => JSON.parse(String(row.value)).sourceMessageId === historical.id));
  for (const item of reconciled.proposals) await applyApprovedKnowledgeProposal({ client: client as never, ownerId, professionalId: historical.professionalId, proposal: item });
  assert.equal((db.prepare("select count(*) as count from education_career_profile_items").get() as { count: number }).count, 4);
  db.close();
});
