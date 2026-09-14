import {
  buildSeangworldIntelligenceSnapshot,
  buildServerSeangworldProviders,
  type SeangworldIntelligenceSnapshot,
} from "../seangworldIntelligence";
import { getSeangworldAnalyticsScope } from "../seangworldAnalyticsScope";
import {
  getGoogleAccessToken,
  loadLiveSeangworldProviders,
} from "./seangworldGoogleProviders";
import {
  buildSiteWideOutcomeSnapshot,
  type SiteWideOutcomeSnapshot,
} from "../siteWideOutcomeLearning";

type Environment = Readonly<Record<string, string | undefined>>;

function mergedSnapshot(
  configured: ReturnType<typeof buildServerSeangworldProviders>,
  live: Awaited<ReturnType<typeof loadLiveSeangworldProviders>>,
  generatedAt: string,
  label: string,
): SeangworldIntelligenceSnapshot {
  const providers = configured
    .filter((provider) => provider.id !== "first_party")
    .map((provider) => live?.find((candidate) => candidate.id === provider.id) || provider);
  return buildSeangworldIntelligenceSnapshot({
    providers,
    generatedAt,
    comparisonPeriod: `${label}: current 30 days compared with previous 30 days`,
  });
}

/** Read-only aggregate provider access. No member rows or raw analytics events leave providers. */
export async function loadSiteWideOutcomeEvidence(
  environment: Environment = process.env,
  now = new Date(),
): Promise<SiteWideOutcomeSnapshot> {
  const generatedAt = now.toISOString();
  const configured = buildServerSeangworldProviders(environment, generatedAt);
  let token: Promise<string> | null = null;
  const tokenLoader = () => {
    token ||= getGoogleAccessToken(environment);
    return token;
  };
  const [ecosystemLive, newsLive, beastLive] = await Promise.all([
    loadLiveSeangworldProviders(environment, now, fetch, tokenLoader, 30, null),
    loadLiveSeangworldProviders(environment, now, fetch, tokenLoader, 30, getSeangworldAnalyticsScope("seangworldnews")),
    loadLiveSeangworldProviders(environment, now, fetch, tokenLoader, 30, getSeangworldAnalyticsScope("thebeast")),
  ]);
  return buildSiteWideOutcomeSnapshot({
    observedAt: generatedAt,
    ecosystem: mergedSnapshot(configured, ecosystemLive, generatedAt, "SEANGWORLD ecosystem"),
    news: mergedSnapshot(configured, newsLive, generatedAt, "SEANGWORLDNEWS"),
    beast: mergedSnapshot(configured, beastLive, generatedAt, "The Beast"),
  });
}
