import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { transpileModule, ModuleKind } from "typescript";
import * as outcomes from "../src/lib/standingObservationOutcomes";

function routeFixture({ admin = true, user = true, runs = [], history = [], historyError = false }: { admin?: boolean; user?: boolean; runs?: unknown[]; history?: unknown[]; historyError?: boolean } = {}) {
  const queries: Array<{ table: string; fields: string; filters: Array<[string, unknown]> }> = [];
  const client = { auth: { getUser: async () => ({ data: { user: user ? { id: "owner-one" } : null }, error: null }) }, from(table: string) {
    const q = { table, fields: "", filters: [] as Array<[string, unknown]> }; queries.push(q);
    const chain = { select(fields: string) { q.fields = fields; return chain; }, eq(field: string, value: unknown) { q.filters.push([field, value]); return chain; }, gte(field: string, value: unknown) { q.filters.push([`gte:${field}`, value]); return chain; }, order() { return chain; }, limit() { return chain; }, maybeSingle() { return chain; }, then(resolve: (v: unknown) => unknown) {
      const isHistory = q.fields === "status,started_at,completed_at,findings";
      const data = table === "profiles" ? { role: admin ? "admin" : "member" } : table === "beast_admin_staff_schedules" ? { enabled: false } : isHistory ? history : runs;
      return Promise.resolve({ data, error: isHistory && historyError ? { message: "unavailable" } : null }).then(resolve);
    } }; return chain;
  } };
  const compiled = transpileModule(readFileSync("src/app/api/admin/staff-operations/route.ts", "utf8"), { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} as { GET: () => Promise<Response> } };
  new Function("require", "module", "exports", compiled)((id: string) => {
    if (id === "next/server") return { NextResponse: { json: (body: unknown, init: ResponseInit) => Response.json(body, init) } };
    if (id === "@/lib/supabase/server") return { createRouteClient: () => client };
    if (id === "@/lib/standingObservationOutcomes") return outcomes;
    if (id === "@/lib/server/standingObservationRunner") return {};
    throw new Error(`Unexpected dependency: ${id}`);
  }, module, module.exports);
  return { GET: module.exports.GET, queries };
}
const oldRun = { id: "old", trigger_type: "schedule", status: "clean", started_at: "2026-01-01T10:00:00Z", completed_at: "2026-01-01T10:00:01Z", finding_count: 0, findings: [], checked_sources: [], unavailable_sources: [] };

test("staff API denies anonymous and nonadmin access before reading operating history", async () => {
  for (const config of [{ user: false }, { admin: false }]) {
    const fixture = routeFixture(config); const response = await fixture.GET();
    assert.equal(response.status, 403); assert.match(response.headers.get("cache-control") || "", /private.*no-store/);
    assert.equal(fixture.queries.some((q) => q.table === "beast_admin_staff_observation_runs"), false);
  }
});
test("staff API retains an old paused briefing while bounding learning by owner and date", async () => {
  const fixture = routeFixture({ runs: [oldRun] }); const response = await fixture.GET();
  const body = await response.json(); assert.equal(response.status, 200); assert.equal(body.runs[0].id, "old"); assert.equal(body.state, "clean");
  const reads = fixture.queries.filter((q) => q.table === "beast_admin_staff_observation_runs");
  assert.equal(reads.length, 2);
  for (const q of reads) { assert.ok(q.filters.some(([f, v]) => f === "owner_id" && v === "owner-one")); assert.ok(q.filters.some(([f, v]) => f === "trigger_type" && v === "schedule")); }
  assert.equal(reads.filter((q) => q.filters.some(([f]) => f === "gte:started_at")).length, 1);
});
test("staff API fails visibly on malformed latest evidence, history errors and overflow", async () => {
  for (const config of [{ runs: [{ ...oldRun, findings: {} }] }, { historyError: true }, { history: Array.from({ length: 121 }, () => oldRun) }]) {
    assert.equal((await routeFixture(config).GET()).status, 503);
  }
});
