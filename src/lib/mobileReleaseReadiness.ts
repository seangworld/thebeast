import {
  beastMobileSupportedWidths,
  buildMobileCoreRoutes,
  type BeastMobileRoute,
} from "./mobileFoundation";
import type { AdminViewMode, EntitlementSubject } from "./entitlements";

export type MobileReleaseGateId =
  | "route-smoke"
  | "analytics-markers"
  | "performance-budget"
  | "responsive-widths"
  | "source-owned-actions"
  | "production-smoke-plan"
  | "supabase-skip";

export type MobileReleaseGate = {
  id: MobileReleaseGateId;
  label: string;
  requirement: string;
  releaseBlocking: boolean;
};

export type MobileAnalyticsEventId =
  | "beast_mobile_nav_open"
  | "beast_mobile_route_open"
  | "beast_mobile_quick_action"
  | "beast_mobile_runtime_state_visible";

export type MobileAnalyticsEvent = {
  id: MobileAnalyticsEventId;
  surface: "navigation" | "route" | "quick-action" | "runtime-state";
  piiSafe: true;
  sourceOwned: true;
};

export type MobilePerformanceBudget = {
  supportedWidths: readonly number[];
  maxFirstLoadKb: number;
  maxRouteResponseMs: number;
  maxPageHorizontalOverflowPx: 0;
};

export type MobileReleaseReadiness = {
  packageId: "BF-MOB-009";
  routes: BeastMobileRoute[];
  analyticsEvents: MobileAnalyticsEvent[];
  performanceBudget: MobilePerformanceBudget;
  gates: MobileReleaseGate[];
  supabaseRequired: false;
};

export const mobileReleaseAnalyticsEvents: MobileAnalyticsEvent[] = [
  {
    id: "beast_mobile_nav_open",
    surface: "navigation",
    piiSafe: true,
    sourceOwned: true,
  },
  {
    id: "beast_mobile_route_open",
    surface: "route",
    piiSafe: true,
    sourceOwned: true,
  },
  {
    id: "beast_mobile_quick_action",
    surface: "quick-action",
    piiSafe: true,
    sourceOwned: true,
  },
  {
    id: "beast_mobile_runtime_state_visible",
    surface: "runtime-state",
    piiSafe: true,
    sourceOwned: true,
  },
];

export const mobileReleaseGates: MobileReleaseGate[] = [
  {
    id: "route-smoke",
    label: "Route smoke",
    requirement: "Mobile-critical routes must return a successful response before release.",
    releaseBlocking: true,
  },
  {
    id: "analytics-markers",
    label: "Analytics markers",
    requirement: "Mobile analytics events must be taxonomy-only and PII-safe.",
    releaseBlocking: true,
  },
  {
    id: "performance-budget",
    label: "Performance budget",
    requirement: "Mobile first-load and route response budgets must be checked before release.",
    releaseBlocking: true,
  },
  {
    id: "responsive-widths",
    label: "Responsive widths",
    requirement: "Mobile release validation must cover 320px, 375px, 390px, and 430px.",
    releaseBlocking: true,
  },
  {
    id: "source-owned-actions",
    label: "Source-owned actions",
    requirement: "Release readiness must not add direct module business-logic mutations.",
    releaseBlocking: true,
  },
  {
    id: "production-smoke-plan",
    label: "Production smoke plan",
    requirement: "Production smoke must use the same route inventory after deployment.",
    releaseBlocking: true,
  },
  {
    id: "supabase-skip",
    label: "Supabase skip",
    requirement: "Supabase release work is skipped when no migration files changed.",
    releaseBlocking: true,
  },
];

export const mobilePerformanceBudget: MobilePerformanceBudget = {
  supportedWidths: beastMobileSupportedWidths,
  maxFirstLoadKb: 320,
  maxRouteResponseMs: 2000,
  maxPageHorizontalOverflowPx: 0,
};

export function buildMobileReleaseSmokeRoutes({
  subject,
  adminViewMode = "admin",
}: {
  subject: EntitlementSubject;
  adminViewMode?: AdminViewMode;
}): BeastMobileRoute[] {
  const routes = buildMobileCoreRoutes({ subject, adminViewMode });
  const smokeHrefs = new Set([
    "/dashboard",
    "/dashboard/today",
    "/dashboard/notifications",
    "/dashboard/calendar",
    "/dashboard/search",
    "/dashboard/uploads",
    "/dashboard/goals",
    "/dashboard/money",
    "/dashboard/learning",
    "/dashboard/health",
    "/dashboard/home",
  ]);

  return routes.filter((route) => smokeHrefs.has(route.href.split("#")[0]));
}

export function buildMobileReleaseReadiness({
  subject,
  adminViewMode = "admin",
}: {
  subject: EntitlementSubject;
  adminViewMode?: AdminViewMode;
}): MobileReleaseReadiness {
  return {
    packageId: "BF-MOB-009",
    routes: buildMobileReleaseSmokeRoutes({ subject, adminViewMode }),
    analyticsEvents: mobileReleaseAnalyticsEvents,
    performanceBudget: mobilePerformanceBudget,
    gates: mobileReleaseGates,
    supabaseRequired: false,
  };
}
