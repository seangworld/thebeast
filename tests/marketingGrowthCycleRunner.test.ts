import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { transpileModule, ModuleKind } from "typescript";
import * as growth from "../src/lib/marketingGrowthCycle";
import * as attribution from "../src/lib/marketingGrowthAttribution";

type Campaign = { id: string; status: string; source_facts: unknown[] };
function fixture(options: { enabled?: boolean; admin?: boolean; duplicate?: boolean; campaigns?: Campaign[]; historyCount?: number; providersMissing?: boolean; pauseAfterProvider?: boolean; completionError?: boolean; currentStatus?: string; timeBudget?: boolean } = {}) {
  const operations: Array<{ table: string; action: string; value?: Record<string, unknown>; filters: Array<[string, unknown]> }> = [];
  let providerReads = 0;
  const campaigns = options.campaigns || [];
  const client = { from(table: string) {
    const op = { table, action: "select", filters: [] as Array<[string, unknown]>, value: undefined as Record<string, unknown> | undefined }; operations.push(op);
    let fields = "";
    const chain = {
      select(value: string) { fields = value; return chain; }, eq(field: string, value: unknown) { op.filters.push([field, value]); return chain; }, order() { return chain; }, limit() { return chain; }, maybeSingle() { return chain; }, single() { return chain; },
      insert(value: Record<string, unknown>) { op.action = "insert"; op.value = value; return chain; }, update(value: Record<string, unknown>) { op.action = "update"; op.value = value; return chain; },
      then(resolve: (value: unknown) => unknown) {
        let data: unknown = null; let error: unknown = null; let count: number | undefined;
        if (table === "beast_marketing_growth_controls") data = { enabled: options.enabled !== false && !(options.pauseAfterProvider && providerReads > 0) };
        else if (table === "profiles") data = { role: options.admin === false ? "member" : "admin" };
        else if (table === "beast_marketing_growth_runs" && op.action === "insert") { data = { id: "run-one" }; if (options.duplicate) error = { code: "23505" }; }
        else if (table === "beast_marketing_growth_runs" && op.action === "update" && options.completionError) error = { code: "unavailable" };
        else if (table === "beast_marketing_campaigns") { data = fields === "status" ? { status: options.currentStatus || campaigns.find((campaign) => op.filters.some(([key, value]) => key === "id" && value === campaign.id))?.status || "active" } : [...campaigns]; count = options.historyCount ?? campaigns.length; }
        return Promise.resolve({ data, error, count }).then(resolve);
      },
    }; return chain;
  } };
  const compiled = transpileModule(readFileSync("src/lib/server/marketingGrowthCycleRunner.ts", "utf8"), { compilerOptions: { module: ModuleKind.CommonJS, target: 7 } }).outputText;
  const fixtureModule = { exports: {} as { runMarketingGrowthCycle: (owner: string, now: Date) => Promise<{ status: string; report?: growth.GrowthCycleReport }> } };
  class Clock extends Date { static now() { return options.timeBudget && providerReads > 0 ? 41_000 : 0; } }
  new Function("require", "module", "exports", "Date", compiled)((id: string) => {
    if (id === "server-only") return {};
    if (id === "../supabase/service") return { createBeastFusionPublicationClient: () => client };
    if (id === "./seangworldGoogleProviders") return { loadLiveSeangworldProviders: async () => { providerReads++; return options.providersMissing ? null : [{ id: "search_console", data: { searchOpportunities: [], searchOpportunityBaseline: { currentStartDate: "2026-08-01", currentEndDate: "2026-08-30" } } }]; } };
    if (id === "../seangworldAnalyticsScope") return { getSeangworldAnalyticsScope: (p: string) => p };
    if (id === "../searchGrowthCampaign") return { prepareSearchGrowthCampaign: () => null };
    if (id === "../searchGrowthAssessment") return { searchGrowthAssessmentTarget: (_owner: string, campaignId: string) => ({ product: "thebeast", page: "https://thebeast.seangworld.com/", query: campaignId }), buildSearchGrowthAssessment: ({ provider }: { provider: unknown }) => provider ? { decision: "modify", confidence: "low", rationale: [], evidence: [], limitations: [] } : null };
    if (id === "../marketingGrowthCycle") return growth;
    if (id === "../marketingGrowthAttribution") return attribution;
    throw new Error(`Unexpected runner dependency: ${id}`);
  }, fixtureModule, fixtureModule.exports, Clock);
  return { run: () => fixtureModule.exports.runMarketingGrowthCycle("owner-one", new Date("2026-09-10T10:20:00Z")), operations, providerReads: () => providerReads };
}

test("growth runner checks opt-in and admin status before claiming or reading providers", async () => {
  for (const options of [{ enabled: false }, { admin: false }]) {
    const f = fixture(options); assert.equal((await f.run()).status, "paused");
    assert.equal(f.providerReads(), 0); assert.equal(f.operations.some((o) => o.action === "insert"), false);
  }
});
test("growth daily duplicate claim performs no provider reads or campaign writes", async () => {
  const f = fixture({ duplicate: true }); assert.equal((await f.run()).status, "already_claimed");
  assert.equal(f.providerReads(), 0); assert.equal(f.operations.some((o) => o.table === "beast_marketing_campaigns"), false);
});
test("growth history overflow fails visibly before providers or derived writes", async () => {
  const f = fixture({ historyCount: 501 }); const result = await f.run();
  assert.equal(result.status, "failed"); assert.ok(result.report?.unavailable.includes("campaign_history_incomplete")); assert.equal(f.providerReads(), 0);
});
test("growth paused completed and archived campaigns receive no assets or assessments", async () => {
  const f = fixture({ campaigns: ["paused", "completed", "archived"].map((status) => ({ id: status, status, source_facts: [] })) });
  await f.run(); assert.equal(f.operations.some((o) => o.table === "beast_marketing_assets" || o.table === "beast_marketing_recommendations"), false);
});
test("growth missing providers remain unavailable rather than measured zero", async () => {
  const f = fixture({ providersMissing: true, campaigns: [{ id: "active", status: "active", source_facts: [] }] }); const result = await f.run();
  assert.equal(result.status, "completed"); assert.deepEqual(result.report?.assessed, []);
  assert.ok(result.report?.unavailable.includes("campaign:active:fresh_search_evidence_unavailable"));
  assert.equal(f.operations.some((o) => o.table === "beast_marketing_outcomes"), false);
});
test("growth pause during provider read prevents advisory writes and records interruption", async () => {
  const f = fixture({ pauseAfterProvider: true, campaigns: [{ id: "active", status: "active", source_facts: [] }] }); const result = await f.run();
  assert.equal(result.status, "failed"); assert.ok(result.report?.unavailable.includes("cycle_paused"));
  assert.equal(f.operations.some((o) => o.table === "beast_marketing_recommendations"), false);
});
test("growth completion outage is not reported as confirmed success", async () => {
  const f = fixture({ completionError: true }); await assert.rejects(f.run, /cycle_completion_unconfirmed/);
});
test("growth rereads campaign lifecycle so a concurrent pause prevents derived writes", async () => {
  const f = fixture({ currentStatus: "paused", campaigns: [{ id: "active", status: "active", source_facts: [] }] });
  const result = await f.run(); assert.equal(result.status, "completed");
  assert.equal(f.operations.some((o) => o.table === "beast_marketing_assets" || o.table === "beast_marketing_recommendations"), false);
  assert.ok(f.operations.some((o) => o.table === "beast_marketing_campaigns" && o.filters.some(([key, value]) => key === "id" && value === "active") && o.filters.some(([key, value]) => key === "owner_id" && value === "owner-one")));
});
test("growth elapsed budget records failure before further advisory writes", async () => {
  const f = fixture({ timeBudget: true, campaigns: [{ id: "active", status: "active", source_facts: [] }] });
  const result = await f.run(); assert.equal(result.status, "failed"); assert.ok(result.report?.unavailable.includes("cycle_time_budget_reached"));
  assert.equal(f.operations.some((o) => o.table === "beast_marketing_recommendations"), false);
});
test("growth runner caps assessment writes even with a full eligible campaign backlog", async () => {
  const f = fixture({ campaigns: Array.from({ length: 100 }, (_, i) => ({ id: `campaign-${i}`, status: "active", source_facts: [] })) });
  const result = await f.run(); assert.equal(result.status, "completed");
  assert.equal(f.operations.filter((o) => o.table === "beast_marketing_recommendations" && o.action === "insert").length, growth.GROWTH_ASSESSMENT_LIMIT);
  assert.ok(result.report?.blockers.some((item) => item.includes("90 campaigns deferred")));
});
