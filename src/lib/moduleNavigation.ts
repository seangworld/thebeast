import type { ModuleKey } from "@/app/components/design/DashboardPrimitives";
import {
  beastModuleRegistry,
  getVisibleModuleRegistryEntries,
  type BeastModuleRegistryEntry,
} from "./moduleRegistry";

export type ModuleChildNavItem = {
  label: string;
  href: string;
  future?: boolean;
};

export type ModuleNavSection = {
  label: string;
  href?: string;
  module: ModuleKey;
  comingSoon?: boolean;
  defaultExpanded?: boolean;
  children?: ModuleChildNavItem[];
};

export const primaryNavigation: ModuleNavSection[] = [
  { label: "Home", href: "/dashboard", module: "beastos" },
  { label: "Today", href: "/dashboard/today", module: "beastos" },
  { label: "Search", href: "/dashboard/search", module: "search" },
  { label: "Notifications", href: "/dashboard/notifications", module: "notifications" },
];

export const beastMoneyNavigation: ModuleNavSection = {
  label: "BeastMoney",
  href: "/dashboard/money",
  module: "money",
  children: [
    { label: "Dashboard", href: "/dashboard/money" },
    { label: "Cash Flow", href: "/dashboard/money/cashflow" },
    { label: "Bills", href: "/dashboard/money/cashflow#bills" },
    { label: "Debts", href: "/dashboard/money/debts" },
    { label: "Payoff Plan", href: "/dashboard/money/debts#payoff-plan" },
    { label: "Velocity", href: "/dashboard/money/velocity" },
    { label: "Billing", href: "/dashboard/money/billing" },
    { label: "Settings", href: "/dashboard/money/settings" },
    { label: "Add Bill", href: "/dashboard/money/cashflow#add-bill" },
    { label: "Add Debt", href: "/dashboard/money/debts#add-debt" },
  ],
};

export const beastLearningNavigation: ModuleNavSection = {
  label: "BeastLearning",
  href: "/dashboard/learning",
  module: "learning",
  children: [
    { label: "Learning Path", href: "/dashboard/learning" },
    { label: "Activities", href: "/dashboard/learning/activities" },
    { label: "Goals", href: "/dashboard/learning#goals" },
    { label: "Study Plan", href: "/dashboard/learning#study-plan" },
    { label: "Courses", href: "/dashboard/learning#courses" },
    { label: "Flashcards", href: "/dashboard/learning#flashcards" },
    { label: "Achievements", href: "/dashboard/learning#achievements" },
    { label: "Certificates", href: "/dashboard/learning#certificates" },
    { label: "Parent View", href: "/dashboard/learning#parent-view" },
    { label: "Feedback", href: "/dashboard/learning#feedback" },
  ],
};

export const memberBeastLearningNavigation: ModuleNavSection = {
  label: "BeastLearning",
  href: "/dashboard/learning",
  module: "learning",
  children: [
    { label: "Mentor", href: "/dashboard/learning" },
    { label: "Continue", href: "/dashboard/learning#mentor-session" },
    { label: "My Plan", href: "/dashboard/learning#mentor-plan" },
    { label: "How I'm Doing", href: "/dashboard/learning#mentor-progress" },
    { label: "Wins", href: "/dashboard/learning#wins" },
  ],
};

export const memberBeastMoneyNavigation: ModuleNavSection = {
  ...beastMoneyNavigation,
  children: beastMoneyNavigation.children?.filter(
    (item) => item.label !== "Billing" && !item.future
  ),
};

export const beastAdminNavigation: ModuleNavSection = {
  label: "BeastAdmin",
  href: "/dashboard/admin",
  module: "admin",
  defaultExpanded: true,
  children: [
    { label: "Dashboard", href: "/dashboard/admin" },
    { label: "Members", href: "/dashboard/admin/members" },
    { label: "Modules", href: "/dashboard/admin/modules" },
    { label: "Analytics", href: "/dashboard/admin/analytics" },
    { label: "Feedback", href: "/dashboard/admin/feedback" },
    { label: "Ads", href: "/dashboard/admin/ads" },
    { label: "Settings", href: "/dashboard/admin/settings" },
  ],
};

const plannedModuleNavigation: Record<string, ModuleNavSection> = {
  health: { label: "BeastHealth", module: "health", comingSoon: true },
  goals: { label: "BeastGoals", module: "goals", comingSoon: true },
  home: { label: "BeastHome", module: "home", comingSoon: true },
  documents: { label: "BeastDocuments", module: "documents", comingSoon: true },
  admin: beastAdminNavigation,
};

function navigationFromRegistryEntry(entry: BeastModuleRegistryEntry) {
  if (entry.identifier === "money") return beastMoneyNavigation;
  if (entry.identifier === "learning") return beastLearningNavigation;
  if (entry.identifier === "beastos") return null;

  return plannedModuleNavigation[entry.identifier] || null;
}

export function buildBeastModuleNavigationForPersona({
  isOwner,
  registry = beastModuleRegistry,
}: {
  isOwner: boolean;
  registry?: BeastModuleRegistryEntry[];
}) {
  return getVisibleModuleRegistryEntries({ isOwner, registry })
    .map(navigationFromRegistryEntry)
    .filter(Boolean) as ModuleNavSection[];
}

export const beastModuleNavigation: ModuleNavSection[] = [
  ...buildBeastModuleNavigationForPersona({ isOwner: true }),
  { label: "BeastProjects", module: "projects", comingSoon: true },
];

export const memberBeastModuleNavigation: ModuleNavSection[] =
  buildBeastModuleNavigationForPersona({ isOwner: false }).map((item) =>
    item.module === "money" ? memberBeastMoneyNavigation : item
  );

export function getBeastModuleNavigationForPersona(isAdmin: boolean) {
  return isAdmin ? beastModuleNavigation : memberBeastModuleNavigation;
}

export const sharedNavigation: ModuleNavSection[] = [
  { label: "Calendar", href: "/dashboard/calendar", module: "calendar" },
  { label: "Timeline", href: "/dashboard/timeline", module: "timeline" },
  { label: "Upload Center", href: "/dashboard/uploads", module: "documents" },
  { label: "Profile", href: "/dashboard/profile", module: "beastos" },
  { label: "Settings", href: "/dashboard/settings", module: "beastos" },
];

export const allModuleNavigation: ModuleNavSection[] = [
  ...primaryNavigation,
  ...beastModuleNavigation,
  ...sharedNavigation,
];

export function getModuleChildren(module: ModuleKey) {
  return allModuleNavigation.find((item) => item.module === module)?.children || [];
}
