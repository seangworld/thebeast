import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { loadLiveSeangworldProviders } from "../src/lib/server/seangworldGoogleProviders";

function serviceAccountEnvironment(suffix: string) {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    SEANGWORLD_GA4_PROPERTY_ID: `property-${suffix}`,
    SEANGWORLD_SEARCH_CONSOLE_SITE_URL: `https://example-${suffix}.com/`,
    SEANGWORLD_GOOGLE_SERVICE_ACCOUNT_EMAIL: `analytics-${suffix}@example.com`,
    SEANGWORLD_GOOGLE_PRIVATE_KEY: privateKey.export({
      type: "pkcs8",
      format: "pem",
    }).toString(),
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
  const environment = serviceAccountEnvironment("failure");
  const providers = await loadLiveSeangworldProviders(
    environment,
    new Date("2026-07-28T12:00:00Z"),
    async () =>
      new Response(JSON.stringify({ error: "forbidden" }), { status: 403 })
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
    /analytics-failure@example\.com|BEGIN PRIVATE KEY|property-failure/
  );
});

test("live GA4 and Search Console responses map to the provider-neutral dashboard", async () => {
  const environment = serviceAccountEnvironment("live");
  const fetchImplementation: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "test-access-token" }), {
        status: 200,
      });
    }
    const body = JSON.parse(String(init?.body || "{}")) as {
      startDate?: string;
      dateRanges?: { startDate?: string }[];
      dimensions?: { name?: string }[] | string[];
      metrics?: { name?: string }[];
    };
    if (url.includes("analyticsdata.googleapis.com")) {
      const dimension = (body.dimensions?.[0] as { name?: string } | undefined)
        ?.name;
      if (!dimension) {
        const current = (body.dateRanges?.[0]?.startDate || "") >= "2026-06-01";
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
    const current = (body.startDate || "") >= "2026-06-01";
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
    fetchImplementation
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
});
