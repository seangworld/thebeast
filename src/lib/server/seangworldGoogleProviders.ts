import { createSign } from "node:crypto";
import type {
  IntelligenceDimension,
  IntelligenceMetric,
  SeangworldAnalyticsData,
  SeangworldProviderSnapshot,
} from "../seangworldIntelligence";

type ServerEnvironment = Readonly<Record<string, string | undefined>>;
type FetchImplementation = typeof fetch;

type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type Ga4Cell = { value?: string };
type Ga4Row = {
  dimensionValues?: Ga4Cell[];
  metricValues?: Ga4Cell[];
};
type Ga4Report = { rows?: Ga4Row[] };

type SearchConsoleRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};
type SearchConsoleResponse = { rows?: SearchConsoleRow[] };

type ProviderError = {
  code: string;
  message: string;
  retryable: boolean;
};

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
].join(" ");
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_RETRIES = 2;

let cachedProviders:
  | { expiresAt: number; cacheKey: string; providers: SeangworldProviderSnapshot[] }
  | null = null;
let inFlightProviders: Promise<SeangworldProviderSnapshot[]> | null = null;

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createServiceAccountAssertion(
  email: string,
  privateKey: string,
  now: Date
) {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: email,
      scope: GOOGLE_SCOPES,
      aud: GOOGLE_TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3600,
    })
  );
  const unsigned = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${base64Url(
    signer.sign(privateKey.replace(/\\n/g, "\n"))
  )}`;
}

async function requestWithRetry(
  fetchImplementation: FetchImplementation,
  url: string,
  init: RequestInit,
  retries = MAX_RETRIES
) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchImplementation(url, init);
      if (
        response.ok ||
        ![429, 500, 502, 503, 504].includes(response.status) ||
        attempt === retries
      ) {
        return response;
      }
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(250 * 2 ** attempt, 1000))
    );
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Provider request failed.");
}

async function getGoogleAccessToken(
  environment: ServerEnvironment,
  now: Date,
  fetchImplementation: FetchImplementation
) {
  const email = environment.SEANGWORLD_GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = environment.SEANGWORLD_GOOGLE_PRIVATE_KEY;
  if (!email || !privateKey) throw new Error("Google credentials are incomplete.");
  const assertion = createServiceAccountAssertion(email, privateKey, now);
  const response = await requestWithRetry(fetchImplementation, GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) {
    throw new Error(`Google authentication failed (${response.status}).`);
  }
  const token = (await response.json()) as GoogleTokenResponse;
  if (!token.access_token) throw new Error("Google authentication returned no token.");
  return token.access_token;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateRanges(now: Date) {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 29);
  const previousEnd = new Date(start);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - 29);
  return {
    current: { startDate: isoDate(start), endDate: isoDate(end) },
    previous: {
      startDate: isoDate(previousStart),
      endDate: isoDate(previousEnd),
    },
  };
}

function numeric(cell: Ga4Cell | undefined) {
  const value = Number(cell?.value);
  return Number.isFinite(value) ? value : 0;
}

function dimensions(report: Ga4Report, secondaryMetric = false) {
  return (report.rows || []).map((row) => ({
    label: row.dimensionValues?.[0]?.value || "Unknown",
    value: numeric(row.metricValues?.[0]),
    ...(secondaryMetric
      ? { secondaryValue: numeric(row.metricValues?.[1]) }
      : {}),
  }));
}

function gaRequest(
  propertyId: string,
  accessToken: string,
  fetchImplementation: FetchImplementation,
  body: Record<string, unknown>
) {
  return requestWithRetry(
    fetchImplementation,
    `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
      propertyId
    )}:runReport`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }
  ).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Google Analytics 4 request failed (${response.status}).`);
    }
    return (await response.json()) as Ga4Report;
  });
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  mapper: (item: T) => Promise<R>
) {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker())
  );
  return results;
}

async function loadGa4Data(
  environment: ServerEnvironment,
  accessToken: string,
  now: Date,
  fetchImplementation: FetchImplementation
): Promise<Partial<SeangworldAnalyticsData>> {
  const propertyId = environment.SEANGWORLD_GA4_PROPERTY_ID;
  if (!propertyId) throw new Error("GA4 property ID is missing.");
  const ranges = dateRanges(now);
  const reportDefinitions = [
    {
      key: "current",
      body: {
        dateRanges: [ranges.current],
        metrics: [
          { name: "activeUsers" },
          { name: "totalUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "engagementRate" },
        ],
      },
    },
    {
      key: "previous",
      body: {
        dateRanges: [ranges.previous],
        metrics: [
          { name: "activeUsers" },
          { name: "totalUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
          { name: "engagementRate" },
        ],
      },
    },
    ...[
      ["countries", "country", "activeUsers"],
      ["cities", "city", "activeUsers"],
      ["devices", "deviceCategory", "sessions"],
      ["browsers", "browser", "sessions"],
      ["operatingSystems", "operatingSystem", "sessions"],
      ["trafficSources", "sessionSource", "sessions"],
      ["topLandingPages", "landingPagePlusQueryString", "sessions"],
    ].map(([key, dimension, metric]) => ({
      key,
      body: {
        dateRanges: [ranges.current],
        dimensions: [{ name: dimension }],
        metrics: [{ name: metric }],
        orderBys: [{ metric: { metricName: metric }, desc: true }],
        limit: "10",
      },
    })),
    {
      key: "exitPages",
      body: {
        dateRanges: [ranges.current],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "exits" }, { name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "exits" }, desc: true }],
        limit: "10",
      },
    },
    {
      key: "historicalTrends",
      body: {
        dateRanges: [ranges.current],
        dimensions: [{ name: "date" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "screenPageViews" },
        ],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      },
    },
    {
      key: "deviceEngagement",
      body: {
        dateRanges: [ranges.current],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [{ name: "sessions" }, { name: "engagementRate" }],
      },
    },
  ] as const;
  const reports = await mapWithConcurrency(reportDefinitions, 3, (definition) =>
    gaRequest(propertyId, accessToken, fetchImplementation, definition.body)
  );
  const byKey = Object.fromEntries(
    reportDefinitions.map((definition, index) => [definition.key, reports[index]])
  ) as Record<string, Ga4Report>;
  const current = byKey.current.rows?.[0]?.metricValues || [];
  const previous = byKey.previous.rows?.[0]?.metricValues || [];
  const hasSummary = Boolean(
    byKey.current.rows?.length || byKey.previous.rows?.length
  );
  const metric = (index: number): IntelligenceMetric | null =>
    hasSummary
      ? {
          value: numeric(current[index]),
          previousValue: byKey.previous.rows?.length
            ? numeric(previous[index])
            : null,
        }
      : null;
  const exitPages = dimensions(byKey.exitPages, true).map((page) => ({
    ...page,
    exitRate:
      page.secondaryValue && page.secondaryValue > 0
        ? page.value / page.secondaryValue
        : null,
  }));
  const deviceRows = dimensions(byKey.deviceEngagement, true);
  const mobile = deviceRows.find((row) => row.label.toLowerCase() === "mobile");
  const desktop = deviceRows.find((row) => row.label.toLowerCase() === "desktop");
  return {
    visitors: metric(0),
    users: metric(1),
    sessions: metric(2),
    views: metric(3),
    engagementRate: metric(4),
    countries: dimensions(byKey.countries),
    cities: dimensions(byKey.cities),
    devices: dimensions(byKey.devices),
    browsers: dimensions(byKey.browsers),
    operatingSystems: dimensions(byKey.operatingSystems),
    trafficSources: dimensions(byKey.trafficSources),
    entryPages: dimensions(byKey.topLandingPages),
    topLandingPages: dimensions(byKey.topLandingPages),
    exitPages,
    historicalTrends: (byKey.historicalTrends.rows || []).map((row) => ({
      date: row.dimensionValues?.[0]?.value || "",
      visitors: numeric(row.metricValues?.[0]),
      sessions: numeric(row.metricValues?.[1]),
      views: numeric(row.metricValues?.[2]),
    })),
    deviceEngagement:
      mobile && desktop
        ? {
            mobileSessions: mobile.value,
            desktopSessions: desktop.value,
            mobileEngagementRate: mobile.secondaryValue || 0,
            desktopEngagementRate: desktop.secondaryValue || 0,
          }
        : null,
  };
}

async function searchConsoleRequest(
  siteUrl: string,
  accessToken: string,
  fetchImplementation: FetchImplementation,
  body: Record<string, unknown>
) {
  const response = await requestWithRetry(
    fetchImplementation,
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
      siteUrl
    )}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) {
    throw new Error(`Google Search Console request failed (${response.status}).`);
  }
  return (await response.json()) as SearchConsoleResponse;
}

async function loadSearchConsoleData(
  environment: ServerEnvironment,
  accessToken: string,
  now: Date,
  fetchImplementation: FetchImplementation
): Promise<Partial<SeangworldAnalyticsData>> {
  const siteUrl = environment.SEANGWORLD_SEARCH_CONSOLE_SITE_URL;
  if (!siteUrl) throw new Error("Search Console site URL is missing.");
  const ranges = dateRanges(now);
  const [currentTotals, previousTotals, current, previous, pages] =
    await mapWithConcurrency(
      [
        { ...ranges.current },
        { ...ranges.previous },
        { ...ranges.current, dimensions: ["query"], rowLimit: 25 },
        { ...ranges.previous, dimensions: ["query"], rowLimit: 25 },
        { ...ranges.current, dimensions: ["page"], rowLimit: 10 },
      ],
      2,
      (body) =>
        searchConsoleRequest(siteUrl, accessToken, fetchImplementation, body)
    );
  const previousByQuery = new Map(
    (previous.rows || []).map((row) => [row.keys?.[0] || "", row.impressions || 0])
  );
  const topQueries = (current.rows || []).map((row) => ({
    label: row.keys?.[0] || "Unknown query",
    value: row.clicks || 0,
    impressions: row.impressions || 0,
    clicks: row.clicks || 0,
    ctr: row.ctr ?? null,
    position: row.position ?? null,
    previousImpressions: previousByQuery.get(row.keys?.[0] || "") ?? null,
  }));
  const currentSummary = currentTotals.rows?.[0];
  const previousSummary = previousTotals.rows?.[0];
  return {
    topQueries,
    impressions: currentSummary
      ? {
          value: currentSummary.impressions || 0,
          previousValue: previousSummary?.impressions ?? null,
        }
      : null,
    clicks: currentSummary
      ? {
          value: currentSummary.clicks || 0,
          previousValue: previousSummary?.clicks ?? null,
        }
      : null,
    ctr: currentSummary
      ? {
          value: currentSummary.ctr || 0,
          previousValue: previousSummary?.ctr ?? null,
        }
      : null,
    averagePosition: currentSummary
      ? {
          value: currentSummary.position || 0,
          previousValue: previousSummary?.position ?? null,
        }
      : null,
    topLandingPages: (pages.rows || []).map((row) => ({
      label: row.keys?.[0] || "Unknown page",
      value: row.clicks || 0,
      secondaryValue: row.impressions || 0,
    })),
  };
}

function safeProviderError(error: unknown): ProviderError {
  const message = error instanceof Error ? error.message : "Provider request failed.";
  const status = message.match(/\((\d{3})\)/)?.[1];
  const retryable = status ? [429, 500, 502, 503, 504].includes(Number(status)) : true;
  return {
    code: status ? `provider_http_${status}` : "provider_unavailable",
    message:
      status === "401" || status === "403"
        ? "Google rejected the configured service-account access."
        : "The provider could not be synchronized safely.",
    retryable,
  };
}

function liveProvider(input: {
  id: "ga4" | "search_console";
  label: string;
  data: Partial<SeangworldAnalyticsData>;
  synchronizedAt: string;
}): SeangworldProviderSnapshot {
  const hasData = Object.values(input.data).some((value) =>
    Array.isArray(value) ? value.length > 0 : value !== null && value !== undefined
  );
  return {
    id: input.id,
    label: input.label,
    status: hasData ? "configured" : "no_data",
    connectionStatus: hasData ? "connected" : "no_data",
    guidance: hasData
      ? "Live provider data synchronized successfully."
      : "The provider connection succeeded but returned no records for this period.",
    lastSynchronizationAt: input.synchronizedAt,
    lastSuccessfulSynchronizationAt: input.synchronizedAt,
    freshness: "current",
    error: null,
    data: hasData ? input.data : null,
  };
}

function failedProvider(
  id: "ga4" | "search_console",
  label: string,
  error: unknown,
  synchronizedAt: string
): SeangworldProviderSnapshot {
  const safeError = safeProviderError(error);
  return {
    id,
    label,
    status: safeError.retryable ? "unavailable" : "synchronization_failed",
    connectionStatus: safeError.retryable ? "unavailable" : "failed",
    guidance: safeError.message,
    lastSynchronizationAt: synchronizedAt,
    lastSuccessfulSynchronizationAt: null,
    freshness: "unknown",
    error: safeError,
    data: null,
  };
}

function cacheKey(environment: ServerEnvironment) {
  return [
    environment.SEANGWORLD_GA4_PROPERTY_ID || "",
    environment.SEANGWORLD_SEARCH_CONSOLE_SITE_URL || "",
    environment.SEANGWORLD_GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
  ].join("|");
}

export async function loadLiveSeangworldProviders(
  environment: ServerEnvironment,
  now = new Date(),
  fetchImplementation: FetchImplementation = fetch
) {
  const configuredGa4 = Boolean(
    environment.SEANGWORLD_GA4_PROPERTY_ID &&
      environment.SEANGWORLD_GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      environment.SEANGWORLD_GOOGLE_PRIVATE_KEY
  );
  const configuredSearchConsole = Boolean(
    environment.SEANGWORLD_SEARCH_CONSOLE_SITE_URL &&
      environment.SEANGWORLD_GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      environment.SEANGWORLD_GOOGLE_PRIVATE_KEY
  );
  if (!configuredGa4 && !configuredSearchConsole) return null;
  const key = cacheKey(environment);
  if (cachedProviders && cachedProviders.expiresAt > now.getTime() && cachedProviders.cacheKey === key) {
    return cachedProviders.providers;
  }
  if (inFlightProviders) return inFlightProviders;
  const synchronizedAt = now.toISOString();
  inFlightProviders = (async () => {
    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken(
        environment,
        now,
        fetchImplementation
      );
    } catch (error) {
      return [
        ...(configuredGa4
          ? [failedProvider("ga4", "Google Analytics 4", error, synchronizedAt)]
          : []),
        ...(configuredSearchConsole
          ? [
              failedProvider(
                "search_console",
                "Google Search Console",
                error,
                synchronizedAt
              ),
            ]
          : []),
      ];
    }
    const providers = await Promise.all([
      configuredGa4
        ? loadGa4Data(environment, accessToken, now, fetchImplementation)
            .then((data) =>
              liveProvider({
                id: "ga4",
                label: "Google Analytics 4",
                data,
                synchronizedAt,
              })
            )
            .catch((error) =>
              failedProvider("ga4", "Google Analytics 4", error, synchronizedAt)
            )
        : null,
      configuredSearchConsole
        ? loadSearchConsoleData(
            environment,
            accessToken,
            now,
            fetchImplementation
          )
            .then((data) =>
              liveProvider({
                id: "search_console",
                label: "Google Search Console",
                data,
                synchronizedAt,
              })
            )
            .catch((error) =>
              failedProvider(
                "search_console",
                "Google Search Console",
                error,
                synchronizedAt
              )
            )
        : null,
    ]);
    return providers.filter(
      (provider): provider is SeangworldProviderSnapshot => provider !== null
    );
  })();
  try {
    const providers = await inFlightProviders;
    cachedProviders = {
      cacheKey: key,
      expiresAt: now.getTime() + CACHE_TTL_MS,
      providers,
    };
    return providers;
  } finally {
    inFlightProviders = null;
  }
}
