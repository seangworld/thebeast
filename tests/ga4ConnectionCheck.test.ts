import assert from "node:assert/strict";
import test from "node:test";
import { checkGa4Connection } from "../src/lib/server/ga4ConnectionCheck";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const env = { BEAST_ECOSYSTEM_GA4_PROPERTY_ID: "1234", NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-QC08Q29MCC", GOOGLE_WIF_PROVIDER_RESOURCE: "private-provider", GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL: "private-service@example.test" };
const stream = (id: string, n = 1) => ({ name: `properties/1234/dataStreams/${n}`, type: "WEB_DATA_STREAM", webStreamData: { measurementId: id } });
const options = (body: unknown) => ({ tokenLoader: async () => "secret-token", fetchImpl: (async () => Response.json(body)) as typeof fetch });

test("GA4 mapping check confirms membership without claiming ingestion", async () => {
  const r = await checkGa4Connection(env, options({ dataStreams: [stream("G-QC08Q29MCC"), stream("G-YFRV4QJK04", 2)] }));
  assert.equal(r.status, "matched");
  assert.ok(r.streams.every((s) => s.status === "found"));
  assert.match(r.message, /does not confirm that visits are arriving/);
  assert.doesNotMatch(JSON.stringify(r), /secret-token|private-provider|private-service/);
});

test("GA4 mapping check identifies missing streams only after complete pagination", async () => {
  const urls: string[] = [];
  const r = await checkGa4Connection(env, { tokenLoader: async () => "secret-token", fetchImpl: async (input, init) => {
    urls.push(String(input));
    assert.equal(init?.cache, "no-store");
    assert.equal(init?.redirect, "error");
    return Response.json(urls.length === 1 ? { dataStreams: [stream("G-QC08Q29MCC")], nextPageToken: "next token" } : { dataStreams: [stream("G-YFRV4QJK04", 2)] });
  } });
  assert.equal(r.status, "matched");
  assert.equal(urls.length, 2);
  assert.match(urls[1], /pageToken=next\+token/);
  const mismatch = await checkGa4Connection(env, options({ dataStreams: [stream("G-QC08Q29MCC")] }));
  assert.equal(mismatch.status, "mismatch");
  assert.equal(mismatch.streams[1].status, "missing");
  assert.equal((await checkGa4Connection(env, options({}))).status, "mismatch");
});

test("GA4 mapping check fails closed on malformed, foreign, partial and denied responses", async () => {
  for (const body of [null, [], { error: {} }, { dataStreams: {} }, { dataStreams: [{}] }, { dataStreams: [{ ...stream("G-QC08Q29MCC"), name: "properties/999/dataStreams/1" }] }, { dataStreams: [stream("bad")] }, { nextPageToken: 1 }, { nextPageToken: "loop" }]) {
    const r = await checkGa4Connection(env, options(body));
    assert.equal(r.status, "unavailable", JSON.stringify(body));
    assert.ok(r.streams.every((s) => s.status === "unavailable"));
  }
  for (const status of [401, 403, 404, 429, 500]) {
    const r = await checkGa4Connection(env, { tokenLoader: async () => "secret-token", fetchImpl: async () => new Response("private provider error", { status }) });
    assert.equal(r.status, "unavailable");
    assert.doesNotMatch(JSON.stringify(r), /private provider error|secret-token/);
    if (status === 403) assert.match(r.message, /Admin API/);
  }
});

test("GA4 mapping check rejects invalid configuration without touching Google", async () => {
  for (const configuration of [{ ...env, BEAST_ECOSYSTEM_GA4_PROPERTY_ID: "G-QC08Q29MCC" }, { ...env, NEXT_PUBLIC_GA_MEASUREMENT_ID: "" }, { ...env, GOOGLE_WIF_PROVIDER_RESOURCE: "" }]) {
    const r = await checkGa4Connection(configuration, { tokenLoader: async () => { assert.fail("Must not authenticate"); } });
    assert.equal(r.status, "unavailable");
  }
  const r = await checkGa4Connection(env, { tokenLoader: async () => { throw new Error("private credential detail"); } });
  assert.equal(r.status, "unavailable");
  assert.doesNotMatch(JSON.stringify(r), /private credential/);
});

function route(user: boolean, role: string, profileError = false) {
  let checked = false;
  const exports: { GET?: (request: Request) => Promise<Response> } = {};
  const client = {
    auth: { getUser: async () => ({ data: { user: user ? { id: "owner" } : null }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role }, error: profileError ? {} : null }) }) }) }),
  };
  const code = ts.transpileModule(readFileSync("src/app/api/admin/seangworld-intelligence/route.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  runInNewContext(code, { exports, URL, Date, process: { env }, require: (name: string) => {
    if (name === "next/server") return { NextResponse: { json: (body: unknown, init: ResponseInit) => Response.json(body, init) } };
    if (name === "@/lib/supabase/server") return { createRouteClient: () => client };
    if (name === "@/lib/server/ga4ConnectionCheck") return { checkGa4Connection: async () => { checked = true; return { status: "matched" }; } };
    return {};
  } });
  return { get: () => exports.GET!(new Request("https://example.test/api/admin/seangworld-intelligence?check=streams")), checked: () => checked };
}

test("stream diagnostic route enforces owner access before Google reads and prevents caching", async () => {
  for (const [user, role, error, expected] of [[false, "admin", false, 401], [true, "member", false, 403], [true, "admin", true, 503]] as const) {
    const f = route(user, role, error);
    assert.equal((await f.get()).status, expected);
    assert.equal(f.checked(), false);
  }
  const f = route(true, "admin");
  const r = await f.get();
  assert.equal(r.status, 200);
  assert.equal(f.checked(), true);
  assert.equal(r.headers.get("cache-control"), "private, no-store");
});
