export const seangworldAnalyticsScopeIds = [
  "seangworld",
  "seangworldnews",
  "thebeast",
  "change-the-world",
] as const;

export type SeangworldAnalyticsScopeId =
  (typeof seangworldAnalyticsScopeIds)[number];

export type SeangworldAnalyticsScope = {
  id: SeangworldAnalyticsScopeId;
  label: string;
  ga4HostRegex: string;
  searchConsolePageRegex: string;
};

const scopes: Record<SeangworldAnalyticsScopeId, SeangworldAnalyticsScope> = {
  thebeast: {
    id: "thebeast",
    label: "The Beast",
    ga4HostRegex: "^thebeast\\.seangworld\\.com$",
    searchConsolePageRegex: "^https://thebeast\\.seangworld\\.com/.*",
  },
  seangworld: {
    id: "seangworld",
    label: "SEANGWORLD.com",
    ga4HostRegex: "^(www\\.)?seangworld\\.com$",
    searchConsolePageRegex: "^https://(www\\.)?seangworld\\.com/.*",
  },
  seangworldnews: {
    id: "seangworldnews",
    label: "SEANGWORLDNEWS",
    ga4HostRegex: "^news\\.seangworld\\.com$",
    searchConsolePageRegex: "^https://news\\.seangworld\\.com/.*",
  },
  "change-the-world": {
    id: "change-the-world",
    label: "Change the World",
    ga4HostRegex: "^changetheworld\\.seangworld\\.com$",
    searchConsolePageRegex:
      "^https://changetheworld\\.seangworld\\.com/.*",
  },
};

export function getSeangworldAnalyticsScope(
  value: string | null | undefined
): SeangworldAnalyticsScope | null {
  if (!value || !seangworldAnalyticsScopeIds.includes(value as SeangworldAnalyticsScopeId)) {
    return null;
  }
  return scopes[value as SeangworldAnalyticsScopeId];
}

export function searchGrowthProduct(page: string): SeangworldAnalyticsScopeId | null {
  try {
    const url = new URL(page);
    const firstPath = decodeURIComponent(url.pathname).split("/").filter(Boolean)[0]?.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash
      || ["dashboard", "api", "auth"].includes(firstPath || "")) return null;
    const hosts: Record<string, SeangworldAnalyticsScopeId> = {
      "news.seangworld.com": "seangworldnews", "thebeast.seangworld.com": "thebeast",
    };
    return hosts[url.hostname] || null;
  } catch { return null; }
}

