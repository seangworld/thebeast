import assert from "node:assert/strict";
import test from "node:test";
import { loadLiveSeangworldProviders } from "../src/lib/server/seangworldGoogleProviders";

function workloadIdentityEnvironment(suffix: string) {
  return {
    BEAST_ECOSYSTEM_GA4_PROPERTY_ID: `property-${suffix}`,
    SEANGWORLD_SEARCH_CONSOLE_SITE_URL: `https://example-${suffix}.com/`,
    GOOGLE_WIF_PROVIDER_RESOURCE:
      `projects/123456789/locations/global/workloadIdentityPools/vercel/providers/${suffix}`,
    GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL:
      `analytics-${suffix}@example.iam.gserviceaccount.com`,
  };
}

test("live Google providers remain optional", async () => {
  assert.equal(
    await loadLiveSeangworldProviders(
      {},
      new Date("2026-07-28T12:00:00Z")
    ),
    null
  );
});

test("Google authentication failures degrade safely without credential exposure", async () => {
  const environment = workloadIdentityEnvironment("failure");
  const providers = await loadLiveSeangworldProviders(
    environment,
    new Date("2026-07-28T12:00:00Z"),
    fetch,
    async () => {
      throw new Error("Google authentication failed (403).");
    }
  );
  assert.ok(providers);
  assert.deepEqual(
    providers.map((provider) => provider.status),
    ["synchronization_failed", "synchronization_failed"]
  );
  assert.ok(providers.every((provider) => provider.connectionStatus === "failed"));
  assert.ok(providers.every((provider) => provider.error?.retryable === false));
  const serialized = JSON.stringify(providers);
  assert.doesNotMatch(
    serialized,
    /analytics-failure@example|workloadIdentityPools|property-failure/
  );
});

test("live GA4 and Search Console responses map to the provider-neutral dashboard", async () => {
  const environment = workloadIdentityEnvironment("live");
  const observedStartDates = new Set<string>();
  const fetchImplementation: typeof fetch = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body || "{}")) as {
      startDate?: string;
      dateRanges?: { startDate?: string }[];
      dimensions?: { name?: string }[] | string[];
      metrics?: { name?: string }[];
    };
    const startDate = body.dateRanges?.[0]?.startDate || body.startDate;
    if (startDate) observedStartDates.add(startDate);
    if (url.includes("analyticsdata.googleapis.com")) {
      const dimension = (body.dimensions?.[0] as { name?: string } | undefined)
        ?.name;
      if (!dimension) {
        const current = body.dateRanges?.[0]?.startDate === "2026-07-21";
        return new Response(
          JSON.stringify({
            rows: [
              {
                metricValues: (current
                  ? [100, 120, 200, 300, 0.6]
                  : [80, 100, 150, 250, 0.55]
                ).map((value) => ({ value: String(value) })),
              },
            ],
          })
        );
      }
      if (
        dimension === "deviceCategory" &&
        body.metrics?.some((metric) => metric.name === "engagementRate")
      ) {
        return new Response(
          JSON.stringify({
            rows: [
              {
                dimensionValues: [{ value: "mobile" }],
                metricValues: [{ value: "120" }, { value: "0.4" }],
              },
              {
                dimensionValues: [{ value: "desktop" }],
                metricValues: [{ value: "80" }, { value: "0.65" }],
              },
            ],
          })
        );
      }
      const metricValues =
        dimension === "pagePath"
          ? [{ value: "70" }, { value: "100" }]
          : dimension === "date"
            ? [{ value: "20" }, { value: "30" }, { value: "40" }]
            : [{ value: "50" }];
      return new Response(
        JSON.stringify({
          rows: [
            {
              dimensionValues: [
                {
                  value:
                    dimension === "date"
                      ? "20260727"
                      : dimension === "pagePath"
                        ? "/release-notes"
                        : "Verified",
                },
              ],
              metricValues,
            },
          ],
        })
      );
    }
    const dimensions = body.dimensions as string[] | undefined;
    if (dimensions?.[0] === "page") {
      return new Response(
        JSON.stringify({
          rows: [
            {
              keys: ["https://thebeast.seangworld.com/release-notes"],
              clicks: 25,
              impressions: 500,
              ctr: 0.05,
              position: 4,
            },
          ],
        })
      );
    }
    const current = body.startDate === "2026-07-21";
    return new Response(
      JSON.stringify({
        rows: [
          {
            keys: ["beast platform"],
            clicks: current ? 20 : 12,
            impressions: current ? 2000 : 1000,
            ctr: current ? 0.01 : 0.012,
            position: current ? 5 : 6,
          },
        ],
      })
    );
  };
  const providers = await loadLiveSeangworldProviders(
    environment,
    new Date("2026-07-28T12:00:00Z"),
    fetchImplementation,
    async () => "test-access-token",
    7
  );
  const ga4 = providers?.find((provider) => provider.id === "ga4");
  const searchConsole = providers?.find(
    (provider) => provider.id === "search_console"
  );
  assert.equal(ga4?.connectionStatus, "connected");
  assert.deepEqual(ga4?.data?.visitors, { value: 100, previousValue: 80 });
  assert.deepEqual(ga4?.data?.users, { value: 120, previousValue: 100 });
  assert.equal(ga4?.data?.exitPages?.[0]?.exitRate, 0.7);
  assert.equal(searchConsole?.connectionStatus, "connected");
  assert.deepEqual(searchConsole?.data?.impressions, {
    value: 2000,
    previousValue: 1000,
  });
  assert.equal(searchConsole?.data?.topQueries?.[0]?.position, 5);
  assert.equal(searchConsole?.data?.topLandingPages?.[0]?.secondaryValue, 500);
  assert.ok(observedStartDates.has("2026-07-21"));
  assert.ok(observedStartDates.has("2026-07-14"));
});

test("live Google providers reject unsupported reporting ranges before authentication", async () => {
  await assert.rejects(
    loadLiveSeangworldProviders(
      workloadIdentityEnvironment("invalid-range"),
      new Date("2026-07-28T12:00:00Z"),
      fetch,
      async () => "unused",
      365
    ),
    /Unsupported analytics reporting range/
  );
});
