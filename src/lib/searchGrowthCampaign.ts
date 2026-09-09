import { createHash } from "node:crypto";
import { validateCampaignDraft } from "./beastMarketing";
import { getSeangworldAnalyticsScope, searchGrowthProduct } from "./seangworldAnalyticsScope";
import type { SeangworldProviderSnapshot } from "./seangworldIntelligence";

/** One campaign per owner and opportunity; retries never replace reviewed work. */
export function searchGrowthCampaignId(ownerId: string, page: string, query: string) {
  const hex = createHash("sha256").update(JSON.stringify(["search-growth-v1", ownerId, page, query])).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = "8";
  return `${hex.slice(0, 8).join("")}-${hex.slice(8, 12).join("")}-${hex.slice(12, 16).join("")}-${hex.slice(16, 20).join("")}-${hex.slice(20).join("")}`;
}

export { searchGrowthProduct } from "./seangworldAnalyticsScope";

export function prepareSearchGrowthCampaign({ provider, page, query, now }: {
  provider: SeangworldProviderSnapshot | undefined;
  page: string;
  query: string;
  now: Date;
}) {
  const product = searchGrowthProduct(page);
  const scope = getSeangworldAnalyticsScope(product);
  const synchronized = Date.parse(provider?.lastSuccessfulSynchronizationAt || "");
  const nowMs = now.getTime();
  if (!Number.isFinite(nowMs) || !scope || !provider || provider.id !== "search_console" || provider.status !== "configured"
    || provider.connectionStatus !== "connected" || !["current", "recent"].includes(provider.freshness)
    || !Number.isFinite(synchronized) || synchronized > nowMs || nowMs - synchronized > 30 * 60_000) return null;
  const baseline = provider.data?.searchOpportunityBaseline;
  const opportunity = provider.data?.searchOpportunities?.find((item) => item.page === page && item.query === query);
  if (!baseline || !opportunity || !["Optimize Existing", "Create New", "Distribute"].includes(opportunity.classification)) return null;
  const through = Date.parse(baseline.dataThroughDate);
  if (!Number.isFinite(through) || through > nowMs || nowMs - through > 7 * 86_400_000) return null;
  const dates = [baseline.currentStartDate, baseline.currentEndDate, baseline.previousStartDate, baseline.previousEndDate, baseline.dataThroughDate];
  if (dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) return null;
  const [start, end, priorStart, priorEnd] = dates.map(Date.parse);
  const length = (end - start) / 86_400_000 + 1;
  if (![7, 30, 90].includes(length) || priorEnd + 86_400_000 !== start || priorEnd - priorStart !== end - start || baseline.dataThroughDate !== baseline.currentEndDate) return null;
  const metrics = opportunity.current;
  if (![metrics.clicks, metrics.impressions, metrics.ctr, metrics.position].every((value) => Number.isFinite(value) && value >= 0)
    || metrics.ctr > 1 || metrics.impressions < metrics.clicks) return null;
  if (opportunity.previous && (!Object.values(opportunity.previous).every((value) => Number.isFinite(value) && value >= 0)
    || opportunity.previous.ctr > 1 || opportunity.previous.clicks > opportunity.previous.impressions)) return null;
  return validateCampaignDraft({
    title: `${scope.label}: ${query}`.slice(0, 160),
    objective: `Qualified traffic growth. ${opportunity.proposedAction}`,
    audience: opportunity.targetAudience,
    offer: `Review and improve the existing asset at ${page}`,
    channels: ["Organic search"],
    callToAction: `Visit ${page}`,
    sourceFacts: [
      { label: `Search Console sampled query: ${query}`, url: page, observedAt: provider.lastSuccessfulSynchronizationAt, limitation: "Search demand is evidence of an opportunity, not a verified product or news claim." },
      { label: `Current baseline ${baseline.currentStartDate} to ${baseline.currentEndDate}: ${metrics.clicks} clicks; ${metrics.impressions} impressions; CTR ${metrics.ctr}; position ${metrics.position}.`, url: page, observedAt: provider.lastSuccessfulSynchronizationAt, limitation: `Finalized through ${baseline.dataThroughDate}; sampled page/query rows may omit queries.` },
      { label: `Previous baseline ${baseline.previousStartDate} to ${baseline.previousEndDate}: ${opportunity.previous ? JSON.stringify(opportunity.previous) : "unavailable"}`, url: page, observedAt: provider.lastSuccessfulSynchronizationAt, limitation: "Missing prior evidence is not zero. Metric changes do not establish causation." },
    ],
    successMeasures: [opportunity.measurement, "Record qualified actions separately from visits; compare equal finalized reporting windows."],
    limitations: ["Draft for review; no publication, scheduling, paid media or provider execution is authorized.", "Verify the destination and every factual claim before creating or publishing creative.", "The original baseline is retained on retry. An existing campaign is never overwritten or reopened."],
  });
}
