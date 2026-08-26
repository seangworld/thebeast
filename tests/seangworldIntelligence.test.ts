import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSearchLandingPagePerformance,
  buildSearchOpportunities,
  buildSeangworldIntelligenceSnapshot,
  buildSeangworldRecommendations,
  buildServerSeangworldProviders,
  seangworldProviderStatusLabels,
  seangworldProviderStatuses,
  type SeangworldAnalyticsData,
} from "../src/lib/seangworldIntelligence";

const emptyData = (): SeangworldAnalyticsData => ({
  firstPartyTelemetry: null,
  visitors: null, users: null, sessions: null, views: null, engagementRate: null,
  impressions: null, clicks: null, ctr: null, averagePosition: null,
  countries: [], searchCountries: [], cities: [], devices: [], searchDevices: [], browsers: [], operatingSystems: [],
  trafficSources: [], entryPages: [], exitPages: [], topQueries: [],
  topLandingPages: [], searchLandingPages: [], searchOpportunities: [],
  searchOpportunityBaseline: null, searchTrends: [], historicalTrends: [], deviceEngagement: null,
});

test("provider cards support every required graceful state", () => {
  assert.deepEqual(seangworldProviderStatuses, [
    "configured", "not_configured", "unavailable", "synchronization_failed", "no_data",
  ]);
  assert.deepEqual(Object.values(seangworldProviderStatusLabels), [
    "Configured", "Not Configured", "Unavailable", "Synchronization Failed", "No Data",
  ]);
});

test("unconfigured providers expose guidance without analytics or fake recommendations", () => {
  const providers = buildServerSeangworldProviders({}, "2026-07-28T12:00:00Z");
  assert.ok(providers.every((provider) => provider.status === "not_configured"));
  assert.ok(providers.every((provider) => provider.data === null));
  const snapshot = buildSeangworldIntelligenceSnapshot({ providers, generatedAt: "2026-07-28T12:00:00Z" });
  assert.equal(snapshot.data.visitors, null);
  assert.deepEqual(snapshot.recommendations, []);
  assert.match(snapshot.limitations.join(" "), /No provider returned verified analytics data/);
});

test("server configuration never returns credential values", () => {
  const providers = buildServerSeangworldProviders({
    BEAST_ECOSYSTEM_GA4_PROPERTY_ID: "property-secret",
    GOOGLE_WIF_PROVIDER_RESOURCE: "projects/123/locations/global/workloadIdentityPools/private-pool/providers/private-provider",
    GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL: "private@example.iam.gserviceaccount.com",
  }, "2026-07-28T12:00:00Z");
  const serialized = JSON.stringify(providers);
  assert.doesNotMatch(serialized, /property-secret|private@example|private-pool/);
  assert.equal(providers[0]?.status, "configured");
  assert.equal(providers[0]?.data, null);
});

test("deterministic rules identify high exits low CTR growth mobile weakness and spikes", () => {
  const data = emptyData();
  data.sessions = { value: 300, previousValue: 150 };
  data.impressions = { value: 2000, previousValue: 1800 };
  data.ctr = { value: 0.015, previousValue: 0.025 };
  data.exitPages = [{ label: "/beast", value: 80, exitRate: 0.7 }];
  data.topQueries = [
    { label: "beast platform", value: 10, impressions: 2000, clicks: 20, ctr: 0.01, previousImpressions: 1000 },
  ];
  data.deviceEngagement = {
    mobileSessions: 600, desktopSessions: 400,
    mobileEngagementRate: 0.35, desktopEngagementRate: 0.6,
  };
  assert.deepEqual(
    buildSeangworldRecommendations(data, "30 days vs prior 30 days").map((item) => item.id),
    ["high_exit_page", "low_ctr", "falling_ctr", "growing_impressions", "mobile_weakness", "traffic_spike"]
  );
});

test("recommendations contain metrics comparison confidence rationale and owner review", () => {
  const data = emptyData();
  data.sessions = { value: 180, previousValue: 100 };
  const recommendation = buildSeangworldRecommendations(data, "current vs prior")[0];
  assert.ok(recommendation);
  assert.match(recommendation.supportingMetric, /sessions/);
  assert.equal(recommendation.comparisonPeriod, "current vs prior");
  assert.equal(recommendation.confidence, "high");
  assert.ok(recommendation.rationale);
  assert.ok(recommendation.suggestedOwnerReview);
});

test("page-query evidence receives exactly one governed SEO disposition", () => {
  const current = [
    { page: "https://www.seangworld.com/focused", query: "improve me", clicks: 1, impressions: 100, ctr: 0.01, position: 10 },
    { page: "https://www.seangworld.com/", query: "support me", clicks: 1, impressions: 100, ctr: 0.01, position: 15 },
    { page: "https://www.seangworld.com/investigate", query: "investigate me", clicks: 2, impressions: 150, ctr: 0.013, position: 25 },
    { page: "https://www.seangworld.com/watch", query: "watch me", clicks: 1, impressions: 30, ctr: 0.033, position: 25 },
    { page: "https://www.seangworld.com/ignore", query: "ignore me", clicks: 0, impressions: 5, ctr: 0, position: 70 },
  ];
  const previous = [
    { ...current[0], impressions: 80 },
    { ...current[1], impressions: 80 },
    { ...current[2], impressions: 250 },
    { ...current[3], impressions: 20 },
  ];
  const byQuery = new Map(
    buildSearchOpportunities(current, previous).map((item) => [
      item.query,
      item,
    ])
  );
  assert.equal(byQuery.get("improve me")?.disposition, "Improve Existing Page");
  assert.equal(byQuery.get("support me")?.disposition, "Create Supporting Content");
  assert.equal(byQuery.get("investigate me")?.disposition, "Investigate");
  assert.equal(byQuery.get("watch me")?.disposition, "Watch");
  assert.equal(byQuery.get("ignore me")?.disposition, "Ignore");
  assert.ok([...byQuery.values()].every((item) => item.rationale && item.score >= 0 && item.score <= 100));
  assert.equal(byQuery.get("improve me")?.change.impressions, 20);
  assert.equal(byQuery.get("improve me")?.classification, "Optimize Existing");
  assert.equal(byQuery.get("support me")?.classification, "Create New");
  assert.equal(byQuery.get("investigate me")?.classification, "Monitor");
  assert.equal(byQuery.get("ignore me")?.classification, "Ignore");
  assert.equal(byQuery.get("support me")?.ownerApprovalRequired, true);
  assert.equal(byQuery.get("improve me")?.ownerApprovalRequired, false);
  assert.ok(byQuery.get("support me")?.signals.includes("No strong matching page"));
});

test("new search gaps recommend useful formats instead of defaulting every query to an article", () => {
  const opportunities = buildSearchOpportunities([
    { page: "https://www.seangworld.com/tools", query: "house flipping roi calculator", clicks: 1, impressions: 120, ctr: 0.008, position: 12 },
    { page: "https://www.seangworld.com/guides", query: "home renovation checklist", clicks: 1, impressions: 90, ctr: 0.011, position: 18 },
    { page: "https://www.seangworld.com/articles", query: "ai productivity platform", clicks: 1, impressions: 80, ctr: 0.0125, position: 20 },
  ], []);
  const byQuery = new Map(opportunities.map((item) => [item.query, item]));
  assert.equal(byQuery.get("house flipping roi calculator")?.recommendedAsset, "Calculator");
  assert.equal(byQuery.get("home renovation checklist")?.recommendedAsset, "Guide");
  assert.equal(byQuery.get("ai productivity platform")?.recommendedAsset, "Product");
  assert.ok(opportunities.every((item) => item.classification === "Create New"));
});

test("landing-page performance preserves a missing prior period instead of inventing zero", () => {
  const pages = buildSearchLandingPagePerformance(
    [{ page: "https://www.seangworld.com/new", clicks: 0, impressions: 20, ctr: 0, position: 30 }],
    []
  );
  assert.equal(pages[0]?.previous, null);
  assert.equal(pages[0]?.change.impressions, null);
});

test("page-query baselines add the bounded Search Console limitation", () => {
  const data = emptyData();
  data.searchOpportunityBaseline = {
    currentStartDate: "2026-07-01", currentEndDate: "2026-07-30",
    previousStartDate: "2026-06-01", previousEndDate: "2026-06-30",
    dataThroughDate: "2026-07-30", rowLimit: 500, partialData: true,
  };
  const snapshot = buildSeangworldIntelligenceSnapshot({
    generatedAt: "2026-07-31T12:00:00Z",
    providers: [{
      id: "search_console", label: "Google Search Console", status: "configured",
      connectionStatus: "connected", guidance: "Verified provider data is available.",
      lastSynchronizationAt: "2026-07-31T12:00:00Z", lastSuccessfulSynchronizationAt: "2026-07-31T12:00:00Z",
      freshness: "current", dataThroughDate: "2026-07-30", reportingDelayDays: 1,
      error: null, data,
    }],
  });
  assert.match(snapshot.limitations.join(" "), /anonymize or omit query rows/);
});

test("owner route and dashboard contain all required sections and no AI claim path", () => {
  const route = readFileSync("src/app/api/admin/seangworld-intelligence/route.ts", "utf8");
  const workspace = readFileSync(
    "src/app/dashboard/admin/intelligence/SeangworldIntelligenceWorkspace.tsx",
    "utf8"
  );
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /cache-control/);
  for (const label of [
    "Executive Summary", "Visitors", "Users", "Sessions", "Views", "Engagement",
    "Impressions", "Clicks", "CTR", "Average Position", "Countries",
    "Cities", "Devices", "Browsers", "Operating Systems", "Traffic Sources",
    "Landing Pages", "Exit Pages", "Top Queries", "Top Landing Pages",
    "Historical Trends", "Search Performance Trends", "Content Gap &amp; Search Opportunity Generation",
    "Optimize Existing", "Create New", "Monitor", "Ignore", "Best format",
    "Owner approval required before publication",
    "Improve Existing Page", "Create Supporting Content", "Investigate", "Watch", "Ignore",
    "Baseline", "BeastHunter is canonically registered", "Final Data Through", "Reporting Delay",
    "Provider Status", "Connection Status", "Last Sync", "Data Freshness",
  ]) assert.match(workspace, new RegExp(label));
  assert.doesNotMatch(workspace, /OpenAI|generate.*summary|AI-generated/i);
});
