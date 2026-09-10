import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

function route(options: { admin?: boolean; connected?: boolean; error?: boolean; job?: Record<string, unknown> } = {}) {
  const calls: string[] = [];
  let written: Record<string, unknown> | undefined;
  function from(table: string) {
    const query = {
      select(fields: string) { calls.push(`${table}:select:${fields}`); return query; },
      eq(field: string, value: string) { calls.push(`${table}:${field}:${value}`); return query; },
      order() { return query; },
      update(value: Record<string, unknown>) { written = value; return query; },
      maybeSingle: async () => result(),
      then(resolve: (value: unknown) => void) { resolve(result()); },
    };
    const result = () => ({ error: table.endsWith("connections") && options.error ? { message: "private database detail" } : null, data: table === "profiles" ? { role: options.admin === false ? "member" : "admin" } : table.endsWith("connections") ? options.connected ? { channel_handle: "seangworld", secret: "must-not-leak" } : null : table.endsWith("jobs") ? written || options.job || [] : table.endsWith("video_series") ? options.job ? { settings: {} } : [] : table.endsWith("controls") ? { pause_all_publishing: true } : [] });
    return query;
  }
  const client = { from, auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } };
  const exports: { GET?: () => Promise<Response>; POST?: (r: Request) => Promise<Response>; PATCH?: (r: Request) => Promise<Response> } = {};
  const source = ts.transpileModule(readFileSync("src/app/api/admin/beast-marketing/video/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  runInNewContext(source, { exports, require(name: string) {
    if (name === "next/server") return { NextResponse: { json: (body: unknown, init: ResponseInit) => new Response(JSON.stringify(body), init) } };
    if (name === "node:crypto") return require(name);
    if (name.endsWith("/supabase/server")) return { createRouteClient: () => client };
    if (name.endsWith("/supabase/service")) return { createBeastFusionPublicationClient: () => { calls.push("service-client"); return client; } };
    if (name.endsWith("beastMarketingShotstack")) return { shotstackConfiguration: () => ({ configured: true }) };
    if (name.startsWith("@/lib/beastMarketing")) return require("../src/lib/" + name.split("/").pop());
    return {};
  } });
  return { get: exports.GET!, post: exports.POST!, patch: exports.PATCH!, calls, written: () => written };
}

test("video status refuses non-admin before service-role connection lookup", async () => {
  const mock = route({ admin: false });
  assert.equal((await mock.get()).status, 403);
  assert.ok(!mock.calls.includes("service-client"));
});
test("video connection status is owner-scoped, private and never enables public publication", async () => {
  const mock = route({ connected: true });
  const response = await mock.get();
  const body = await response.json();
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(body.authorities.youtube, "connected_private_upload_only");
  assert.equal(body.authorities.externalPublishing, "disabled");
  assert.equal(body.authorities.automaticPublishing, "disabled");
  assert.ok(mock.calls.includes("beast_marketing_youtube_connections:select:channel_handle"));
  assert.ok(mock.calls.includes("beast_marketing_youtube_connections:owner_id:owner"));
  assert.ok(!JSON.stringify(body).includes("must-not-leak"));
});
test("video status distinguishes missing connection from unavailable lookup without leaking errors", async () => {
  for (const [options, expected] of [[{}, "not_connected"], [{ error: true }, "connection_unavailable"]] as const) {
    const body = await (await route(options).get()).json();
    assert.equal(body.authorities.youtube, expected);
    assert.ok(!JSON.stringify(body).includes("private database detail"));
  }
});

const mutation = (kind: string, rest: Record<string, unknown> = {}) => new Request("https://thebeast.seangworld.com/api/admin/beast-marketing/video", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, id: "job", ...rest }) });
test("held preparation resumes in place without granting upload approval", async () => {
  for (const state of ["idea", "selected", "scripted", "generating"]) {
    const mock = route({ job: { state, quality: { ownerWorkflowDecision: "held", renderReady: false }, provenance: {} } });
    const response = await mock.patch(mutation("owner_review", { decision: "pending" }));
    assert.equal(response.status, 200);
    assert.equal(mock.written()?.state, state);
    assert.equal((mock.written()?.quality as Record<string, unknown>).ownerWorkflowDecision, "pending");
    assert.equal((await response.json()).schedulingAuthorized, false);
  }
});
test("unfinished candidate approval remains denied", async () => {
  const mock = route({ job: { state: "scripted", quality: { renderReady: false } } });
  assert.equal((await mock.patch(mutation("owner_review", { decision: "approved" }))).status, 409);
  assert.equal(mock.written(), undefined);
});
test("production planning preserves grounded narration beyond 160 characters", async () => {
  const narration = "This is verified source material describing a real feature of the platform and explaining how users can use it. ".repeat(4).trim();
  const mock = route({ job: { id: "job", series_id: "series", state: "scripted", revision: 1, script: { hook: "See how this works", narration: [narration], cta: "Visit SEANGWORLD", estimatedSeconds: 60 } } });
  const response = await mock.post(mutation("plan_production"));
  assert.equal(response.status, 200, await response.clone().text());
  const serialized = JSON.stringify(mock.written());
  assert.ok(serialized.includes(narration), "full narration must survive into production manifest");
});
