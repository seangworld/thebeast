import type { FirstPartyTelemetrySnapshot } from "./firstPartyTelemetry";

export const seangworldProviderStatuses = [
  "configured",
  "not_configured",
  "unavailable",
  "synchronization_failed",
  "no_data",
] as const;

export type SeangworldProviderStatus =
  (typeof seangworldProviderStatuses)[number];

export const seangworldConnectionStatuses = [
  "connected",
  "not_configured",
  "unavailable",
  "failed",
  "no_data",
] as const;

export type SeangworldConnectionStatus =
  (typeof seangworldConnectionStatuses)[number];

export const seangworldProviderStatusLabels: Record<
  SeangworldProviderStatus,
  string
> = {
  configured: "Configured",
  not_configured: "Not Configured",
  unavailable: "Unavailable",
  synchronization_failed: "Synchronization Failed",
  no_data: "No Data",
};

export type IntelligenceMetric = {
  value: number;
  previousValue: number | null;
};

export type IntelligenceDimension = {
  label: string;
  value: number;
  secondaryValue?: number | null;
};

export type SeangworldAnalyticsData = {
  firstPartyTelemetry: FirstPartyTelemetrySnapshot | null;
  visitors: IntelligenceMetric | null;
  users: IntelligenceMetric | null;
  sessions: IntelligenceMetric | null;
  views: IntelligenceMetric | null;
  engagementRate: IntelligenceMetric | null;
  impressions: IntelligenceMetric | null;
  clicks: IntelligenceMetric | null;
  ctr: IntelligenceMetric | null;
  averagePosition: IntelligenceMetric | null;
  countries: IntelligenceDimension[];
  searchCountries: IntelligenceDimension[];
  cities: IntelligenceDimension[];
  devices: IntelligenceDimension[];
  searchDevices: IntelligenceDimension[];
  browsers: IntelligenceDimension[];
  operatingSystems: IntelligenceDimension[];
  trafficSources: IntelligenceDimension[];
  entryPages: IntelligenceDimension[];
  exitPages: (IntelligenceDimension & { exitRate?: number | null })[];
  topQueries: (IntelligenceDimension & {
    impressions?: number | null;
    clicks?: number | null;
    ctr?: number | null;
    position?: number | null;
    previousImpressions?: number | null;
  })[];
  topLandingPages: IntelligenceDimension[];
  searchTrends: {
    date: string;
    clicks: number;
    impressions: number;
    ctr: number | null;
    position: number | null;
  }[];
  historicalTrends: {
    date: string;
    visitors: number | null;
    sessions: number | null;
    views: number | null;
  }[];
  deviceEngagement: {
    mobileSessions: number;
    desktopSessions: number;
    mobileEngagementRate: number;
    desktopEngagementRate: number;
  } | null;
};

export type SeangworldProviderSnapshot = {
  id: "ga4" | "search_console" | "first_party";
  label: string;
  status: SeangworldProviderStatus;
  connectionStatus: SeangworldConnectionStatus;
  guidance: string;
  lastSynchronizationAt: string | null;
  lastSuccessfulSynchronizationAt: string | null;
  freshness: "current" | "recent" | "stale" | "unknown";
  dataThroughDate: string | null;
  reportingDelayDays: number | null;
  error: {
    code: string;
    message: string;
    retryable: boolean;
  } | null;
  data: Partial<SeangworldAnalyticsData> | null;
};

export type SeangworldRecommendation = {
  id:
    | "high_exit_page"
    | "low_ctr"
    | "falling_ctr"
    | "growing_impressions"
    | "mobile_weakness"
    | "traffic_spike"
    | "low_member_activation"
    | "low_d7_retention"
    | "module_underused"
    | "reliability_failures"
    | "professional_latency";
  title: string;
  supportingMetric: string;
  comparisonPeriod: string;
  confidence: "high" | "moderate";
  rationale: string;
  suggestedOwnerReview: string;
};

export type SeangworldIntelligenceSnapshot = {
  generatedAt: string;
  comparisonPeriod: string;
  providers: SeangworldProviderSnapshot[];
  data: SeangworldAnalyticsData;
  recommendations: SeangworldRecommendation[];
  limitations: string[];
};

const emptyData = (): SeangworldAnalyticsData => ({
  firstPartyTelemetry: null,
  visitors: null,
  users: null,
  sessions: null,
  views: null,
  engagementRate: null,
  impressions: null,
  clicks: null,
  ctr: null,
  averagePosition: null,
  countries: [],
  searchCountries: [],
  cities: [],
  devices: [],
  searchDevices: [],
  browsers: [],
  operatingSystems: [],
  trafficSources: [],
  entryPages: [],
  exitPages: [],
  topQueries: [],
  topLandingPages: [],
  searchTrends: [],
  historicalTrends: [],
  deviceEngagement: null,
});

function metricChange(metric: IntelligenceMetric) {
  if (metric.previousValue === null || metric.previousValue === 0) return null;
  return (metric.value - metric.previousValue) / metric.previousValue;
}

export function buildSeangworldRecommendations(
  data: SeangworldAnalyticsData,
  comparisonPeriod: string
): SeangworldRecommendation[] {
  const recommendations: SeangworldRecommendation[] = [];
  const highExit = data.exitPages
    .filter((page) => (page.exitRate || 0) >= 0.6 && page.value >= 50)
    .sort((a, b) => (b.exitRate || 0) - (a.exitRate || 0))[0];
  if (highExit?.exitRate) {
    recommendations.push({
      id: "high_exit_page",
      title: "Review a frequent exit page",
      supportingMetric: `${highExit.label}: ${Math.round(highExit.exitRate * 100)}% exit rate across ${highExit.value} exits`,
      comparisonPeriod,
      confidence: "high",
      rationale: "The recorded exit rate is at least 60% and the page has at least 50 exits.",
      suggestedOwnerReview: "Confirm the page's intended next action and inspect device-specific continuation before changing it.",
    });
  }

  const lowCtr = data.topQueries
    .filter((query) => (query.impressions || 0) >= 1000 && query.ctr !== null && query.ctr !== undefined && query.ctr < 0.02)
    .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))[0];
  if (lowCtr?.ctr !== null && lowCtr?.ctr !== undefined) {
    recommendations.push({
      id: "low_ctr",
      title: "Review a high-impression, low-CTR query",
      supportingMetric: `${lowCtr.label}: ${(lowCtr.impressions || 0).toLocaleString()} impressions and ${(lowCtr.ctr * 100).toFixed(1)}% CTR`,
      comparisonPeriod,
      confidence: "high",
      rationale: "The query has at least 1,000 impressions and a recorded CTR below 2%.",
      suggestedOwnerReview: "Compare the landing page title and description with the query intent before editing search presentation.",
    });
  }

  if (
    data.ctr?.previousValue !== null &&
    data.ctr &&
    data.ctr.previousValue > 0 &&
    data.ctr.value <= data.ctr.previousValue * 0.8 &&
    (data.impressions?.value || 0) >= 1000
  ) {
    const decline =
      (1 - data.ctr.value / data.ctr.previousValue) * 100;
    recommendations.push({
      id: "falling_ctr",
      title: "Review falling search click-through rate",
      supportingMetric: `${(data.ctr.value * 100).toFixed(1)}% CTR, down ${Math.round(decline)}% with ${(data.impressions?.value || 0).toLocaleString()} impressions`,
      comparisonPeriod,
      confidence: "high",
      rationale:
        "Recorded CTR declined by at least 20% while the current period retained at least 1,000 impressions.",
      suggestedOwnerReview:
        "Compare affected queries and landing-page snippets before changing search presentation.",
    });
  }

  const growingQuery = data.topQueries
    .filter((query) => (query.previousImpressions || 0) > 0 && (query.impressions || 0) >= (query.previousImpressions || 0) * 1.25)
    .sort((a, b) => (b.impressions || 0) - (a.impressions || 0))[0];
  if (growingQuery) {
    const growth = ((growingQuery.impressions || 0) / (growingQuery.previousImpressions || 1) - 1) * 100;
    recommendations.push({
      id: "growing_impressions",
      title: "Review a query with growing visibility",
      supportingMetric: `${growingQuery.label}: ${Math.round(growth)}% impression growth`,
      comparisonPeriod,
      confidence: "high",
      rationale: "Recorded impressions increased by at least 25% from the comparison period.",
      suggestedOwnerReview: "Verify the associated landing page remains accurate and provides a clear continuation path.",
    });
  }

  const device = data.deviceEngagement;
  if (device) {
    const total = device.mobileSessions + device.desktopSessions;
    const mobileShare = total ? device.mobileSessions / total : 0;
    if (
      total >= 100 &&
      mobileShare >= 0.4 &&
      device.mobileEngagementRate <= device.desktopEngagementRate - 0.15
    ) {
      recommendations.push({
        id: "mobile_weakness",
        title: "Review mobile engagement",
        supportingMetric: `${Math.round(mobileShare * 100)}% mobile session share; ${Math.round(device.mobileEngagementRate * 100)}% mobile vs ${Math.round(device.desktopEngagementRate * 100)}% desktop engagement`,
        comparisonPeriod,
        confidence: "high",
        rationale: "Mobile represents at least 40% of recorded sessions and engagement trails desktop by at least 15 percentage points.",
        suggestedOwnerReview: "Inspect the highest-traffic mobile entry pages for usability or continuation friction.",
      });
    }
  }

  if (data.sessions) {
    const change = metricChange(data.sessions);
    if (
      change !== null &&
      data.sessions.previousValue !== null &&
      data.sessions.previousValue >= 100 &&
      change >= 0.5
    ) {
      recommendations.push({
        id: "traffic_spike",
        title: "Review a recorded traffic spike",
        supportingMetric: `${data.sessions.value.toLocaleString()} sessions, up ${Math.round(change * 100)}%`,
        comparisonPeriod,
        confidence: "high",
        rationale: "Recorded sessions increased by at least 50% from a comparison baseline of 100 or more.",
        suggestedOwnerReview: "Identify the contributing sources and landing pages, then verify engagement quality before acting.",
      });
    }
  }

  const firstParty = data.firstPartyTelemetry;
  if (firstParty) {
    if (
      firstParty.members.onboardingCompleted >= firstParty.minimumCohortSize &&
      firstParty.members.activationRate !== null &&
      firstParty.members.activationRate < 0.5
    ) {
      recommendations.push({
        id: "low_member_activation",
        title: "Review member activation friction",
        supportingMetric: `${firstParty.members.activated} of ${firstParty.members.onboardingCompleted} onboarding-complete members activated`,
        comparisonPeriod,
        confidence: "high",
        rationale: `The verified activation rate is below 50% and the cohort meets the ${firstParty.minimumCohortSize}-member minimum.`,
        suggestedOwnerReview: "Review the first meaningful-action paths without inspecting individual member activity.",
      });
    }
    const daySeven = firstParty.retention.find((item) => item.day === 7);
    if (
      daySeven?.status === "available" &&
      daySeven.rate !== null &&
      daySeven.rate < 0.25
    ) {
      recommendations.push({
        id: "low_d7_retention",
        title: "Review Day 7 member retention",
        supportingMetric: `${daySeven.returnedMembers} of ${daySeven.eligibleMembers} eligible activated members returned on Day 7`,
        comparisonPeriod,
        confidence: "high",
        rationale: "The verified Day 7 retention rate is below 25% and the minimum cohort threshold is met.",
        suggestedOwnerReview: "Review aggregate post-activation value and reminders before changing a product flow.",
      });
    }
    const underused = firstParty.moduleAdoption.find(
      (module) =>
        firstParty.members.activated >= firstParty.minimumCohortSize &&
        module.adoptionRate !== null &&
        module.adoptionRate < 0.1
    );
    if (underused) {
      recommendations.push({
        id: "module_underused",
        title: `Review ${underused.moduleLabel} adoption`,
        supportingMetric: `${underused.activatedMembers} activated members and ${underused.meaningfulActions} meaningful actions`,
        comparisonPeriod,
        confidence: "moderate",
        rationale: "Verified module adoption is below 10% and the activated-member cohort meets the minimum threshold.",
        suggestedOwnerReview: "Confirm the module is released and relevant to the cohort before changing discovery or onboarding.",
      });
    }
    const reliabilityTotal =
      firstParty.reliability.successfulOperations +
      firstParty.reliability.failures;
    if (
      reliabilityTotal >= 10 &&
      firstParty.reliability.failureRate !== null &&
      firstParty.reliability.failureRate >= 0.1
    ) {
      recommendations.push({
        id: "reliability_failures",
        title: "Review repeated operational failures",
        supportingMetric: `${firstParty.reliability.failures} failures across ${reliabilityTotal} bounded operations`,
        comparisonPeriod,
        confidence: "high",
        rationale: "The verified failure rate is at least 10% across at least 10 recorded operations.",
        suggestedOwnerReview: "Inspect safe error categories and provider health without opening member content.",
      });
    }
    const slowProfessional = firstParty.professionalUsage.find(
      (professional) =>
        professional.turnsCompleted >= 10 &&
        professional.p95LatencyMs !== null &&
        professional.p95LatencyMs > 10_000
    );
    if (slowProfessional) {
      recommendations.push({
        id: "professional_latency",
        title: "Review Digital Professional latency",
        supportingMetric: `${slowProfessional.professionalId.replaceAll("_", " ")}: ${slowProfessional.p95LatencyMs} ms P95 across ${slowProfessional.turnsCompleted} completed turns`,
        comparisonPeriod,
        confidence: "high",
        rationale: "P95 latency exceeds 10 seconds across at least 10 completed turns.",
        suggestedOwnerReview: "Compare provider and persistence latency bands before changing model routing.",
      });
    }
  }
  return recommendations;
}

function mergeData(providers: readonly SeangworldProviderSnapshot[]) {
  const result = emptyData();
  for (const provider of providers) {
    if (!provider.data) continue;
    for (const [key, value] of Object.entries(provider.data)) {
      if (value === undefined || value === null) continue;
      const typedKey = key as keyof SeangworldAnalyticsData;
      if (Array.isArray(value)) {
        (result as unknown as Record<string, unknown>)[typedKey] = value;
      } else {
        (result as unknown as Record<string, unknown>)[typedKey] = value;
      }
    }
  }
  return result;
}

export function buildSeangworldIntelligenceSnapshot(input: {
  providers: SeangworldProviderSnapshot[];
  generatedAt: string;
  comparisonPeriod?: string;
}): SeangworldIntelligenceSnapshot {
  const comparisonPeriod = input.comparisonPeriod || "Current 30 days compared with previous 30 days";
  const data = mergeData(input.providers);
  const providersWithData = input.providers.filter((provider) => provider.data);
  return {
    generatedAt: input.generatedAt,
    comparisonPeriod,
    providers: input.providers,
    data,
    recommendations: buildSeangworldRecommendations(data, comparisonPeriod),
    limitations: [
      ...(providersWithData.length ? [] : ["No provider returned verified analytics data."]),
      ...input.providers
        .filter((provider) => provider.status !== "configured")
        .map((provider) => `${provider.label}: ${provider.guidance}`),
    ],
  };
}

function parseProviderData(value: string | undefined) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<SeangworldAnalyticsData>;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function providerStatus(value: string | undefined): SeangworldProviderStatus | null {
  return seangworldProviderStatuses.includes(value as SeangworldProviderStatus)
    ? (value as SeangworldProviderStatus)
    : null;
}

function freshness(lastSuccessful: string | null, now: string) {
  if (!lastSuccessful || Number.isNaN(Date.parse(lastSuccessful))) return "unknown" as const;
  const ageHours = Math.max(0, Date.parse(now) - Date.parse(lastSuccessful)) / 3_600_000;
  return ageHours <= 24 ? "current" as const : ageHours <= 72 ? "recent" as const : "stale" as const;
}

export function buildServerSeangworldProviders(
  environment: Readonly<Record<string, string | undefined>>,
  now = new Date().toISOString()
): SeangworldProviderSnapshot[] {
  const definitions = [
    {
      id: "ga4" as const,
      label: "Google Analytics 4",
      configured: Boolean(environment.BEAST_ECOSYSTEM_GA4_PROPERTY_ID && environment.GOOGLE_WIF_PROVIDER_RESOURCE && environment.GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL),
      status: environment.SEANGWORLD_GA4_STATUS,
      data: environment.SEANGWORLD_GA4_SNAPSHOT_JSON,
      synchronized: environment.SEANGWORLD_GA4_LAST_SYNCHRONIZATION_AT,
      successful: environment.SEANGWORLD_GA4_LAST_SUCCESSFUL_SYNCHRONIZATION_AT,
    },
    {
      id: "search_console" as const,
      label: "Google Search Console",
      configured: Boolean(environment.SEANGWORLD_SEARCH_CONSOLE_SITE_URL && environment.GOOGLE_WIF_PROVIDER_RESOURCE && environment.GOOGLE_GA4_READER_SERVICE_ACCOUNT_EMAIL),
      status: environment.SEANGWORLD_SEARCH_CONSOLE_STATUS,
      data: environment.SEANGWORLD_SEARCH_CONSOLE_SNAPSHOT_JSON,
      synchronized: environment.SEANGWORLD_SEARCH_CONSOLE_LAST_SYNCHRONIZATION_AT,
      successful: environment.SEANGWORLD_SEARCH_CONSOLE_LAST_SUCCESSFUL_SYNCHRONIZATION_AT,
    },
    {
      id: "first_party" as const,
      label: "First-party ecosystem telemetry",
      configured: environment.SEANGWORLD_FIRST_PARTY_ANALYTICS_ENABLED === "true",
      status: environment.SEANGWORLD_FIRST_PARTY_STATUS,
      data: environment.SEANGWORLD_FIRST_PARTY_SNAPSHOT_JSON,
      synchronized: environment.SEANGWORLD_FIRST_PARTY_LAST_SYNCHRONIZATION_AT,
      successful: environment.SEANGWORLD_FIRST_PARTY_LAST_SUCCESSFUL_SYNCHRONIZATION_AT,
    },
  ];

  return definitions.map((definition) => {
    const data = parseProviderData(definition.data);
    const explicitStatus = providerStatus(definition.status);
    const status = !definition.configured
      ? "not_configured"
      : explicitStatus || (data ? "configured" : "configured");
    const guidance = status === "not_configured"
      ? `Configure ${definition.label} server credentials to begin synchronization.`
      : status === "synchronization_failed"
        ? "Review the most recent server-side synchronization error and credentials."
        : status === "unavailable"
          ? "The provider is configured but cannot currently be reached."
          : status === "no_data"
            ? "The provider is configured and synchronized, but returned no records for this period."
            : data
              ? "Verified provider data is available."
              : "Configuration is present. Run the server-side synchronization before metrics can appear.";
    return {
      id: definition.id,
      label: definition.label,
      status,
      connectionStatus:
        status === "configured"
          ? "connected"
          : status === "synchronization_failed"
            ? "failed"
            : status,
      guidance,
      lastSynchronizationAt: definition.synchronized || null,
      lastSuccessfulSynchronizationAt: definition.successful || null,
      freshness: freshness(definition.successful || null, now),
      dataThroughDate: null,
      reportingDelayDays: null,
      error:
        status === "synchronization_failed" || status === "unavailable"
          ? {
              code: `provider_${status}`,
              message: guidance,
              retryable: status === "unavailable",
            }
          : null,
      data,
    };
  });
}

export function normalizeSeangworldIntelligenceSnapshot(
  value: unknown
): SeangworldIntelligenceSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Partial<SeangworldIntelligenceSnapshot>;
  if (
    typeof snapshot.generatedAt !== "string" ||
    Number.isNaN(Date.parse(snapshot.generatedAt)) ||
    typeof snapshot.comparisonPeriod !== "string" ||
    !Array.isArray(snapshot.providers) ||
    !snapshot.data ||
    typeof snapshot.data !== "object" ||
    !Array.isArray(snapshot.recommendations) ||
    !Array.isArray(snapshot.limitations)
  ) {
    return null;
  }
  if (
    !snapshot.providers.every(
      (provider) =>
        provider &&
        typeof provider.id === "string" &&
        typeof provider.label === "string" &&
        seangworldProviderStatuses.includes(provider.status) &&
        seangworldConnectionStatuses.includes(provider.connectionStatus) &&
        typeof provider.guidance === "string"
    )
  ) {
    return null;
  }
  if (
    !snapshot.recommendations.every(
      (recommendation) =>
        recommendation &&
        typeof recommendation.title === "string" &&
        typeof recommendation.supportingMetric === "string" &&
        typeof recommendation.rationale === "string" &&
        typeof recommendation.suggestedOwnerReview === "string"
    )
  ) {
    return null;
  }
  return {
    ...(snapshot as SeangworldIntelligenceSnapshot),
    data: {
      ...emptyData(),
      ...(snapshot.data as Partial<SeangworldAnalyticsData>),
    },
    providers: snapshot.providers.map((provider) => ({
      ...provider,
      dataThroughDate: provider.dataThroughDate ?? null,
      reportingDelayDays: provider.reportingDelayDays ?? null,
    })),
  };
}
