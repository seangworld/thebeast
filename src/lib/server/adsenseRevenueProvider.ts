import {
  projectMonthlyRevenue,
  sanitizeReportingPage,
  type RevenueMetricSet,
  type RevenuePeriod,
  type RevenueSnapshot,
} from "../revenueCenter";

type FetchLike = typeof fetch;
type ReportCell = { value?: string };
type ReportResult = {
  headers?: Array<{ name?: string }>;
  rows?: Array<{ cells?: ReportCell[] }>;
  totals?: { cells?: ReportCell[] };
  currencyCode?: string;
};

const metricNames = [
  "ESTIMATED_EARNINGS",
  "PAGE_VIEWS",
  "IMPRESSIONS",
  "CLICKS",
  "PAGE_VIEWS_CTR",
  "PAGE_VIEWS_RPM",
] as const;

function numberValue(value: string | undefined) {
  if (value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function reportMetrics(report: ReportResult): RevenueMetricSet | null {
  const headers = report.headers || [];
  const cells = report.totals?.cells || [];
  if (!headers.length || !cells.length) return null;
  const values = Object.fromEntries(
    headers.map((header, index) => [
      header.name || "",
      numberValue(cells[index]?.value),
    ])
  );
  return {
    estimatedEarnings: values.ESTIMATED_EARNINGS ?? null,
    pageViews: values.PAGE_VIEWS ?? null,
    impressions: values.IMPRESSIONS ?? null,
    clicks: values.CLICKS ?? null,
    ctr: values.PAGE_VIEWS_CTR ?? null,
    rpm: values.PAGE_VIEWS_RPM ?? null,
    currency: report.currencyCode || null,
  };
}

function reportRows(report: ReportResult, dimension: string) {
  const headers = report.headers || [];
  const dimensionIndex = headers.findIndex((header) => header.name === dimension);
  const earningsIndex = headers.findIndex(
    (header) => header.name === "ESTIMATED_EARNINGS"
  );
  if (dimensionIndex < 0) return [];
  return (report.rows || []).flatMap((row) => {
    const label = row.cells?.[dimensionIndex]?.value;
    return label
      ? [
          {
            label,
            estimatedEarnings:
              earningsIndex < 0
                ? null
                : numberValue(row.cells?.[earningsIndex]?.value),
          },
        ]
      : [];
  });
}

async function accessToken(env: NodeJS.ProcessEnv, fetchImpl: FetchLike) {
  const response = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_ADSENSE_CLIENT_ID || "",
      client_secret: env.GOOGLE_ADSENSE_CLIENT_SECRET || "",
      refresh_token: env.GOOGLE_ADSENSE_REFRESH_TOKEN || "",
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("oauth");
  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) throw new Error("oauth");
  return payload.access_token;
}

async function report({
  env,
  fetchImpl,
  token,
  dateRange,
  dimensions = [],
  limit,
  customStartDate,
  customEndDate,
}: {
  env: NodeJS.ProcessEnv;
  fetchImpl: FetchLike;
  token: string;
  dateRange: string;
  dimensions?: string[];
  limit?: number;
  customStartDate?: string;
  customEndDate?: string;
}) {
  const rawAccount = env.GOOGLE_ADSENSE_ACCOUNT_ID || "";
  const account = rawAccount.startsWith("accounts/")
    ? rawAccount
    : `accounts/${rawAccount}`;
  const params = new URLSearchParams({ dateRange });
  const appendDate = (prefix: string, value?: string) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    const [year, month, day] = value.split("-");
    params.set(`${prefix}.year`, year);
    params.set(`${prefix}.month`, String(Number(month)));
    params.set(`${prefix}.day`, String(Number(day)));
  };
  appendDate("startDate", customStartDate);
  appendDate("endDate", customEndDate);
  metricNames.forEach((metric) => params.append("metrics", metric));
  dimensions.forEach((dimension) => params.append("dimensions", dimension));
  if (limit) params.set("limit", String(limit));
  const response = await fetchImpl(
    `https://adsense.googleapis.com/v2/${account}/reports:generate?${params}`,
    {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (!response.ok) throw new Error("report");
  return (await response.json()) as ReportResult;
}

function emptySnapshot(
  state: RevenueSnapshot["state"],
  generatedAt: string,
  diagnostic: string
): RevenueSnapshot {
  return {
    provider: "adsense",
    state,
    generatedAt,
    diagnostic,
    periods: {
      today: null,
      yesterday: null,
      last7: null,
      month: null,
      lifetime: null,
    },
    projectedMonthlyRevenue: null,
    topPages: [],
    topProducts: [],
    topPlacements: [],
    history: [],
  };
}

export async function loadAdSenseRevenueSnapshot(
  env: NodeJS.ProcessEnv,
  now = new Date(),
  fetchImpl: FetchLike = fetch
): Promise<RevenueSnapshot> {
  const generatedAt = now.toISOString();
  const required = [
    env.GOOGLE_ADSENSE_CLIENT_ID,
    env.GOOGLE_ADSENSE_CLIENT_SECRET,
    env.GOOGLE_ADSENSE_REFRESH_TOKEN,
    env.GOOGLE_ADSENSE_ACCOUNT_ID,
  ];
  if (required.some((value) => !value)) {
    return emptySnapshot(
      "not_configured",
      generatedAt,
      "AdSense reporting credentials have not been configured for this environment."
    );
  }

  try {
    const token = await accessToken(env, fetchImpl);
    const ranges: Array<[RevenuePeriod, string]> = [
      ["today", "TODAY"],
      ["yesterday", "YESTERDAY"],
      ["last7", "LAST_7_DAYS"],
      ["month", "MONTH_TO_DATE"],
    ];
    const periodReports = await Promise.all(
      ranges.map(
        async ([period, dateRange]) =>
          [
            period,
            await report({ env, fetchImpl, token, dateRange }),
          ] as const
      )
    );
    const [pages, products, placements, history] = await Promise.all([
      report({
        env,
        fetchImpl,
        token,
        dateRange: "LAST_30_DAYS",
        dimensions: ["PAGE_URL"],
        limit: 10,
      }),
      report({
        env,
        fetchImpl,
        token,
        dateRange: "LAST_30_DAYS",
        dimensions: ["OWNED_SITE_DOMAIN_NAME"],
        limit: 10,
      }),
      report({
        env,
        fetchImpl,
        token,
        dateRange: "LAST_30_DAYS",
        dimensions: ["AD_UNIT_NAME"],
        limit: 10,
      }),
      report({
        env,
        fetchImpl,
        token,
        dateRange: "LAST_30_DAYS",
        dimensions: ["DATE"],
      }),
    ]);
    const periods = Object.fromEntries(
      periodReports.map(([period, result]) => [period, reportMetrics(result)])
    ) as Record<RevenuePeriod, RevenueMetricSet | null>;
    periods.lifetime = null;

    if (env.GOOGLE_ADSENSE_REPORTING_START_DATE) {
      const lifetime = await report({
        env,
        fetchImpl,
        token,
        dateRange: "CUSTOM",
        customStartDate: env.GOOGLE_ADSENSE_REPORTING_START_DATE,
        customEndDate: generatedAt.slice(0, 10),
      });
      periods.lifetime = reportMetrics(lifetime);
    }
    const anyData = Object.values(periods).some(Boolean);
    return {
      provider: "adsense",
      state: anyData ? "available" : "no_data",
      generatedAt,
      diagnostic: anyData
        ? "Aggregate AdSense reporting is connected. Current-period earnings remain estimated until Google finalizes them."
        : "AdSense reporting is connected, but no aggregate rows were returned.",
      periods,
      projectedMonthlyRevenue: projectMonthlyRevenue(
        periods.month?.estimatedEarnings ?? null,
        now
      ),
      topPages: reportRows(pages, "PAGE_URL").map((entry) => ({
        ...entry,
        label: sanitizeReportingPage(entry.label),
      })),
      topProducts: reportRows(products, "OWNED_SITE_DOMAIN_NAME"),
      topPlacements: reportRows(placements, "AD_UNIT_NAME"),
      history: reportRows(history, "DATE").map((entry) => ({
        date: entry.label,
        estimatedEarnings: entry.estimatedEarnings,
      })),
    };
  } catch {
    return emptySnapshot(
      "failed",
      generatedAt,
      "AdSense reporting could not be retrieved. Verify the owner-approved account, OAuth access, and environment configuration."
    );
  }
}
