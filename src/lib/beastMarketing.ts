export const BEAST_MARKETING_VERSION = "0.6.0";

export const marketingCampaignStatuses = [
  "draft",
  "review",
  "approved",
  "scheduled",
  "active",
  "paused",
  "completed",
  "archived",
] as const;

export const marketingAssetStatuses = [
  "draft",
  "review",
  "approved",
  "rejected",
  "archived",
] as const;

export const marketingOutcomeMetrics = [
  "visits",
  "downloads",
  "registrations",
  "activations",
  "retained_users",
] as const;

export type MarketingCampaignStatus = (typeof marketingCampaignStatuses)[number];
export type MarketingAssetStatus = (typeof marketingAssetStatuses)[number];
export type MarketingOutcomeMetric = (typeof marketingOutcomeMetrics)[number];
export type MarketingRecommendationDecision = "continue" | "modify" | "stop";

export type MarketingSourceFact = {
  label: string;
  url: string | null;
  observedAt: string | null;
  limitation: string | null;
};

export type MarketingCampaign = {
  id: string;
  title: string;
  objective: string;
  audience: string;
  offer: string;
  channels: string[];
  callToAction: string;
  sourceFacts: MarketingSourceFact[];
  successMeasures: string[];
  limitations: string[];
  status: MarketingCampaignStatus;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MarketingAsset = {
  id: string;
  campaignId: string;
  name: string;
  assetType: string;
  channel: string;
  body: string;
  sourceFacts: MarketingSourceFact[];
  status: MarketingAssetStatus;
  createdAt: string;
  updatedAt: string;
};

export type MarketingOutcome = {
  id: string;
  campaignId: string;
  metric: MarketingOutcomeMetric;
  value: number;
  measuredAt: string;
  sourceLabel: string;
  sourceUrl: string | null;
  notes: string;
};

export type MarketingRecommendation = {
  decision: MarketingRecommendationDecision;
  confidence: "low" | "moderate" | "high";
  rationale: string[];
  evidence: string[];
  limitations: string[];
};

export function isMarketingCampaignStatus(value: unknown): value is MarketingCampaignStatus {
  return marketingCampaignStatuses.includes(value as MarketingCampaignStatus);
}

export function isMarketingAssetStatus(value: unknown): value is MarketingAssetStatus {
  return marketingAssetStatuses.includes(value as MarketingAssetStatus);
}

export function isMarketingOutcomeMetric(value: unknown): value is MarketingOutcomeMetric {
  return marketingOutcomeMetrics.includes(value as MarketingOutcomeMetric);
}

function text(value: unknown, maximum = 4_000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function normalizeMarketingList(value: unknown, limit = 20) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => text(item, 240))
    .filter(Boolean)
    .slice(0, limit);
}

export function normalizeMarketingSourceFacts(value: unknown): MarketingSourceFact[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const label = text(record.label, 240);
    if (!label) return [];
    const candidateUrl = text(record.url, 1_000);
    const url = /^https:\/\//i.test(candidateUrl) ? candidateUrl : null;
    const observedAt = text(record.observedAt, 80);
    return [{
      label,
      url,
      observedAt: observedAt && Number.isFinite(Date.parse(observedAt)) ? observedAt : null,
      limitation: text(record.limitation, 500) || null,
    }];
  }).slice(0, 30);
}

export function validateCampaignDraft(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const title = text(record.title, 160);
  const objective = text(record.objective, 1_000);
  const audience = text(record.audience, 500);
  const offer = text(record.offer, 500);
  const callToAction = text(record.callToAction, 500);
  const sourceFacts = normalizeMarketingSourceFacts(record.sourceFacts);
  if (!title || !objective || !audience || !offer || !callToAction || !sourceFacts.length) return null;
  return {
    title,
    objective,
    audience,
    offer,
    callToAction,
    channels: normalizeMarketingList(record.channels, 12),
    sourceFacts,
    successMeasures: normalizeMarketingList(record.successMeasures),
    limitations: normalizeMarketingList(record.limitations),
  };
}

/** Missing input is not a measured zero. Numeric strings support existing form/API callers. */
export function parseMarketingOutcomeValue(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function validOutcomeTimestamp(value: unknown, now: Date): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  const instant = Date.parse(value);
  const day = value.slice(0, 10);
  return Number.isFinite(instant) && instant <= now.getTime()
    && new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day;
}

export function validateMarketingOutcomeDraft(input: unknown, now = new Date()) {
  if (!input || typeof input !== "object" || !Number.isFinite(now.getTime())) return null;
  const row = input as Record<string, unknown>;
  const value = parseMarketingOutcomeValue(row.value);
  const sourceLabel = text(row.sourceLabel, 240);
  const measuredAt = row.measuredAt === undefined ? now.toISOString() : row.measuredAt;
  if (!isMarketingOutcomeMetric(row.metric) || value === null || !sourceLabel || !validOutcomeTimestamp(measuredAt, now)) return null;
  return { metric: row.metric, value, sourceLabel, measuredAt };
}

export function buildMarketingRecommendation({
  campaign,
  outcomes,
  approvedAssetCount,
  now = new Date(),
}: {
  campaign: Pick<MarketingCampaign, "status" | "sourceFacts" | "limitations">;
  outcomes: Pick<MarketingOutcome, "metric" | "value" | "sourceLabel" | "measuredAt">[];
  approvedAssetCount: number;
  now?: Date;
}): MarketingRecommendation {
  const valid = outcomes.filter((outcome) => outcome.measuredAt !== undefined && validateMarketingOutcomeDraft(outcome, now));
  const evidence = Array.from(new Set(valid.map((outcome) => `${outcome.sourceLabel}: ${outcome.metric} ${outcome.value} (measured ${outcome.measuredAt})`)));
  const limitations = [...campaign.limitations, "Recorded observations may overlap and are not summed. Attribution and comparable reporting windows are not established; these records do not prove causal lift or authorize increased distribution.", "Historical observations do not establish current performance. Repeated records do not increase confidence."];
  if (valid.length !== outcomes.length) limitations.push("Invalid, undated or future observations were excluded; excluded evidence is not zero.");

  if (!valid.length) {
    return {
      decision: "modify",
      confidence: "low",
      rationale: ["Performance evidence is unavailable, so continuation or cancellation cannot be supported yet.", "Define a bounded approved test and record at least one useful outcome before judging the campaign."],
      evidence: campaign.sourceFacts.map((fact) => fact.label),
      limitations: [...limitations, "No performance outcome with valid measurement evidence is available."],
    };
  }

  const downstream = valid.filter((outcome) => outcome.metric !== "visits");
  if (!downstream.length) {
    return { decision: "modify", confidence: "low", rationale: ["Downstream results have not been measured in the available evidence; they are unknown, not zero.", "Complete downstream measurement before judging the offer, creative or campaign."], evidence, limitations };
  }
  if (downstream.some((outcome) => outcome.value > 0) && approvedAssetCount > 0) {
    return {
      decision: "continue",
      confidence: "low",
      rationale: ["Recorded evidence includes a positive downstream observation and an approved asset.", "Consider continuing the bounded approved test after reviewing its measurement date and attribution; effectiveness is not established."],
      evidence,
      limitations,
    };
  }
  if (downstream.some((outcome) => outcome.value > 0)) {
    return {
      decision: "modify",
      confidence: "low",
      rationale: ["A positive downstream observation exists, but no reviewed asset is approved.", "Complete asset review and verify measurement attribution before considering continuation."],
      evidence,
      limitations,
    };
  }
  return {
    decision: "modify",
    confidence: "low",
    rationale: ["Available downstream observations explicitly record zero; other unmeasured metrics remain unknown.", "Review the measurement window, attribution and test before changing or closing the campaign."],
    evidence,
    limitations,
  };
}
