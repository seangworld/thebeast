import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSeangworldIntelligenceSnapshot,
  buildSeangworldRecommendations,
  buildServerSeangworldProviders,
  seangworldProviderStatusLabels,
  seangworldProviderStatuses,
  type SeangworldAnalyticsData,
} from "../src/lib/seangworldIntelligence";

const emptyData = (): SeangworldAnalyticsData => ({
  visitors: null, users: null, sessions: null, views: null, engagementRate: null,
  impressions: null, clicks: null, ctr: null, averagePosition: null,
  countries: [], searchCountries: [], cities: [], devices: [], searchDevices: [], browsers: [], operatingSystems: [],
  trafficSources: [], entryPages: [], exitPages: [], topQueries: [],
  topLandingPages: [], searchTrends: [], historicalTrends: [], deviceEngagement: null,
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
    "Historical Trends", "Search Performance Trends", "Final Data Through", "Reporting Delay",
    "Provider Status", "Connection Status", "Last Sync", "Data Freshness",
  ]) assert.match(workspace, new RegExp(label));
  assert.doesNotMatch(workspace, /OpenAI|generate.*summary|AI-generated/i);
});
