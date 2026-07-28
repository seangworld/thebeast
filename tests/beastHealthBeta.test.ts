import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildHealthOverview,
  buildHealthTimeline,
  healthAdvisorReadiness,
  healthRecordKinds,
  healthWorkspaceHrefs,
  normalizeHealthRecord,
  type HealthRecord,
} from "../src/lib/health/foundation";

const records: HealthRecord[] = [
  {
    id: "medication-1",
    ownerId: "owner-1",
    recordType: "medication",
    title: "Owner-entered medication",
    status: "active",
    occurredOn: "2026-07-20",
    source: "Owner record",
    details: { context: "Saved schedule" },
    notes: null,
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-07-21T12:00:00.000Z",
  },
  {
    id: "provider-1",
    ownerId: "owner-1",
    recordType: "provider",
    title: "Owner-entered provider",
    status: "active",
    occurredOn: null,
    source: null,
    details: {},
    notes: null,
    createdAt: "2026-07-22T12:00:00.000Z",
    updatedAt: "2026-07-22T12:00:00.000Z",
  },
  {
    id: "archived-1",
    ownerId: "owner-1",
    recordType: "condition",
    title: "Archived record",
    status: "archived",
    occurredOn: "2026-07-01",
    source: null,
    details: {},
    notes: null,
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
  },
];

test("BeastHealth beta defines every requested owner record area", () => {
  assert.deepEqual(healthRecordKinds, [
    "profile",
    "condition",
    "medication",
    "procedure",
    "vital",
    "document",
    "lifestyle",
    "family_history",
    "provider",
  ]);
  assert.equal(healthWorkspaceHrefs.provider, "/dashboard/health/provider-directory");
  assert.equal(healthWorkspaceHrefs.family_history, "/dashboard/health/family-history");
});

test("health overview and timeline derive only from saved non-archived records", () => {
  const overview = buildHealthOverview(records);
  assert.equal(overview.totalRecords, 2);
  assert.equal(overview.counts.medication, 1);
  assert.equal(overview.counts.condition, 0);
  const timeline = buildHealthTimeline(records);
  assert.deepEqual(timeline.map((item) => item.id), ["provider-1", "medication-1"]);
});

test("invalid health rows fail closed instead of becoming display records", () => {
  assert.equal(
    normalizeHealthRecord({
      id: "bad",
      owner_id: "owner-1",
      record_type: "diagnosis-generated-by-ai",
      title: "Invalid",
      status: "active",
      occurred_on: null,
      source: null,
      details: {},
      notes: null,
      created_at: "2026-07-28T12:00:00.000Z",
      updated_at: "2026-07-28T12:00:00.000Z",
    }),
    null
  );
});

test("Health Advisor and execution capabilities remain inactive", () => {
  assert.equal(healthAdvisorReadiness.active, false);
  assert.equal(healthAdvisorReadiness.executionEnabled, false);
  assert.equal(healthAdvisorReadiness.recommendationHistoryEnabled, false);
  assert.equal(healthAdvisorReadiness.confidenceEnabled, false);
  assert.equal(healthAdvisorReadiness.outcomeLearningEnabled, false);
  const workspace = readFileSync(
    "src/app/dashboard/health/BeastHealthWorkspace.tsx",
    "utf8"
  );
  assert.doesNotMatch(workspace, /SupabaseExecutionHistoryStore/);
  assert.doesNotMatch(workspace, /createRecommendation|recordResultAndOutcome/);
});

test("BeastHealth migration is owner-scoped and does not activate the advisor", () => {
  const migration = readFileSync(
    "supabase/migrations/20260728010000_add_beast_health_foundation.sql",
    "utf8"
  );
  assert.match(migration, /create table if not exists public\.beast_health_records/);
  assert.match(migration, /auth\.uid\(\) = owner_id/);
  assert.match(migration, /profiles\.role = 'admin'/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /jsonb_typeof\(details\) = 'object'/);
  assert.doesNotMatch(migration, /execution_requests|execution_recommendations/);
});
