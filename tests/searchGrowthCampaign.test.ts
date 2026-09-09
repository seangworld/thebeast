import assert from "node:assert/strict";
import test from "node:test";
import { buildSearchOpportunities, type SeangworldProviderSnapshot } from "../src/lib/seangworldIntelligence";
import { prepareSearchGrowthCampaign, searchGrowthCampaignId, searchGrowthProduct } from "../src/lib/searchGrowthCampaign";

const page = "https://news.seangworld.com/";
const query = "north carolina news";
const now = new Date("2026-09-09T00:00:00Z");
function fixture() {
  return {
    id: "search_console", status: "configured", connectionStatus: "connected", freshness: "recent",
    lastSuccessfulSynchronizationAt: now.toISOString(),
    data: {
      searchOpportunityBaseline: { currentStartDate: "2026-08-08", currentEndDate: "2026-09-06", previousStartDate: "2026-07-09", previousEndDate: "2026-08-07", dataThroughDate: "2026-09-06", rowLimit: 500, partialData: true },
      searchOpportunities: buildSearchOpportunities([{ page, query, clicks: 12, impressions: 120, ctr: 0.1, position: 6 }], []),
    },
  } as SeangworldProviderSnapshot;
}
const prepare = (provider = fixture(), requestedPage = page, requestedQuery = query) => prepareSearchGrowthCampaign({ provider, page: requestedPage, query: requestedQuery, now });

test("verified search demand creates an evidence-bound review draft, not publication authority", () => {
  const draft = prepare();
  assert.ok(draft);
  assert.equal(draft.channels[0], "Organic search");
  assert.match(draft.sourceFacts[1].label, /2026-08-08 to 2026-09-06.*12 clicks/);
  assert.match(draft.sourceFacts[2].label, /unavailable/);
  assert.ok(draft.limitations.some((item) => item.includes("no publication")));
  assert.ok(draft.sourceFacts.some((item) => item.limitation?.includes("not a verified product or news claim")));
});

test("one opportunity has a stable owner-specific identity across retries and reporting windows", () => {
  const id = searchGrowthCampaignId("owner-a", page, query);
  assert.equal(id, searchGrowthCampaignId("owner-a", page, query));
  assert.notEqual(id, searchGrowthCampaignId("owner-b", page, query));
  assert.notEqual(id, searchGrowthCampaignId("owner-a", page, "other query"));
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("growth targets only canonical Beast and News public destinations", () => {
  assert.equal(searchGrowthProduct(page), "seangworldnews");
  assert.equal(searchGrowthProduct("https://thebeast.seangworld.com/"), "thebeast");
  for (const url of ["https://seangworld.com/", "https://news.seangworld.com.evil.test/", "http://news.seangworld.com/", "https://name@news.seangworld.com/", "https://news.seangworld.com:8443/", "https://thebeast.seangworld.com/dashboard", "https://news.seangworld.com/api/news", "https://news.seangworld.com/?token=secret", "https://news.seangworld.com/#private", "malformed"]) assert.equal(searchGrowthProduct(url), null, url);
});

test("provider failure, stale or future synchronization cannot create campaign evidence", () => {
  for (const patch of [{ status: "no_data" }, { connectionStatus: "failed" }, { freshness: "stale" }, { id: "ga4" }, { lastSuccessfulSynchronizationAt: "invalid" }, { lastSuccessfulSynchronizationAt: "2026-09-08T20:00:00Z" }, { lastSuccessfulSynchronizationAt: "2026-09-10T00:00:00Z" }]) {
    assert.equal(prepare({ ...fixture(), ...patch } as SeangworldProviderSnapshot), null);
  }
});

test("unseen client opportunities and monitor-only evidence are refused", () => {
  assert.equal(prepare(fixture(), page, "invented query"), null);
  const provider = fixture();
  provider.data!.searchOpportunities![0].classification = "Monitor";
  assert.equal(prepare(provider), null);
});

test("baseline windows must be recent, valid, equal, adjacent and finalized", () => {
  for (const patch of [{ currentStartDate: "invalid" }, { previousStartDate: "2026-07-08" }, { currentStartDate: "2026-08-09" }, { dataThroughDate: "2026-09-07" }, { currentEndDate: "2026-09-30", dataThroughDate: "2026-09-30" }, { currentEndDate: "2026-02-30" }]) {
    const provider = fixture();
    Object.assign(provider.data!.searchOpportunityBaseline!, patch);
    assert.equal(prepare(provider), null, JSON.stringify(patch));
  }
});

test("invalid current metrics cannot become a baseline", () => {
  for (const patch of [{ clicks: NaN }, { impressions: -1 }, { ctr: 2 }, { position: Infinity }, { clicks: 121 }]) {
    const provider = fixture();
    Object.assign(provider.data!.searchOpportunities![0].current, patch);
    assert.equal(prepare(provider), null);
  }
});
