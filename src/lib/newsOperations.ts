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
};

function isBoundedNewsStatus(value: unknown): value is NewsOperationsStatus {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<NewsOperationsStatus>;
  return record.product === "seangworld_news" &&
    typeof record.generatedAt === "string" &&
    Boolean(record.coverage && typeof record.coverage.confirmedSources === "number") &&
    Boolean(record.factDesk && typeof record.factDesk.providerConfigured === "boolean") &&
    Boolean(record.newsroom && typeof record.newsroom.staffCount === "number") &&
    record.publicAutoPublishing === false;
}

export async function fetchNewsOperationsStatus(
  fetchImpl: typeof fetch = fetch,
): Promise<NewsOperationsStatus | null> {
  try {
    const response = await fetchImpl("https://news.seangworld.com/api/news/status", {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload: unknown = await response.json();
    return isBoundedNewsStatus(payload) ? payload : null;
  } catch {
    return null;
  }
}
