import { searchGrowthCampaignId, searchGrowthProduct } from "./searchGrowthCampaign";

export const GROWTH_CYCLE_LIMIT = 4;
export const GROWTH_HISTORY_LIMIT = 500;
export const GROWTH_ASSESSMENT_LIMIT = 10;
/** Rotate a bounded batch daily so an old campaign cannot monopolize the queue. */
export function growthAssessmentBatch<T>(items: readonly T[], now: Date): T[] {
  if (!items.length) return [];
  const start = Math.floor(now.getTime() / 86_400_000) * GROWTH_ASSESSMENT_LIMIT % items.length;
  return Array.from({ length: Math.min(items.length, GROWTH_ASSESSMENT_LIMIT) }, (_, index) => items[(start + index) % items.length]);
}
export const GROWTH_PUBLISHING_BLOCKER = "External distribution is not connected or authorized. Drafts require owner review; no publishing, paid media, or Fact Brief processing occurs.";

export type GrowthCycleReport = {
  version: 1;
  prepared: string[];
  assessed: string[];
  unavailable: string[];
  blockers: string[];
};

export function growthTrackedLink(page: string, campaignId: string) {
  if (!searchGrowthProduct(page) || !/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/.test(campaignId)) return null;
  const url = new URL(page);
  url.searchParams.set("utm_source", "seangworld");
  url.searchParams.set("utm_medium", "organic_social");
  url.searchParams.set("utm_campaign", campaignId);
  url.searchParams.set("utm_id", campaignId);
  return url.toString();
}

/** Identity includes the evidence window; repeated reads never duplicate learning. */
export function growthAssessmentId(ownerId: string, campaignId: string, start: string, end: string) {
  return searchGrowthCampaignId(ownerId, `growth-assessment:${campaignId}`, `${start}:${end}`);
}

export function growthDraftAsset(ownerId: string, campaignId: string, page: string) {
  const link = growthTrackedLink(page, campaignId);
  if (!link) return null;
  const product = searchGrowthProduct(page) === "thebeast" ? "Beast" : "SEANGWORLD News";
  return {
    id: searchGrowthCampaignId(ownerId, `growth-draft:${campaignId}`, "v1"),
    campaign_id: campaignId, owner_id: ownerId,
    name: `${product} destination introduction`, asset_type: "Social draft", channel: "Organic social",
    body: `Explore ${product}: ${link}\n\nReview the destination before publishing. Add only verified details from the destination; search demand alone does not verify a claim.`,
    source_facts: [{ label: "Destination only; no product or news claim has been verified.", url: page }],
    status: "draft",
  };
}
