import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  findRevenuePlacement,
  projectMonthlyRevenue,
  revenuePlacements,
  revenueSourceRegistry,
  sanitizeReportingPage,
} from "../src/lib/revenueCenter";
import { loadAdSenseRevenueSnapshot } from "../src/lib/server/adsenseRevenueProvider";
import {
  seangworldAdSenseClientId,
  seangworldAdSensePublisherId,
} from "../src/lib/adsense";

test("BA-ADS-201 registers AdSense without fabricating future revenue sources", () => {
  assert.equal(revenueSourceRegistry[0].id, "adsense");
  assert.equal(revenueSourceRegistry[0].generation, "Generation 1");
  assert.equal(
    revenueSourceRegistry.slice(1).every((source) => source.state === "future"),
    true
  );
  assert.equal(seangworldAdSenseClientId, `ca-${seangworldAdSensePublisherId}`);
});

test("BA-ADS-201 permits only exact approved footer routes", () => {
  assert.equal(
    findRevenuePlacement("/dashboard/today")?.id,
    "beastos-dashboard-footer"
  );
  assert.equal(
    findRevenuePlacement("/dashboard/money/dashboard")?.id,
    "beastmoney-dashboard-footer"
  );
  for (const route of [
    "/dashboard/admin",
    "/dashboard/messages",
    "/dashboard/money/money-coach",
    "/dashboard/education/guidance-counselor",
    "/dashboard/health/ai-advisor",
    "/dashboard/health/medications",
    "/dashboard/uploads",
  ]) {
    assert.equal(findRevenuePlacement(route), null, route);
  }
  assert.equal(
    revenuePlacements
      .filter((placement) => !placement.eligible)
      .every((placement) => /Protected workspace/.test(placement.reason)),
    true
  );
});

test("BA-ADS-201 strips private URL details and projects only known revenue", () => {
  assert.equal(
    sanitizeReportingPage(
      "https://thebeast.seangworld.com/dashboard/today?member=secret#private"
    ),
    "thebeast.seangworld.com/dashboard/today"
  );
  assert.equal(sanitizeReportingPage("not a URL"), "Page unavailable");
  assert.equal(projectMonthlyRevenue(null), null);
  assert.equal(
    projectMonthlyRevenue(100, new Date("2026-07-10T12:00:00.000Z")),
    310
  );
});

test("BA-ADS-201 reports not configured rather than zero", async () => {
  const snapshot = await loadAdSenseRevenueSnapshot(
    { NODE_ENV: "test" },
    new Date("2026-07-30T12:00:00.000Z")
  );
  assert.equal(snapshot.state, "not_configured");
  assert.equal(snapshot.periods.today, null);
  assert.equal(snapshot.projectedMonthlyRevenue, null);
  assert.match(snapshot.diagnostic, /not been configured/);
});

test("BA-ADS-201 maps aggregate provider reports and removes page query data", async () => {
  const requests: string[] = [];
  const fetchMock: typeof fetch = async (input) => {
    const url = String(input);
    requests.push(url);
    if (url.includes("oauth2.googleapis.com")) {
      return new Response(JSON.stringify({ access_token: "test-token" }), {
        status: 200,
      });
    }
    const parsed = new URL(url);
    const dimension = parsed.searchParams.get("dimensions");
    const headers = dimension
      ? [{ name: dimension }, { name: "ESTIMATED_EARNINGS" }]
      : [
          { name: "ESTIMATED_EARNINGS" },
          { name: "PAGE_VIEWS" },
          { name: "IMPRESSIONS" },
          { name: "CLICKS" },
          { name: "PAGE_VIEWS_CTR" },
          { name: "PAGE_VIEWS_RPM" },
        ];
    const dimensionValue =
      dimension === "PAGE_URL"
        ? "https://thebeast.seangworld.com/dashboard/today?member=private"
        : dimension === "DATE"
          ? "2026-07-29"
          : "BeastOS";
    return new Response(
      JSON.stringify({
        headers,
        totals: {
          cells: [
            { value: "12.5" },
            { value: "100" },
            { value: "80" },
            { value: "2" },
            { value: "0.02" },
            { value: "125" },
          ],
        },
        rows: dimension
          ? [{ cells: [{ value: dimensionValue }, { value: "12.5" }] }]
          : [],
        currencyCode: "USD",
      }),
      { status: 200 }
    );
  };
  const snapshot = await loadAdSenseRevenueSnapshot(
    {
      NODE_ENV: "test",
      GOOGLE_CLIENT_ID: "client",
      GOOGLE_CLIENT_SECRET: "secret",
      GOOGLE_REDIRECT_URI: "https://example.com/callback",
    },
    new Date("2026-07-30T12:00:00.000Z"),
    fetchMock,
    { refreshToken: "refresh", accountId: "pub-account" }
  );
  assert.equal(snapshot.state, "available");
  assert.equal(snapshot.periods.today?.estimatedEarnings, 12.5);
  assert.equal(
    snapshot.topPages[0]?.label,
    "thebeast.seangworld.com/dashboard/today"
  );
  assert.equal(snapshot.history[0]?.date, "2026-07-29");
  assert.equal(
    requests.some((url) =>
      url.includes("accounts/pub-account/reports:generate")
    ),
    true
  );
  assert.equal(requests.some((url) => url.includes("member=private")), false);
});

test("BA-ADS-201 protects owner reporting and controls placement through feature flags", () => {
  const route = readFileSync("src/app/api/admin/revenue/route.ts", "utf8");
  const workspace = readFileSync(
    "src/app/dashboard/admin/ads/BeastAdminRevenueCenterWorkspace.tsx",
    "utf8"
  );
  assert.match(route, /auth\.getUser/);
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /private, no-cache, no-store/);
  assert.doesNotMatch(route, /CLIENT_SECRET|REFRESH_TOKEN/);
  assert.match(workspace, /get_beast_admin_feature_flags/);
  assert.match(workspace, /save_beast_admin_feature_flag/);
  assert.match(workspace, /save_beast_admin_feature_flag_assignment/);
  assert.match(workspace, /selected_stage: enabled \? "released" : "hidden"/);
});

test("BA-ADS-201 adds a truthful Revenue summary to CEO Mode", () => {
  const ceoMode = readFileSync(
    "src/app/dashboard/admin/BeastAdminCEOModeWorkspace.tsx",
    "utf8"
  );
  assert.match(ceoMode, /fetch\("\/api\/admin\/revenue"/);
  assert.match(ceoMode, /Today/);
  assert.match(ceoMode, /This month/);
  assert.match(ceoMode, /AdSense share/);
  assert.match(ceoMode, /Trend:/);
  assert.match(ceoMode, /Revenue reporting is unavailable/);
});

test("BA-ADS-201 has one responsive lazy consent-gated shared ad unit", () => {
  const component = readFileSync(
    "src/app/components/ads/AdSensePlacement.tsx",
    "utf8"
  );
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.equal((layout.match(/<AdSensePlacement/g) || []).length, 1);
  assert.equal((component.match(/<ins/g) || []).length, 1);
  assert.match(component, /environmentName === "production"/);
  assert.match(component, /consentAllowed/);
  assert.match(component, /IntersectionObserver/);
  assert.match(component, /strategy="lazyOnload"/);
  assert.match(component, /data-full-width-responsive="true"/);
  assert.match(component, /data-npa="1"/);
  assert.match(component, /Advertisement/);
  assert.match(component, /setBlocked\(true\)/);
});

test("BA-ADS-201 keeps Revenue responsive and placement controls accessible", () => {
  const workspace = readFileSync(
    "src/app/dashboard/admin/ads/BeastAdminRevenueCenterWorkspace.tsx",
    "utf8"
  );
  assert.match(workspace, /md:grid-cols-2 xl:grid-cols-5/);
  assert.match(workspace, /sm:flex-row sm:items-center/);
  assert.match(workspace, /min-w-0/);
  assert.match(workspace, /aria-pressed=\{enabled\}/);
  assert.match(workspace, /role="alert"/);
  assert.match(workspace, /role="status"/);
  assert.doesNotMatch(workspace, /overflow-x-hidden/);
});

test("BA-ADS-202 documents provider setup and encrypted connection storage", () => {
  const env = readFileSync("docs/ENV.md", "utf8");
  const docs = readFileSync("docs/BEASTADMIN_REVENUE_CENTER.md", "utf8");
  for (const variable of [
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_REDIRECT_URI",
    "GOOGLE_OAUTH_TOKEN_ENCRYPTION_KEY",
    "NEXT_PUBLIC_ADSENSE_FOOTER_SLOT",
  ]) {
    assert.match(env, new RegExp(variable));
  }
  assert.match(docs, /google_oauth_connections/);
  assert.match(docs, /Conversations/);
  assert.match(docs, /SEANGWORLD is a separate application/);
});
