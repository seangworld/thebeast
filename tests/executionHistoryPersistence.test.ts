import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  executionHistoryStatuses,
  isExecutionHistoryStatus,
  isRecommendationLifecycleStatus,
  recommendationLifecycleStatuses,
} from "../src/lib/platform/agents/executionHistory";
import { normalizeBeastAdminExecutionHistorySnapshot } from "../src/lib/beastAdminExecutionHistory";

const migration = readFileSync(
  "supabase/migrations/20260728000000_add_execution_history.sql",
  "utf8"
);

test("execution persistence covers the complete deterministic lifecycle", () => {
  assert.deepEqual(executionHistoryStatuses, [
    "queued", "analyzing", "awaiting_context", "awaiting_approval", "approved",
    "executing", "completed", "partially_completed", "blocked", "failed", "canceled",
  ]);
  assert.equal(isExecutionHistoryStatus("awaiting_approval"), true);
  assert.equal(isExecutionHistoryStatus("running"), false);
  for (const status of executionHistoryStatuses) assert.match(migration, new RegExp(`'${status}'`));
});

test("recommendation history supports every required lifecycle decision", () => {
  assert.deepEqual(recommendationLifecycleStatuses, [
    "proposed", "accepted", "declined", "deferred", "superseded", "completed",
  ]);
  assert.equal(isRecommendationLifecycleStatus("declined"), true);
  for (const status of recommendationLifecycleStatuses) assert.match(migration, new RegExp(`'${status}'`));
});

test("migration persists every execution history concept with owner-scoped RLS", () => {
  for (const table of [
    "execution_requests", "execution_plans", "execution_steps", "execution_approvals",
    "execution_results", "execution_outcomes", "execution_recommendations",
    "recommendation_lifecycle_events", "execution_confidence_history",
    "execution_follow_ups", "execution_audit_events",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`'${table}'`));
  }
  assert.equal((migration.match(/enable row level security/g) || []).length, 11);
  assert.match(migration, /auth\.uid\(\) = owner_id/);
  assert.match(migration, /profiles where id = auth\.uid\(\) and role = ''admin''/);
});

test("request creation and transitions atomically write immutable audit events", () => {
  assert.match(migration, /create or replace function public\.create_execution_request/);
  assert.match(migration, /create or replace function public\.transition_execution_request/);
  assert.match(migration, /create or replace function public\.transition_execution_recommendation/);
  assert.match(migration, /insert into public\.execution_audit_events/g);
  assert.match(migration, /Execution history records are immutable/);
  assert.match(migration, /before update or delete/);
  assert.match(migration, /record_initial_recommendation_history/);
  assert.match(migration, /record_execution_evidence_audit/);
  assert.match(migration, /Invalid execution status transition/);
  assert.match(migration, /Invalid recommendation status transition/);
  assert.match(migration, /Execution actor type does not match the authenticated role/);
  assert.match(migration, /Members create member-scoped approvals/);
  assert.match(migration, /BeastAdmin creates owner-scoped approvals/);
  assert.match(migration, /table_name not in/);
  assert.match(migration, /revoke update, delete on public\.execution_requests from authenticated/);
});

test("owner review normalization retains recommendation confidence and limitations", () => {
  const snapshot = normalizeBeastAdminExecutionHistorySnapshot({
    generatedAt: "2026-07-28T12:00:00Z",
    counts: Object.fromEntries(executionHistoryStatuses.map((status) => [status, status === "queued" ? 1 : 0])),
    requests: [{
      id: "request-1",
      ownerId: "owner-1",
      professionalId: "beastmoney.money-coach",
      title: "Review cash flow",
      requestType: "financial_review",
      status: "queued",
      actionClassification: "recommendation_only",
      limitations: ["No bank connection"],
      createdAt: "2026-07-28T12:00:00Z",
      updatedAt: "2026-07-28T12:00:00Z",
      auditEvents: 1,
      approvals: 0,
      results: 0,
      outcomes: 0,
      followUps: 0,
      recommendations: [{
        id: "recommendation-1",
        title: "Review reserve",
        status: "proposed",
        confidence: { label: "moderate" },
        limitations: ["Forecast only"],
        updatedAt: "2026-07-28T12:00:00Z",
      }],
    }],
  });
  assert.equal(snapshot?.requests[0]?.recommendations[0]?.status, "proposed");
  assert.deepEqual(snapshot?.requests[0]?.recommendations[0]?.limitations, ["Forecast only"]);
});

test("owner route and UI report unavailable and empty history honestly", () => {
  const route = readFileSync("src/app/api/admin/execution-history/route.ts", "utf8");
  const workspace = readFileSync(
    "src/app/dashboard/admin/execution-history/BeastAdminExecutionHistoryWorkspace.tsx",
    "utf8"
  );
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /cache-control/);
  assert.match(workspace, /No execution history yet/);
  assert.match(workspace, /no placeholder activity is created/i);
  assert.match(workspace, /Recommendation evolution/);
});
