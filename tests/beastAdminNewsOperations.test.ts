import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fetchNewsOperationsStatus } from "../src/lib/newsOperations";

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
