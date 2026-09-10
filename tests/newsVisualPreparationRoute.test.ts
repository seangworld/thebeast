import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

function fixture(options: { admin?: boolean; existing?: boolean; sourceMissing?: boolean } = {}) {
  const queries: Array<{ table: string; filters: Record<string, unknown> }> = [];
  let inserted: Record<string, unknown> | undefined;
  const original = { id: "source", series_id: "series", state: "ready", idempotency_key: "direct-youtube-first-news-walkthrough-20260910", topic: { title: "SEANGWORLD News" }, script: { hook: "What should you know about SEANGWORLD News?", narration: ["Headlines show source attribution and timing.", "Use Local View to choose a listed area.", "Browse by topic, state or city.", "Read the source to form your own view."], cta: "Visit SEANGWORLD News.", estimatedSeconds: 62 } };
  const from = (table: string) => {
    const filters: Record<string, unknown> = {}; queries.push({ table, filters });
    const result = () => ({ error: null, data: table === "profiles" ? { role: options.admin === false ? "member" : "admin" } : table.endsWith("video_series") ? { settings: {} } : inserted || (filters.idempotency_key ? options.existing ? { id: "existing" } : null : options.sourceMissing ? null : original) });
    const query = { select() { return query; }, eq(key: string, value: unknown) { filters[key] = value; return query; }, insert(value: Record<string, unknown>) { inserted = value; return query; }, maybeSingle: async () => result(), single: async () => result() };
    return query;
  };
  const client = { from, auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } };
  const exports: { POST?: (request: Request) => Promise<Response> } = {};
  const code = ts.transpileModule(readFileSync("src/app/api/admin/beast-marketing/video/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  runInNewContext(code, { exports, URL, require(name: string) {
    if (name === "next/server") return { NextResponse: { json: (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), init) } };
    if (name === "node:crypto") return require(name);
    if (name.endsWith("/supabase/server")) return { createRouteClient: () => client };
    if (name.endsWith("/supabase/service")) return { createBeastFusionPublicationClient() { throw new Error("No service-role elevation allowed in this operation"); } };
    if (name.startsWith("@/lib/beastMarketing")) return require("../src/lib/" + name.split("/").pop());
    throw new Error(`Unexpected dependency ${name}`);
  } });
  return { post: exports.POST!, queries, inserted: () => inserted, original };
}
const request = (origin = "https://thebeast.seangworld.com") => new Request("https://thebeast.seangworld.com/api/admin/beast-marketing/video", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ kind: "prepare_news_visual_test", id: "source" }) });

test("visual preparation denies non-admin and foreign-origin requests before job access", async () => {
  for (const [options, origin] of [[{ admin: false }, "https://thebeast.seangworld.com"], [{}, "https://evil.example"]] as const) {
    const f = fixture(options); assert.equal((await f.post(request(origin))).status, 403);
    assert.equal(f.queries.filter((q) => q.table.endsWith("jobs")).length, 0);
  }
});
test("visual preparation creates a separate owner-scoped unapproved, unscheduled test", async () => {
  const f = fixture(); const original = JSON.stringify(f.original);
  const response = await f.post(request()); assert.equal(response.status, 201, await response.clone().text());
  const job = f.inserted()!;
  assert.equal(job.owner_id, "owner"); assert.notEqual(job.id, "source");
  assert.equal(job.state, "scripted"); assert.equal(job.idempotency_key, "news-visual-test-v1");
  assert.equal((job.quality as Record<string, unknown>).renderReady, false);
  assert.equal((job.quality as Record<string, unknown>).ownerWorkflowDecision, "pending");
  assert.equal(job.scheduled_for, undefined); assert.equal(job.published_identity, undefined);
  assert.equal(JSON.stringify(f.original), original);
  assert.equal((await response.json()).shotstackCreditsConsumed, 0);
  for (const query of f.queries.filter((q) => q.table !== "profiles" && Object.keys(q.filters).length)) assert.equal(query.filters.owner_id, "owner");
});
test("visual preparation returns the retained test without generating another", async () => {
  const f = fixture({ existing: true }); const response = await f.post(request());
  assert.equal(response.status, 200); assert.equal((await response.json()).duplicatePrevented, true);
  assert.equal(f.inserted(), undefined);
});
test("visual preparation cannot clone an unavailable source", async () => {
  const f = fixture({ sourceMissing: true }); assert.equal((await f.post(request())).status, 409);
  assert.equal(f.inserted(), undefined);
});
