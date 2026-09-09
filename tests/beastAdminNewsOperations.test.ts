import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assessNewsFactDesk, fetchNewsOperationsStatus } from "../src/lib/newsOperations";

const validStatus = {
  product: "seangworld_news",
  editorialPromise: "JUST THE FACTS. NO OPINION. NO BS.",
  coverage: { confirmedSources: 8, globalDesks: 1, countries: 1, states: 0, regions: 1, cities: 2 },
  sourceHealth: { active: 8, degraded: 0, stale: 0, investigating: 0, quarantined: 0, retired: 0 },
  newsroom: { version: "1.0.0", mode: "contract-only", editorialPromise: "JUST THE FACTS. NO OPINION. NO BS.", staffCount: 7, desks: ["world", "usa", "local"] },
  factDesk: { providerConfigured: false, publicReadConfigured: false, persistenceConfigured: false, candidateGenerationConfigured: false, publicPublishingEnabled: false, readiness: { status: "blocked", readyThrough: "none", blockers: ["provider"], publicationEnabled: false } },
  publicAutoPublishing: false,
  generatedAt: "2026-09-04T22:00:00.000Z",
};

test("BA-NEWS-001 reads only the bounded News operations endpoint", async () => {
  let requested = "";
  const result = await fetchNewsOperationsStatus((async (url: string | URL | Request) => {
    requested = String(url);
    return new Response(JSON.stringify(validStatus), { status: 200 });
  }) as typeof fetch);
  assert.equal(requested, "https://news.seangworld.com/api/news/status");
  assert.equal(result?.coverage.confirmedSources, 8);
  assert.equal(result?.coverage.states, 0);
  assert.equal(result?.publicAutoPublishing, false);
});

test("BA-NEWS-001 fails closed on unavailable or malformed News status", async () => {
  assert.equal(await fetchNewsOperationsStatus((async () => new Response("no", { status: 503 })) as typeof fetch), null);
  assert.equal(await fetchNewsOperationsStatus((async () => new Response(JSON.stringify({ product: "wrong" }), { status: 200 })) as typeof fetch), null);
});

test("BA-NEWS-001 integrates News into existing BeastAdmin analytics without a parallel analytics system", () => {
  const page = readFileSync("src/app/dashboard/admin/analytics/page.tsx", "utf8");
  const workspace = readFileSync("src/app/dashboard/admin/news/BeastAdminNewsOperationsWorkspace.tsx", "utf8");
  assert.match(page, /fetchNewsOperationsStatus/);
  assert.match(page, /BeastAdminNewsOperationsWorkspace/);
  assert.match(page, /SeangworldIntelligenceWorkspace/);
  assert.match(workspace, /Public AI publishing/);
  assert.doesNotMatch(workspace, /OPENAI_API_KEY|SERVICE_ROLE_KEY|ANON_KEY|feedUrl|evidenceAccessBasis/);
});

const now = new Date("2026-09-09T13:30:00Z");
function operation(status = "healthy", completed = "2026-09-09T13:29:00Z", started = "2026-09-09T13:28:00Z") {
  return { workers: [{ workerKey: "fact-desk", heartbeat: { workerKey: "fact-desk", lastStartedAt: started, lastCompletedAt: completed, status, summary: { providerDeferrals: [{ providerLimitKind: "persistent-account-limit", providerRequestId: "must-not-copy" }] } } }] };
}
const assess = (value: unknown, generatedAt = now.toISOString()) => assessNewsFactDesk(value, generatedAt, now);

test("News projection accepts enabled publication without granting authority or hiding stale work", async () => {
  const input = { ...validStatus, publicAutoPublishing: true, generatedAt: now.toISOString(), operations: operation("degraded", "2026-09-08T15:30:54Z", "2026-09-08T15:30:44Z"), unexpected: "must-not-copy" };
  let calls = 0;
  const result = await fetchNewsOperationsStatus(async (_url, init) => {
    calls++; assert.equal(init?.method, "GET");
    return new Response(JSON.stringify(input));
  }, now);
  assert.equal(calls, 1);
  assert.equal(result?.publicAutoPublishing, true);
  assert.deepEqual(result?.factDesk.readiness, input.factDesk.readiness);
  assert.equal(result?.factDeskOperational?.status, "stale");
  assert.match(result!.factDeskOperational!.explanation, /current account condition is unverified/);
  assert.doesNotMatch(JSON.stringify(result), /must-not-copy/);
});

test("all nested consumed News fields are validated before rendering", async () => {
  const bad = [
    { coverage: { ...validStatus.coverage, cities: null } }, { sourceHealth: null }, { sourceHealth: { active: -1 } },
    { newsroom: { ...validStatus.newsroom, desks: "world" } },
    { factDesk: { ...validStatus.factDesk, readiness: null } },
    { factDesk: { ...validStatus.factDesk, readiness: { ...validStatus.factDesk.readiness, blockers: [null] } } },
    { publicAutoPublishing: "true" }, { generatedAt: "invalid" },
  ];
  for (const patch of bad) assert.equal(await fetchNewsOperationsStatus(async () => new Response(JSON.stringify({ ...validStatus, ...patch })), now), null);
});

test("Fact Desk observation distinguishes healthy, degraded, stale, running and recovery", () => {
  assert.equal(assess(operation()).status, "healthy");
  assert.equal(assess(operation("degraded")).status, "degraded");
  assert.equal(assess(operation("degraded", "2026-09-08T15:30:54Z", "2026-09-08T15:30:44Z")).status, "stale");
  assert.equal(assess(operation("healthy", "2026-09-09T13:28:00Z", "2026-09-09T13:29:00Z")).status, "running");
  assert.doesNotMatch(assess(operation("healthy")).explanation, /account limit/);
});

test("missing, duplicate, malformed, future and stale snapshot evidence cannot indicate health", () => {
  for (const value of [null, {}, { workers: [] }, { workers: [{ workerKey: "fact-desk", heartbeat: [] }] }, { workers: [...operation().workers, ...operation().workers] }, operation("healthy", "invalid"), operation("healthy", "2026-09-10T00:00:00Z"), operation("healthy", "2026-09-09T13:29:00Z", "2026-09-10T00:00:00Z")]) assert.equal(assess(value).status, "unknown");
  for (const date of ["invalid", "2026-09-08T00:00:00Z", "2026-09-10T00:00:00Z"]) assert.equal(assess(operation(), date).status, "unknown");
});

test("default assessment clock is read after the remote response is generated", async () => {
  const result = await fetchNewsOperationsStatus(async () => {
    await new Promise((resolve) => setTimeout(resolve, 15));
    const remoteNow = new Date();
    return new Response(JSON.stringify({ ...validStatus, publicAutoPublishing: true, generatedAt: remoteNow.toISOString(), operations: operation("healthy", remoteNow.toISOString(), new Date(remoteNow.getTime() - 1000).toISOString()) }));
  });
  assert.equal(result?.factDeskOperational?.status, "healthy");
});
