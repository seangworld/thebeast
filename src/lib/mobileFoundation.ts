import type { ModuleKey } from "@/app/components/design/DashboardPrimitives";
import type { AdminViewMode, EntitlementSubject } from "./entitlements";
import {
  resolveEffectiveEntitlementContext,
} from "./entitlements";
import {
  buildApplicationNavigationForPersona,
  primaryNavigation,
  type ModuleNavSection,
} from "./moduleNavigation";
import type { PlatformIntelligence, PlatformModule } from "./platform/types";

export const beastMobileBreakpointPx = 768;
export const beastMobileSupportedWidths = [320, 375, 390, 430] as const;

export type BeastMobileNavItem = {
  label: string;
  href: string;
  module: ModuleKey;
  primary?: boolean;
};

export type BeastMobileCard = {
  id: string;
  label: string;
  href: string;
  module: ModuleKey;
  summary: string;
  detail: string;
  primaryAction: string;
  visible: boolean;
};

export type BeastMobileRoute = {
  label: string;
  href: string;
  module: ModuleKey;
};

function canUseModule(module: PlatformModule, visibleModules: Set<ModuleKey>) {
  if (module === "beastos") return true;
  return visibleModules.has(module as ModuleKey);
}

export function buildMobileNavigation({
  isOwner,
  learningOnly = false,
}: {
  isOwner: boolean;
  learningOnly?: boolean;
}): {
  primary: BeastMobileNavItem[];
  more: BeastMobileNavItem[];
} {
  const applicationNavigation = buildApplicationNavigationForPersona({ isOwner });
  const applicationItems = applicationNavigation.map((item) => ({
    label: item.label,
    href: item.href || "/dashboard",
    module: item.module,
  }));
  const sharedItems = primaryNavigation
    .filter((item) =>
      ["Today", "Calendar", "Notifications", "Search", "Goals", "Documents"].includes(
        item.label
      )
    )
    .map((item) => ({
      label: item.label,
      href: item.href || "/dashboard",
      module: item.module,
    }));

  const primary = learningOnly
    ? [
        { label: "Today", href: "/dashboard/today", module: "learning" as ModuleKey, primary: true },
        { label: "Guidance Counselor", href: "/dashboard/learning", module: "learning" as ModuleKey, primary: true },
        { label: "Calendar", href: "/dashboard/calendar", module: "calendar" as ModuleKey, primary: true },
        { label: "AI", href: "/dashboard/search#shared-ai", module: "search" as ModuleKey, primary: true },
        { label: "More", href: "#mobile-more", module: "beastos" as ModuleKey, primary: true },
      ]
    : [
        { label: "Today", href: "/dashboard/today", module: "beastos" as ModuleKey, primary: true },
        { label: "Money", href: "/dashboard/money", module: "money" as ModuleKey, primary: true },
        { label: "Calendar", href: "/dashboard/calendar", module: "calendar" as ModuleKey, primary: true },
        { label: "AI", href: "/dashboard/search#shared-ai", module: "search" as ModuleKey, primary: true },
        { label: "More", href: "#mobile-more", module: "beastos" as ModuleKey, primary: true },
      ];

  const more = [
    ...sharedItems,
    ...applicationItems,
    { label: "Shared AI", href: "/dashboard/search#shared-ai", module: "search" as ModuleKey },
    { label: "Quick Uploads", href: "/dashboard/uploads", module: "documents" as ModuleKey },
    { label: "Profile", href: "/dashboard/profile", module: "beastos" as ModuleKey },
    { label: "Settings", href: "/dashboard/settings", module: "beastos" as ModuleKey },
  ].filter((item, index, items) =>
    items.findIndex((candidate) => candidate.href === item.href && candidate.label === item.label) === index
  );

  return { primary, more };
}

export function buildMobileModuleCards({
  subject,
  adminViewMode = "admin",
  intelligence,
}: {
  subject: EntitlementSubject;
  adminViewMode?: AdminViewMode;
  intelligence?: PlatformIntelligence;
}): BeastMobileCard[] {
  const context = resolveEffectiveEntitlementContext(subject, adminViewMode);
  const isOwner = context.role === "admin";
  const visibleModules = new Set(
    buildApplicationNavigationForPersona({ isOwner }).map((item) => item.module)
  );
  const summaries = intelligence?.moduleSummaries || [];

  return summaries
    .filter((summary) => canUseModule(summary.module, visibleModules))
    .filter((summary) => summary.module !== "admin")
    .map((summary) => ({
      id: `mobile-module-${summary.module}`,
      label: summary.label,
      href: summary.href || "/dashboard",
      module: summary.module as ModuleKey,
      summary: summary.summary,
      detail: `${summary.recommendations} recommendations, ${summary.alerts} alerts`,
      primaryAction: `Open ${summary.label}`,
      visible: true,
    }));
}

export function buildMobileCoreRoutes({
  subject,
  adminViewMode = "admin",
}: {
  subject: EntitlementSubject;
  adminViewMode?: AdminViewMode;
}): BeastMobileRoute[] {
  const context = resolveEffectiveEntitlementContext(subject, adminViewMode);
  const isOwner = context.role === "admin";
  const applications = buildApplicationNavigationForPersona({ isOwner }).map((item) => ({
    label: item.label,
    href: item.href || "/dashboard",
    module: item.module,
  }));

  return [
    { label: "Home", href: "/dashboard", module: "beastos" },
    { label: "Today", href: "/dashboard/today", module: "beastos" },
    { label: "Notifications", href: "/dashboard/notifications", module: "notifications" },
    { label: "Calendar", href: "/dashboard/calendar", module: "calendar" },
    { label: "Search", href: "/dashboard/search", module: "search" },
    { label: "Shared AI", href: "/dashboard/search#shared-ai", module: "search" },
    { label: "Quick Uploads", href: "/dashboard/uploads", module: "documents" },
    { label: "Goals", href: "/dashboard/goals", module: "goals" },
    ...applications,
  ];
}

