import type { SeangworldProviderSnapshot } from "./seangworldIntelligence";
import { growthTrackedLink } from "./marketingGrowthCycle";
import { searchGrowthProduct } from "./searchGrowthCampaign";

/** Campaign name alone is never identity. Missing or ambiguous rows are unavailable. */
export function growthTrafficEvidence(provider: SeangworldProviderSnapshot | undefined, page: string, campaignId: string, now: Date) {
  const unavailable = (reason: string) => ({ available: false as const, evidence: [`Qualified traffic unavailable: ${reason}.`], windowKey: "unavailable", decision: "modify" as const });
  const sync = Date.parse(provider?.lastSuccessfulSynchronizationAt || "");
  if (!provider || provider.id !== "ga4" || provider.status !== "configured" || provider.connectionStatus !== "connected" || !["current", "recent"].includes(provider.freshness)
    || !Number.isFinite(now.getTime()) || !Number.isFinite(sync) || sync > now.getTime() || now.getTime() - sync > 30 * 60_000) return unavailable("fresh GA4 evidence is missing");
  const window = provider.data?.qualifiedTrafficWindow;
  const tracked = growthTrackedLink(page, campaignId);
  if (!window || !tracked || window.scopeId !== searchGrowthProduct(page)) return unavailable("exact product reporting scope is missing");
  const dates = [window.current.startDate, window.current.endDate, window.previous.startDate, window.previous.endDate];
  if (dates.some((date) => !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) return unavailable("reporting dates are invalid");
  const [start, end, priorStart, priorEnd] = dates.map(Date.parse);
  if (![7, 30, 90].includes((end - start) / 86_400_000 + 1) || end - start !== priorEnd - priorStart || priorEnd + 86_400_000 !== start
    || end >= Date.parse(now.toISOString().slice(0, 10)) || now.getTime() - end > 3 * 86_400_000) return unavailable("equal recent reporting windows are missing");
  const expected = new URL(tracked);
  const matches = provider.data?.qualifiedTraffic?.filter((row) => {
    if (row.source !== "seangworld" || row.medium !== "organic_social" || row.campaignId !== campaignId || row.campaignName !== campaignId) return false;
    if (!row.landingPage.startsWith("/") || row.landingPage.startsWith("//") || row.landingPage.includes("\\")) return false;
    try {
      const landing = new URL(row.landingPage, expected.origin);
      return landing.origin === expected.origin && landing.pathname === expected.pathname && !landing.hash
        && Array.from(landing.searchParams).every(([key, value]) => expected.searchParams.get(key) === value);
    } catch { return false; }
  }) || [];
  if (matches.length !== 1) return unavailable("an unambiguous complete campaign acquisition tuple is missing");
  const row = matches[0];
  const valid = (value: number | null) => value === null || Number.isSafeInteger(value) && value >= 0;
  if (![row.sessions, row.previousSessions, row.qualifiedActions, row.previousQualifiedActions].every(valid) || !Number.isFinite(row.sessions)) return unavailable("counts are invalid");
  return {
    available: true as const,
    windowKey: `${window.current.startDate}:${window.current.endDate}`,
    decision: row.qualifiedActions !== null && row.previousQualifiedActions !== null && row.qualifiedActions > row.previousQualifiedActions ? "continue" as const : "modify" as const,
    evidence: [
      `Exact GA4 acquisition tuple: seangworld / organic_social / ${campaignId} (name and ID); destination ${page}. Synchronized ${provider.lastSuccessfulSynchronizationAt}.`,
      `GA4 current ${window.current.startDate} to ${window.current.endDate}: ${row.sessions} sessions; ${row.qualifiedActions ?? "unavailable"} qualified intent actions.`,
      `GA4 previous ${window.previous.startDate} to ${window.previous.endDate}: ${row.previousSessions ?? "unavailable"} sessions; ${row.previousQualifiedActions ?? "unavailable"} qualified intent actions.`,
      "Campaign labels describe reported acquisition, not proof of authorized publication or causal lift. Qualified intent actions are not confirmed registrations, activations or retained users. Rolling windows overlap between cycles and must not be summed.",
    ],
  };
}
