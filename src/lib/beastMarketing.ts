export const BEAST_MARKETING_VERSION = "0.5.0";

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

export function buildMarketingRecommendation({
  campaign,
  outcomes,
  approvedAssetCount,
}: {
  campaign: Pick<MarketingCampaign, "status" | "sourceFacts" | "limitations">;
  outcomes: Pick<MarketingOutcome, "metric" | "value" | "sourceLabel">[];
  approvedAssetCount: number;
}): MarketingRecommendation {
  const totals = new Map<MarketingOutcomeMetric, number>();
  for (const outcome of outcomes) {
    totals.set(outcome.metric, (totals.get(outcome.metric) || 0) + outcome.value);
  }
  const evidence = outcomes.map((outcome) => `${outcome.sourceLabel}: ${outcome.metric} ${outcome.value}`);
  const limitations = [...campaign.limitations];

  if (!outcomes.length) {
    return {
      decision: "modify",
      confidence: "low",
      rationale: ["Performance evidence is unavailable, so continuation or cancellation cannot be supported yet.", "Define a bounded approved test and record at least one useful outcome before judging the campaign."],
      evidence: campaign.sourceFacts.map((fact) => fact.label),
      limitations: [...limitations, "No performance outcome has been recorded."],
    };
  }

  const conversions = (totals.get("downloads") || 0) + (totals.get("registrations") || 0) + (totals.get("activations") || 0) + (totals.get("retained_users") || 0);
  const visits = totals.get("visits");
  if (conversions > 0 && approvedAssetCount > 0) {
    return {
      decision: "continue",
      confidence: outcomes.length >= 3 ? "high" : "moderate",
      rationale: ["Recorded evidence includes a useful downstream outcome.", "At least one reviewed asset is approved for this campaign."],
      evidence,
      limitations,
    };
  }
  if (typeof visits === "number" && visits > 0) {
    return {
      decision: "modify",
      confidence: "moderate",
      rationale: ["The campaign produced recorded visits but no recorded downstream outcome.", "Revise the offer, call to action, or approved asset before increasing distribution."],
      evidence,
      limitations,
    };
  }
  return {
    decision: campaign.status === "completed" ? "stop" : "modify",
    confidence: outcomes.length >= 2 ? "moderate" : "low",
    rationale: ["Recorded outcomes do not yet show a useful result.", campaign.status === "completed" ? "Close or archive the campaign unless new evidence changes the result." : "Keep the campaign bounded while changing the test."],
    evidence,
    limitations,
  };
}
