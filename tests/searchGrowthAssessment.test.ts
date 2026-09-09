import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildSearchOpportunities, type SeangworldProviderSnapshot } from "../src/lib/seangworldIntelligence";
import { prepareSearchGrowthCampaign, searchGrowthCampaignId } from "../src/lib/searchGrowthCampaign";
import { buildSearchGrowthAssessment, searchGrowthAssessmentTarget } from "../src/lib/searchGrowthAssessment";

const page = "https://news.seangworld.com/";
const query = "north carolina news";
const now = new Date("2026-09-09T00:00:00Z");
function fixture(previous = true) {
  return {
    id: "search_console", status: "configured", connectionStatus: "connected", freshness: "recent",
    lastSuccessfulSynchronizationAt: now.toISOString(),
    data: {
      searchOpportunityBaseline: { currentStartDate: "2026-08-08", currentEndDate: "2026-09-06", previousStartDate: "2026-07-09", previousEndDate: "2026-08-07", dataThroughDate: "2026-09-06", rowLimit: 500, partialData: true },
      searchOpportunities: buildSearchOpportunities([{ page, query, clicks: 12, impressions: 120, ctr: 0.1, position: 6 }], previous ? [{ page, query, clicks: 6, impressions: 100, ctr: 0.06, position: 7 }] : []),
    },
  } as SeangworldProviderSnapshot;
}
const assess = (provider = fixture(), target = { page, query }) => buildSearchGrowthAssessment({ provider, ...target, now });

test("assessment target is bound to one persisted opportunity and its owner", () => {
  const facts = prepareSearchGrowthCampaign({ provider: fixture(), page, query, now })!.sourceFacts;
  const id = searchGrowthCampaignId("owner", page, query);
  assert.deepEqual(searchGrowthAssessmentTarget("owner", id, facts), { page, query, product: "seangworldnews" });
  assert.equal(searchGrowthAssessmentTarget("other-owner", id, facts), null);
  assert.equal(searchGrowthAssessmentTarget("owner", "unrelated", facts), null);
  for (const bad of [null, {}, [], [...facts, facts[0]], [{ ...facts[0], url: "https://evil.test/" }], [{ ...facts[0], label: "Search Console sampled query: " }]]) assert.equal(searchGrowthAssessmentTarget("owner", id, bad), null);
});

test("refreshed adjacent windows retain dates and never imply campaign attribution", () => {
  const provider = fixture();
  const before = JSON.stringify(provider);
  const result = assess(provider)!;
  assert.equal(result.confidence, "low");
  assert.equal(result.decision, "modify");
  assert.match(result.rationale.join(" "), /6 clicks and 20 impressions/);
  assert.match(result.evidence.join(" "), /2026-08-08 to 2026-09-06/);
  assert.match(result.evidence.join(" "), /2026-07-09 to 2026-08-07/);
  assert.match(result.evidence.join(" "), /synchronized 2026-09-09T00:00:00.000Z/);
  assert.match(result.limitations.join(" "), /not a pre\/post campaign comparison/);
  assert.equal(JSON.stringify(provider), before);
});

test("missing sampled current rows are unavailable, never a saved zero", () => {
  const provider = fixture();
  provider.data!.searchOpportunities = [];
  assert.equal(assess(provider), null);
  assert.equal(assess(fixture(), { page, query: "other query" }), null);
  assert.equal(assess(fixture(), { page: "https://thebeast.seangworld.com/", query }), null);
  assert.equal(assess(fixture(), { page: "https://news.seangworld.com.evil.test/", query }), null);
});

test("explicit zero remains evidence even when opportunity becomes monitor or ignore", () => {
  const provider = fixture();
  provider.data!.searchOpportunities = buildSearchOpportunities([{ page, query, clicks: 0, impressions: 0, ctr: 0, position: 0 }], []);
  assert.equal(prepareSearchGrowthCampaign({ provider, page, query, now }), null);
  const result = assess(provider)!;
  assert.match(result.evidence.join(" "), /0 clicks; 0 impressions/);
  assert.match(result.evidence.join(" "), /Previous .* unavailable/);
  assert.match(result.rationale.join(" "), /missing period is not zero/);
  assert.equal(result.confidence, "low");
});

test("failed, stale, future and malformed provider evidence cannot become a current assessment", () => {
  for (const patch of [{ status: "no_data" }, { connectionStatus: "failed" }, { freshness: "stale" }, { lastSuccessfulSynchronizationAt: "2026-09-08T20:00:00Z" }, { lastSuccessfulSynchronizationAt: "2026-09-10T00:00:00Z" }]) assert.equal(assess({ ...fixture(), ...patch } as SeangworldProviderSnapshot), null);
  for (const patch of [{ previousStartDate: "2026-07-08" }, { currentEndDate: "2026-09-30", dataThroughDate: "2026-09-30" }, { dataThroughDate: "2026-09-07" }]) {
    const provider = fixture(); Object.assign(provider.data!.searchOpportunityBaseline!, patch);
    assert.equal(assess(provider), null);
  }
  for (const patch of [{ clicks: NaN }, { ctr: 2 }, { impressions: -1 }]) {
    const provider = fixture(); Object.assign(provider.data!.searchOpportunities![0].current, patch);
    assert.equal(assess(provider), null);
  }
});

test("route keeps search assessment behind owner authentication and only appends advice", () => {
  const source = readFileSync("src/app/api/admin/beast-marketing/route.ts", "utf8");
  const post = source.slice(source.indexOf("export async function POST"));
  const block = post.slice(post.indexOf('if (kind === "search_assessment")'), post.indexOf('if (kind === "ad_variant")'));
  assert.ok(post.indexOf("if (!user) return forbidden()") < post.indexOf('if (kind === "search_assessment")'));
  assert.match(block, /eq\("owner_id", user.id\)/);
  assert.match(block, /searchGrowthAssessmentTarget\(user.id, selected.data.id, selected.data.source_facts\)/);
  assert.match(block, /getSeangworldAnalyticsScope\(target.product\)/);
  assert.match(block, /beast_marketing_recommendations"\).insert/);
  assert.doesNotMatch(block, /\.update\(|\.rpc\(|body\?\.(page|query|metrics)/);
});
