import { getVercelOidcToken } from "@vercel/oidc";
import { IdentityPoolClient } from "google-auth-library";
import type {
  IntelligenceDimension,
  IntelligenceMetric,
  SeangworldAnalyticsData,
  SeangworldProviderSnapshot,
} from "../seangworldIntelligence";

type ServerEnvironment = Readonly<Record<string, string | undefined>>;
type FetchImplementation = typeof fetch;

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

type ProviderErrorResponse = {
  status?: number;
  data?: {
    error?: string | { code?: number; message?: string; status?: string };
    error_description?: string;
  };
};

const GOOGLE_STS_URL = "https://sts.googleapis.com/v1/token";
const GOOGLE_ANALYTICS_SCOPE =
  "https://www.googleapis.com/auth/analytics.readonly";
const GOOGLE_SEARCH_CONSOLE_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly";
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_RETRIES = 2;

let cachedProviders:
  | { expiresAt: number; cacheKey: string; providers: SeangworldProviderSnapshot[] }
  | null = null;
let inFlightProviders:
  | { cacheKey: string; promise: Promise<SeangworldProviderSnapshot[]> }
  | null = null;

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
  environment: ServerEnvironment
) {
  const providerResource = environment.GOOGLE_WIF_PROVIDER_RESOURCE
    ?.trim()
    .replace(/^https:\/\/iam\.googleapis\.com\//, "")
    .replace(/^\/\/iam\.googleapis\.com\//, "");
  const serviceAccountEmail =
    environment.GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL?.trim();
  if (!providerResource || !serviceAccountEmail) {
    throw new Error("Google workload identity configuration is incomplete.");
  }
  if (
    !/^projects\/\d+\/locations\/global\/workloadIdentityPools\/[^/]+\/providers\/[^/]+$/.test(
      providerResource
    ) ||
    !/^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(serviceAccountEmail)
  ) {
    throw new Error("Google workload identity configuration is invalid.");
  }
  const audience = `//iam.googleapis.com/${providerResource}`;
  const client = new IdentityPoolClient({
    type: "external_account",
    audience,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: GOOGLE_STS_URL,
    service_account_impersonation_url:
      `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/` +
      `${encodeURIComponent(serviceAccountEmail)}:generateAccessToken`,
    scopes: [
      ...(environment.BEAST_ECOSYSTEM_GA4_PROPERTY_ID
        ? [GOOGLE_ANALYTICS_SCOPE]
        : []),
      ...(environment.SEANGWORLD_SEARCH_CONSOLE_SITE_URL
        ? [GOOGLE_SEARCH_CONSOLE_SCOPE]
        : []),
    ],
    subject_token_supplier: {
      getSubjectToken: () =>
        getVercelOidcToken({
          audience: `https://iam.googleapis.com/${providerResource}`,
        }),
    },
  });
  const accessToken = await client.getAccessToken();
  if (!accessToken.token) {
    throw new Error("Google workload identity exchange returned no token.");
  }
  return accessToken.token;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateRanges(now: Date, reportingDays: number) {
  const end = new Date(now);
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (reportingDays - 1));
  const previousEnd = new Date(start);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - (reportingDays - 1));
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
      const responseBody = (await response.json().catch(() => null)) as
        | { error?: { message?: string } }
        | null;
      const providerMessage = responseBody?.error?.message
        ?.replace(/[\r\n]+/g, " ")
        .slice(0, 500);
      throw new Error(
        `Google Analytics 4 request failed (${response.status})${
          providerMessage ? `: ${providerMessage}` : "."
        }`
      );
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
  fetchImplementation: FetchImplementation,
  reportingDays: number
): Promise<Partial<SeangworldAnalyticsData>> {
  const propertyId = environment.BEAST_ECOSYSTEM_GA4_PROPERTY_ID;
  if (!propertyId) throw new Error("GA4 property ID is missing.");
  const ranges = dateRanges(now, reportingDays);
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
    gaRequest(propertyId, accessToken, fetchImplementation, definition.body).catch(
      (error) => {
        const message = error instanceof Error ? error.message : "GA4 request failed.";
        throw new Error(`GA4 ${definition.key} report: ${message}`);
      }
    )
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
    // GA4's Data API does not expose the legacy Universal Analytics `exits`
    // metric. Keep this empty instead of relabeling visits or bounce rate as exits.
    exitPages: [],
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
  fetchImplementation: FetchImplementation,
  reportingDays: number
): Promise<Partial<SeangworldAnalyticsData>> {
  const siteUrl = environment.SEANGWORLD_SEARCH_CONSOLE_SITE_URL;
  if (!siteUrl) throw new Error("Search Console site URL is missing.");
  const ranges = dateRanges(now, reportingDays);
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
  const shaped = error as {
    message?: string;
    response?: ProviderErrorResponse;
  };
  const message = shaped?.message || "Provider request failed.";
  const status = String(
    shaped?.response?.status || message.match(/\((\d{3})\)/)?.[1] || ""
  );
  const retryable = status
    ? [429, 500, 502, 503, 504].includes(Number(status))
    : true;
  return {
    code: status ? `provider_http_${status}` : "provider_unavailable",
    message:
      status === "401" || status === "403"
        ? "Google rejected the configured service-account access."
        : "The provider could not be synchronized safely.",
    retryable,
  };
}

function providerOperationalDiagnostic(error: unknown) {
  const shaped = error as {
    name?: string;
    message?: string;
    code?: string | number;
    response?: ProviderErrorResponse;
  };
  const providerError = shaped?.response?.data?.error;
  const clean = (value: unknown) =>
    typeof value === "string"
      ? value
          .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
          .replace(
            /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
            "[redacted-jwt]"
          )
          .slice(0, 600)
      : undefined;
  return {
    name: clean(shaped?.name),
    message: clean(shaped?.message),
    code:
      typeof shaped?.code === "string" || typeof shaped?.code === "number"
        ? String(shaped.code)
        : undefined,
    httpStatus: shaped?.response?.status,
    providerCode:
      typeof providerError === "string"
        ? clean(providerError)
        : providerError?.code || providerError?.status,
    providerMessage:
      typeof providerError === "object" && providerError
        ? clean(providerError.message)
        : clean(shaped?.response?.data?.error_description),
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
  console.error(
    `[seangworld-intelligence] ${id} synchronization failed`,
    providerOperationalDiagnostic(error)
  );
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

function cacheKey(environment: ServerEnvironment, reportingDays: number) {
  return [
    environment.BEAST_ECOSYSTEM_GA4_PROPERTY_ID || "",
    environment.SEANGWORLD_SEARCH_CONSOLE_SITE_URL || "",
    environment.GOOGLE_WIF_PROVIDER_RESOURCE || "",
    environment.GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL || "",
    String(reportingDays),
  ].join("|");
}

type AccessTokenLoader = (
  environment: ServerEnvironment
) => Promise<string>;

export async function loadLiveSeangworldProviders(
  environment: ServerEnvironment,
  now = new Date(),
  fetchImplementation: FetchImplementation = fetch,
  accessTokenLoader: AccessTokenLoader = getGoogleAccessToken,
  reportingDays = 30
) {
  if (![7, 30, 90].includes(reportingDays)) {
    throw new Error("Unsupported analytics reporting range.");
  }
  const configuredGa4 = Boolean(
    environment.BEAST_ECOSYSTEM_GA4_PROPERTY_ID &&
      environment.GOOGLE_WIF_PROVIDER_RESOURCE &&
      environment.GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL
  );
  const configuredSearchConsole = Boolean(
    environment.SEANGWORLD_SEARCH_CONSOLE_SITE_URL &&
      environment.GOOGLE_WIF_PROVIDER_RESOURCE &&
      environment.GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL
  );
  if (!configuredGa4 && !configuredSearchConsole) return null;
  const key = cacheKey(environment, reportingDays);
  if (cachedProviders && cachedProviders.expiresAt > now.getTime() && cachedProviders.cacheKey === key) {
    return cachedProviders.providers;
  }
  if (inFlightProviders?.cacheKey === key) return inFlightProviders.promise;
  const synchronizedAt = now.toISOString();
  const providerRequest = (async () => {
    let accessToken: string;
    try {
      accessToken = await accessTokenLoader(environment);
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
        ? loadGa4Data(
            environment,
            accessToken,
            now,
            fetchImplementation,
            reportingDays
          )
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
            fetchImplementation,
            reportingDays
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
  inFlightProviders = { cacheKey: key, promise: providerRequest };
  try {
    const providers = await providerRequest;
    cachedProviders = {
      cacheKey: key,
      expiresAt: now.getTime() + CACHE_TTL_MS,
      providers,
    };
    return providers;
  } finally {
    if (inFlightProviders?.promise === providerRequest) {
      inFlightProviders = null;
    }
  }
}
