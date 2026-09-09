export type NewsOperationsStatus = {
  product: "seangworld_news";
  editorialPromise: string;
  coverage: {
    confirmedSources: number;
    globalDesks: number;
    countries: number;
    states: number;
    regions: number;
    cities: number;
  };
  sourceHealth: Record<string, number>;
  newsroom: {
    version: string;
    mode: string;
    editorialPromise: string;
    staffCount: number;
    desks: string[];
  };
  factDesk: {
    providerConfigured: boolean;
    publicReadConfigured: boolean;
    persistenceConfigured: boolean;
    candidateGenerationConfigured: boolean;
    publicPublishingEnabled: boolean;
    readiness: {
      status: "ready" | "blocked";
      readyThrough: string;
      blockers: string[];
      publicationEnabled: boolean;
    };
  };
  publicAutoPublishing: boolean;
  generatedAt: string;
  factDeskOperational?: {
    status: "healthy" | "degraded" | "stale" | "running" | "unknown";
    lastCompletedAt: string | null;
    explanation: string;
  };
};

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const strings = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string");

function isBoundedNewsStatus(value: unknown): value is NewsOperationsStatus {
  const record = object(value);
  const coverage = object(record?.coverage);
  const health = object(record?.sourceHealth);
  const fact = object(record?.factDesk);
  const readiness = object(fact?.readiness);
  const newsroom = object(record?.newsroom);
  return Boolean(record && coverage && health && fact && readiness && newsroom
    && record.product === "seangworld_news" && typeof record.editorialPromise === "string"
    && typeof record.generatedAt === "string" && Number.isFinite(Date.parse(record.generatedAt))
    && ["confirmedSources", "globalDesks", "countries", "states", "regions", "cities"].every((key) => count(coverage[key]))
    && Object.values(health).every(count)
    && ["providerConfigured", "publicReadConfigured", "persistenceConfigured", "candidateGenerationConfigured", "publicPublishingEnabled"].every((key) => typeof fact[key] === "boolean")
    && typeof readiness.status === "string" && ["ready", "blocked"].includes(readiness.status) && typeof readiness.readyThrough === "string"
    && strings(readiness.blockers) && typeof readiness.publicationEnabled === "boolean"
    && count(newsroom.staffCount) && ["version", "mode", "editorialPromise"].every((key) => typeof newsroom[key] === "string")
    && strings(newsroom.desks) && typeof record.publicAutoPublishing === "boolean");
}

/** Read-only evidence assessment; never used to trigger workers or change gates. */
export function assessNewsFactDesk(value: unknown, generatedAt: string, now = new Date()): NonNullable<NewsOperationsStatus["factDeskOperational"]> {
  const unknown = { status: "unknown" as const, lastCompletedAt: null, explanation: "Recent valid Fact Desk worker evidence is unavailable; configuration readiness does not establish operating health." };
  const snapshotAt = Date.parse(generatedAt);
  const nowMs = now.getTime();
  if (!Number.isFinite(snapshotAt) || !Number.isFinite(nowMs) || snapshotAt > nowMs || nowMs - snapshotAt > 60 * 60_000) return unknown;
  const workers = object(value)?.workers;
  if (!Array.isArray(workers)) return unknown;
  const matches = workers.filter((item) => object(item)?.workerKey === "fact-desk");
  if (matches.length !== 1) return unknown;
  const heartbeat = object(object(matches[0])?.heartbeat);
  if (!heartbeat || heartbeat.workerKey !== "fact-desk") return unknown;
  const started = typeof heartbeat.lastStartedAt === "string" ? Date.parse(heartbeat.lastStartedAt) : NaN;
  const completed = typeof heartbeat.lastCompletedAt === "string" ? Date.parse(heartbeat.lastCompletedAt) : NaN;
  if (!Number.isFinite(started) || !Number.isFinite(completed) || started > snapshotAt || completed > snapshotAt) return unknown;
  const lastCompletedAt = new Date(completed).toISOString();
  const deferrals = object(heartbeat.summary)?.providerDeferrals;
  const priorLimit = heartbeat.status === "degraded" && Array.isArray(deferrals)
    && deferrals.some((item) => object(item)?.providerLimitKind === "persistent-account-limit");
  const note = priorLimit ? " Latest recorded completed attempt reported a provider account limit; the current account condition is unverified." : "";
  // Three missed 15-minute cadences indicate stale observation, not permission to retry.
  if (nowMs - Math.max(started, completed) > 45 * 60_000) return { status: "stale", lastCompletedAt, explanation: `No recent Fact Desk worker heartbeat. Last completion: ${lastCompletedAt}.${note}` };
  if (started > completed) return { status: "running", lastCompletedAt, explanation: `A later attempt started; completion is not yet observed.${note}` };
  if (heartbeat.status === "healthy") return { status: "healthy", lastCompletedAt, explanation: "The latest recorded completed attempt was healthy. This does not prove future availability or publication." };
  if (heartbeat.status === "degraded") return { status: "degraded", lastCompletedAt, explanation: `The latest recorded completed attempt was degraded.${note}` };
  return unknown;
}

export async function fetchNewsOperationsStatus(
  fetchImpl: typeof fetch = fetch,
  now?: Date,
): Promise<NewsOperationsStatus | null> {
  try {
    const response = await fetchImpl("https://news.seangworld.com/api/news/status", {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    if (!isBoundedNewsStatus(payload)) return null;
    return {
      product: payload.product, editorialPromise: payload.editorialPromise,
      coverage: payload.coverage, sourceHealth: payload.sourceHealth, newsroom: payload.newsroom,
      factDesk: payload.factDesk, publicAutoPublishing: payload.publicAutoPublishing, generatedAt: payload.generatedAt,
      factDeskOperational: assessNewsFactDesk(object(payload)?.operations, payload.generatedAt, now ?? new Date()),
    };
  } catch {
    return null;
  }
}
