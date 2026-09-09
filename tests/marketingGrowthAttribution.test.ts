import assert from "node:assert/strict";
import test from "node:test";
import { growthTrafficEvidence } from "../src/lib/marketingGrowthAttribution";
import { searchGrowthCampaignId } from "../src/lib/searchGrowthCampaign";
import type { SeangworldProviderSnapshot } from "../src/lib/seangworldIntelligence";
const page = "https://news.seangworld.com/";
const id = searchGrowthCampaignId("owner", page, "news");
const now = new Date("2026-09-09T10:00:00Z");
function fixture() {
  return { id: "ga4", status: "configured", connectionStatus: "connected", freshness: "current", lastSuccessfulSynchronizationAt: now.toISOString(), data: {
    qualifiedTrafficWindow: { scopeId: "seangworldnews", current: { startDate: "2026-08-10", endDate: "2026-09-08" }, previous: { startDate: "2026-07-11", endDate: "2026-08-09" } },
    qualifiedTraffic: [{ source: "seangworld", medium: "organic_social", campaignId: id, campaignName: id, landingPage: "/", sessions: 10, previousSessions: 8, qualifiedActions: 3, previousQualifiedActions: 1 }],
  } } as SeangworldProviderSnapshot;
}
test("complete acquisition identity yields advisory intent evidence with exact equal windows", () => {
  const result = growthTrafficEvidence(fixture(), page, id, now);
  assert.equal(result.available, true); assert.equal(result.decision, "continue");
  assert.match(result.evidence.join(" "), /10 sessions; 3 qualified intent actions/);
  assert.match(result.evidence.join(" "), /not confirmed registrations/);
  assert.match(result.evidence.join(" "), /must not be summed/);
});
test("name-only or cross-product, medium, source and destination matches are refused", () => {
  for (const patch of [{ campaignId: "" }, { campaignName: "another" }, { source: "google" }, { medium: "email" }, { landingPage: "/other" }, { landingPage: "//evil.test/" }, { landingPage: "/?unknown=1" }, { landingPage: "/?utm_id=another" }]) {
    const provider = fixture(); Object.assign(provider.data!.qualifiedTraffic![0], patch);
    assert.equal(growthTrafficEvidence(provider, page, id, now).available, false, JSON.stringify(patch));
  }
  const provider = fixture(); provider.data!.qualifiedTrafficWindow!.scopeId = "thebeast";
  assert.equal(growthTrafficEvidence(provider, page, id, now).available, false);
});
test("missing prior intent, duplicate tuples and invalid counts cannot invent improvement", () => {
  const provider = fixture(); provider.data!.qualifiedTraffic![0].previousQualifiedActions = null;
  const result = growthTrafficEvidence(provider, page, id, now);
  assert.equal(result.available, true); assert.equal(result.decision, "modify");
  assert.match(result.evidence.join(" "), /unavailable.*qualified intent actions/);
  provider.data!.qualifiedTraffic!.push({ ...provider.data!.qualifiedTraffic![0] });
  assert.equal(growthTrafficEvidence(provider, page, id, now).available, false);
  const invalid = fixture(); invalid.data!.qualifiedTraffic![0].sessions = NaN;
  assert.equal(growthTrafficEvidence(invalid, page, id, now).available, false);
});
test("stale provider and invalid or unequal date ranges cannot become campaign measurements", () => {
  const provider = fixture(); provider.freshness = "stale";
  assert.equal(growthTrafficEvidence(provider, page, id, now).available, false);
  for (const startDate of ["2026-02-30", "2026-07-12", "2026-07-10"]) {
    const provider = fixture(); provider.data!.qualifiedTrafficWindow!.previous.startDate = startDate;
    assert.equal(growthTrafficEvidence(provider, page, id, now).available, false);
  }
});

test("malformed landing URLs stay unavailable without aborting the cycle", () => {
  const provider = fixture(); provider.data!.qualifiedTraffic![0].landingPage = "/\\[";
  assert.equal(growthTrafficEvidence(provider, page, id, now).available, false);
});

test("partial current UTC day cannot establish a completed comparison window", () => {
  const provider = fixture();
  provider.data!.qualifiedTrafficWindow = { scopeId: "seangworldnews", current: { startDate: "2026-08-11", endDate: "2026-09-09" }, previous: { startDate: "2026-07-12", endDate: "2026-08-10" } };
  assert.equal(growthTrafficEvidence(provider, page, id, now).available, false);
});
