import type { SeangworldProviderSnapshot } from "./seangworldIntelligence";
import { trackedSocialUrl, type SocialPost } from "./marketingSocial";
export type SocialTraffic = { postId: string; sessions: number | null; engagedSessions: number | null; qualifiedActions: number | null; period: string | null; note: string };
export function socialTrafficEvidence(post: SocialPost, provider?: SeangworldProviderSnapshot, now = Date.now()): SocialTraffic {
  const unavailable = (note: string): SocialTraffic => ({ postId: post.id, sessions: null, engagedSessions: null, qualifiedActions: null, period: null, note });
  const synced = Date.parse(provider?.lastSuccessfulSynchronizationAt || "");
  if (provider?.id !== "ga4" || provider.status !== "configured" || provider.connectionStatus !== "connected" || !Number.isFinite(synced) || synced > now || now - synced > 30 * 60_000) return unavailable("Fresh analytics unavailable.");
  const link = trackedSocialUrl(post.content, post.channel, post.id);
  const window = provider.data?.qualifiedTrafficWindow;
  if (!link || !window) return unavailable("No tracked destination or reporting window.");
  const expected = new URL(link);
  const expectedScope = expected.hostname === "thebeast.seangworld.com" ? "thebeast" : expected.hostname === "news.seangworld.com" ? "seangworldnews" : expected.hostname === "changetheworld.seangworld.com" ? "change-the-world" : "seangworld";
  if (window.scopeId !== expectedScope) return unavailable("Destination reporting scope is unavailable.");
  const rows = provider.data?.qualifiedTraffic?.filter(row => {
    if (row.medium !== "organic_social" || row.source !== expected.searchParams.get("utm_source") || row.campaignId !== expected.searchParams.get("utm_id") || row.campaignName !== expected.searchParams.get("utm_campaign") || !row.landingPage.startsWith("/") || row.landingPage.startsWith("//") || row.landingPage.includes("\\")) return false;
    const actual = new URL(row.landingPage, expected.origin);
    return actual.pathname === expected.pathname && actual.searchParams.get("utm_content") === post.id && Array.from(expected.searchParams).every(([key, value]) => actual.searchParams.get(key) === value);
  }) || [];
  if (rows.length !== 1) return unavailable("No unambiguous post match in the returned analytics rows. This is not a measured zero.");
  const row = rows[0];
  if (![row.sessions, row.engagedSessions].every(n => Number.isSafeInteger(n) && n >= 0)) return unavailable("Analytics counts are unavailable.");
  return { postId: post.id, sessions: row.sessions, engagedSessions: row.engagedSessions, qualifiedActions: row.qualifiedActions, period: `${window.current.startDate} – ${window.current.endDate}`, note: "GA4 attributed sessions and intent actions; not verified signups, unique people, or proof this post caused the visit." };
}
