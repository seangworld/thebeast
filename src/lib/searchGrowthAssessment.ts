import type { MarketingRecommendation } from "./beastMarketing";
import { readSearchGrowthEvidence, searchGrowthCampaignId, searchGrowthProduct } from "./searchGrowthCampaign";

/** Only the persisted opportunity identity may select provider evidence. */
export function searchGrowthAssessmentTarget(ownerId: string, campaignId: string, sourceFacts: unknown) {
  if (!Array.isArray(sourceFacts)) return null;
  const facts = sourceFacts.filter((fact) => fact && typeof fact === "object"
    && typeof fact.label === "string" && fact.label.startsWith("Search Console sampled query: "));
  if (facts.length !== 1) return null;
  const page = facts[0].url;
  const query = facts[0].label.slice("Search Console sampled query: ".length);
  if (typeof page !== "string" || page.length > 1000 || !query.trim() || query.length > 240) return null;
  const product = searchGrowthProduct(page);
  if (!product || searchGrowthCampaignId(ownerId, page, query) !== campaignId) return null;
  return { page, query, product };
}

export function buildSearchGrowthAssessment(input: Parameters<typeof readSearchGrowthEvidence>[0]): MarketingRecommendation | null {
  const result = readSearchGrowthEvidence(input);
  if (!result) return null;
  const { baseline, opportunity, synchronizedAt } = result;
  const { current, previous } = opportunity;
  const metrics = (value: typeof current) => `${value.clicks} clicks; ${value.impressions} impressions; CTR ${value.ctr}; average position ${value.position}`;
  return {
    decision: "modify",
    confidence: "low",
    rationale: [
      "Review refreshed search evidence before deciding whether to change the campaign. This assessment does not change its status.",
      previous
        ? `Sampled search changes: ${current.clicks - previous.clicks} clicks and ${current.impressions - previous.impressions} impressions across equal finalized windows. These are not attributed campaign results.`
        : "The prior page/query is absent from the sample. A trend is unavailable; the missing period is not zero.",
      "Measure qualified outcomes separately before deciding to continue, scale or stop the campaign.",
    ],
    evidence: [
      `Search evidence assessment synchronized ${synchronizedAt}; assessed ${input.now.toISOString()}.`,
      `Exact page: ${input.page}; query: ${input.query}`,
      `Current ${baseline.currentStartDate} to ${baseline.currentEndDate}: ${metrics(current)}.`,
      `Previous ${baseline.previousStartDate} to ${baseline.previousEndDate}: ${previous ? metrics(previous) : "unavailable"}.`,
      `Finalized through ${baseline.dataThroughDate}.`,
    ],
    limitations: [
      `Search Console returns sampled page/query rows (limit ${baseline.rowLimit}); missing rows are not zero.`,
      "Search visibility and clicks do not establish qualified actions, conversions, campaign attribution or causal lift.",
      "The original campaign baseline is retained. These refreshed adjacent windows may differ from the discovery window and are not a pre/post campaign comparison.",
      "Existing provider caching may reuse a recent synchronization. This is an owner-requested read and advisory record, not publication, scheduling or spending authority.",
    ],
  };
}
