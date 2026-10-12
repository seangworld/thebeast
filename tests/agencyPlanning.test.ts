import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { agencyPlanningAuthority, normalizeAgencyPlanningRequest } from "../src/lib/agencyPlanning";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const request = (overrides: Record<string, unknown> = {}) => ({ action: "plan", presenterProfileId: id(1), workstreamId: id(2), variantId: id(3), revision: 1, revisionHash: "fnv1a32:12345678", channel: "instagram", plannedFor: "2026-10-15T12:00:00Z", timezone: "UTC", ...overrides });

test("planning accepts only explicit exact revisions and valid calendar metadata", () => {
  const plan = normalizeAgencyPlanningRequest(request());
  assert.equal(plan?.action, "plan");
  for (const overrides of [{ action: "publish" }, { action: "render" }, { action: "schedule" }, { presenterProfileId: "other" }, { workstreamId: null }, { variantId: "bad" }, { revision: "1" }, { revision: 0 }, { revision: 1.5 }, { revisionHash: "old" }, { channel: "youtube" }, { connectionId: "bad" }, { plannedFor: "2026-10-15" }, { plannedFor: "invalid" }, { plannedFor: "2026-02-30T12:00:00Z" }, { plannedFor: "2026-10-15T24:00:00Z" }, { timezone: "+02:00" }, { timezone: "invalid" }, { ownerNotes: "x".repeat(2001) }]) {
    assert.equal(normalizeAgencyPlanningRequest(request(overrides)), null, JSON.stringify(overrides));
  }
});
test("equivalent time offsets normalize to the same deterministic slot input", () => {
  assert.deepEqual(normalizeAgencyPlanningRequest(request()), normalizeAgencyPlanningRequest(request({ plannedFor: "2026-10-15T14:00:00+02:00" })));
});
test("client authority fields cannot change planning mode or selected payload", () => {
  const actual = normalizeAgencyPlanningRequest(request({ publishingAuthorized: true, renderingAuthorized: true, status: "scheduled", ownerId: id(99) }));
  assert.deepEqual(actual, normalizeAgencyPlanningRequest(request()));
  assert.deepEqual(agencyPlanningAuthority, { mode: "review_only", publishingAuthorized: false, renderingAuthorized: false, spendingAuthorized: false });
});
test("link requests require owned reference-shaped identifiers and never accept embedded identities", () => {
  const input = { action: "link", presenterProfileId: id(1), campaignId: id(2) };
  assert.deepEqual(normalizeAgencyPlanningRequest(input), { ...input, videoSeriesId: null });
  assert.equal(normalizeAgencyPlanningRequest({ ...input, videoSeriesId: "wrong" }), null);
  assert.equal(normalizeAgencyPlanningRequest({ ...input, presenterProfileId: "Character name" }), null);
});

function route(options: { authorized?: boolean; rpcError?: string; data?: unknown; readError?: boolean } = {}) {
  const calls: Array<{ name: string; args?: Record<string, unknown> }> = [];
  const client = {
    rpc: async (name: string, args: Record<string, unknown>) => { calls.push({ name, args }); return { data: options.data === undefined ? { id: id(9), status: "ready" } : options.data, error: options.rpcError ? { code: options.rpcError, message: "private failure details" } : null }; },
    from(table: string) {
      calls.push({ name: table });
      const query = { select: () => query, eq: (field: string, value: string) => { calls.push({ name: "filter", args: { field, value } }); return query; }, not: () => query, order: () => query, limit: () => query,
        then(resolve: (value: unknown) => void) { resolve({ data: [], error: options.readError ? { message: "private failure details" } : null }); } };
      return query;
    },
  };
  const exports: { GET?: () => Promise<Response>; POST?: (request: Request) => Promise<Response> } = {};
  const source = ts.transpileModule(readFileSync("src/app/api/admin/agency/plans/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  runInNewContext(source, { exports, require(name: string) {
    if (name.endsWith("/social/auth")) return {
      socialOwner: async () => options.authorized === false ? null : { id: id(50), client },
      socialJson: (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Cache-Control": "private, no-store" } }),
    };
    if (name.endsWith("/agencyPlanning")) return { agencyPlanningAuthority, normalizeAgencyPlanningRequest };
    throw new Error(`Unexpected planning dependency: ${name}`);
  } });
  return { get: exports.GET!, post: (body: unknown) => exports.POST!(new Request("https://thebeast.seangworld.com/api/admin/agency/plans", { method: "POST", body: JSON.stringify(body) })), calls };
}

test("planning route denies unauthorized callers before reading or writing", async () => {
  const fixture = route({ authorized: false });
  assert.equal((await fixture.get()).status, 403);
  assert.equal((await fixture.post(request())).status, 403);
  assert.equal(fixture.calls.length, 0);
});
test("planning uses the authenticated atomic RPC and exact caller revision without service/provider access", async () => {
  const fixture = route();
  const response = await fixture.post(request({ connectionId: id(8), publishingAuthorized: true, ownerId: id(77) }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(fixture.calls.length, 1);
  assert.equal(fixture.calls[0].name, "queue_beast_marketing_agency_plan");
  assert.deepEqual(JSON.parse(JSON.stringify(fixture.calls[0].args)), {
    selected_workstream_id: id(2), selected_presenter_id: id(1), selected_variant_id: id(3), selected_revision: 1, selected_revision_hash: "fnv1a32:12345678",
    selected_channel: "instagram", selected_connection_id: id(8), selected_planned_for: "2026-10-15T12:00:00.000Z", selected_timezone: "UTC", selected_owner_notes: "",
  });
  const body = await response.json();
  assert.equal(body.publishingAuthorized, false);
  assert.equal(body.renderingAuthorized, false);
  assert.equal(body.spendingAuthorized, false);
});
test("duplicate retry sends identical transactional inputs, including canonical time", async () => {
  const fixture = route();
  await fixture.post(request());
  await fixture.post(request({ plannedFor: "2026-10-15T07:00:00-05:00" }));
  assert.deepEqual(fixture.calls[0], fixture.calls[1]);
});
test("stale approval and mismatched talent/account conflicts fail closed without publishing side effects", async () => {
  for (const rpcError of ["P0001", "23503", "23514", "23505"]) {
    const fixture = route({ rpcError });
    const response = await fixture.post(request());
    assert.equal(response.status, 409);
    assert.ok(!(await response.text()).includes("private failure details"));
    assert.equal(fixture.calls.length, 1);
  }
});
test("unknown storage errors and absent RPC results are never reported as saved", async () => {
  for (const options of [{ rpcError: "08006" }, { data: null }]) assert.equal((await route(options).post(request())).status, 503);
});
test("planning read model is owner scoped and private with explicit empty queues", async () => {
  const fixture = route();
  const response = await fixture.get();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.workstreams, []);
  assert.deepEqual(body.plans, []);
  assert.equal(body.truncated, false);
  assert.equal(body.publishingAuthorized, false);
  assert.equal(fixture.calls.filter(call => call.name === "filter" && call.args?.field === "owner_id" && call.args?.value === id(50)).length, 2);
  assert.equal((await route({ readError: true }).get()).status, 503);
});

test("migration uses revisioned internal plans and denies all executable or exported work", () => {
  const sql = readFileSync("supabase/migrations/20261012120000_agency_review_only_planning.sql", "utf8");
  assert.match(sql, /if exists \(select 1 from public\.beast_marketing_ad_variants where campaign_id = selected_campaign_id\)/);
  assert.match(sql, /New private creative must start unapproved/);
  assert.match(sql, /on conflict \(agency_workstream_id, variant_id, variant_revision, variant_revision_hash, agency_channel, planned_for\)/);
  assert.match(sql, /new\.status not in \('draft', 'ready', 'cancelled'\)/);
  assert.match(sql, /old\.agency_workstream_id is not null/);
  assert.match(sql, /new\.approved_revision is distinct from new\.revision/);
  assert.match(sql, /Social posts are outside private planning/);
  assert.match(sql, /Video generation and scheduling are outside private planning/);
  assert.doesNotMatch(sql, /insert into public\.beast_marketing_(social_posts|video_jobs)|insert into storage\./);
  assert.match(sql, /revoke all on public\.beast_marketing_agency_workstreams from public, anon, authenticated, service_role/);
});
