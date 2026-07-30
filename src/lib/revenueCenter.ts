import type { BeastModuleIdentifier } from "./moduleRegistry";

export const revenueSourceRegistry = [
  {
    id: "adsense",
    name: "Google AdSense",
    generation: "Generation 1",
    state: "integration",
    description: "Aggregate advertising reporting and governed placements.",
  },
  ...[
    "Affiliate revenue",
    "Digital products",
    "Courses",
    "Memberships",
    "Sponsors",
    "Consulting",
    "Donations",
    "Merchandise",
  ].map((name) => ({
    id: name.toLowerCase().replaceAll(" ", "-"),
    name,
    generation: "Future",
    state: "future",
    description: "Recognized revenue source with no connected provider.",
  })),
] as const;

export type RevenuePlacement = {
  id: string;
  name: string;
  product: string;
  moduleId: BeastModuleIdentifier | null;
  flagKey: string | null;
  route: string | null;
  eligible: boolean;
  integration: "beast" | "external";
  reason: string;
};

export const revenuePlacements: readonly RevenuePlacement[] = [
  {
    id: "beastos-dashboard-footer",
    name: "Dashboard footer",
    product: "BeastOS",
    moduleId: "beastos",
    flagKey: "revenue.ads.beastos-dashboard-footer",
    route: "/dashboard/today",
    eligible: true,
    integration: "beast",
    reason: "A single ad may appear after member content at the page footer.",
  },
  {
    id: "beastmoney-dashboard-footer",
    name: "Dashboard footer",
    product: "BeastMoney",
    moduleId: "money",
    flagKey: "revenue.ads.beastmoney-dashboard-footer",
    route: "/dashboard/money/dashboard",
    eligible: true,
    integration: "beast",
    reason: "A single ad may appear after the financial summary, never inside records.",
  },
  {
    id: "seangworld-public-footer",
    name: "Public page footer",
    product: "SEANGWORLD",
    moduleId: null,
    flagKey: null,
    route: null,
    eligible: true,
    integration: "external",
    reason: "Managed in the SEANGWORLD repository and Google page exclusions.",
  },
  ...[
    ["money-coach", "Money Coach", "BeastMoney"],
    ["guidance-counselor", "Guidance Counselor", "BeastEducation"],
    ["health-advisor", "Health Advisor", "BeastHealth"],
    ["member-messages", "Private messages", "BeastOS"],
    ["documents", "Documents and uploaded records", "BeastOS"],
    ["financial-records", "Financial record workspaces", "BeastMoney"],
    ["education-records", "Education record workspaces", "BeastEducation"],
    ["health-records", "Health record workspaces", "BeastHealth"],
    ["beastadmin", "All owner workspaces", "BeastAdmin"],
  ].map(([id, name, product]) => ({
    id,
    name,
    product,
    moduleId: null,
    flagKey: null,
    route: null,
    eligible: false,
    integration: "beast" as const,
    reason:
      "Protected workspace: advertising is never rendered in private, professional, record, form, document, or administrative experiences.",
  })),
];

export function findRevenuePlacement(pathname: string) {
  return (
    revenuePlacements.find(
      (placement) =>
        placement.eligible &&
        placement.integration === "beast" &&
        placement.route === pathname
    ) || null
  );
}

export type RevenueMetricSet = {
  estimatedEarnings: number | null;
  pageViews: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  rpm: number | null;
  currency: string | null;
};

export type RevenuePeriod = "today" | "yesterday" | "last7" | "month" | "lifetime";

export type RevenueSnapshot = {
  provider: "adsense";
  state: "not_configured" | "available" | "no_data" | "failed";
  generatedAt: string;
  diagnostic: string;
  periods: Record<RevenuePeriod, RevenueMetricSet | null>;
  projectedMonthlyRevenue: number | null;
  topPages: Array<{ label: string; estimatedEarnings: number | null }>;
  topProducts: Array<{ label: string; estimatedEarnings: number | null }>;
  topPlacements: Array<{ label: string; estimatedEarnings: number | null }>;
  history: Array<{ date: string; estimatedEarnings: number | null }>;
};

export const unavailableRevenueMetrics: RevenueMetricSet = {
  estimatedEarnings: null,
  pageViews: null,
  impressions: null,
  clicks: null,
  ctr: null,
  rpm: null,
  currency: null,
};

export function sanitizeReportingPage(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "Page unavailable";
  }
}

export function projectMonthlyRevenue(
  monthToDate: number | null,
  now = new Date()
) {
  if (monthToDate === null || !Number.isFinite(monthToDate)) return null;
  const daysElapsed = now.getUTCDate();
  const monthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)
  ).getUTCDate();
  return (monthToDate / daysElapsed) * monthEnd;
}
