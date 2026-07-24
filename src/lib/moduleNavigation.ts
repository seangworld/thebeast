import type { ModuleKey } from "@/app/components/design/DashboardPrimitives";
import {
  beastModuleRegistry,
  getVisibleModuleRegistryEntries,
  type BeastModuleRegistryEntry,
} from "./moduleRegistry";
import { beastMoneyCoreNavigation } from "./moneyNavigation";

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
  { label: "Today", href: "/dashboard/today", module: "beastos" },
  { label: "Personal Hub", href: "/dashboard/profile", module: "beastos" },
  { label: "Goals", href: "/dashboard/goals", module: "goals" },
  { label: "Documents", href: "/dashboard/uploads", module: "documents" },
  { label: "Calendar", href: "/dashboard/calendar", module: "calendar" },
  { label: "Timeline", href: "/dashboard/timeline", module: "timeline" },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    module: "notifications",
  },
  { label: "Search", href: "/dashboard/search", module: "search" },
];

export const beastOSNavigation: ModuleNavSection = {
  label: "BeastOS",
  href: "/dashboard/today",
  module: "beastos",
  defaultExpanded: true,
  children: primaryNavigation.map(({ label, href }) => ({
    label,
    href: href || "/dashboard/today",
  })),
};

export const beastMoneyNavigation: ModuleNavSection = {
  label: "BeastMoney",
  href: "/dashboard/money",
  module: "money",
  children: [...beastMoneyCoreNavigation],
};

export const beastLearningNavigation: ModuleNavSection = {
  label: "BeastEducation",
  href: "/dashboard/education",
  module: "learning",
  children: [
    { label: "Guidance Counselor", href: "/dashboard/education" },
    { label: "Learning Path", href: "/dashboard/education/learning-path" },
    { label: "Courses", href: "/dashboard/education/courses" },
    { label: "Lessons", href: "/dashboard/education/lessons" },
    { label: "Reviews", href: "/dashboard/education/reviews" },
    { label: "Achievements", href: "/dashboard/education/achievements" },
    { label: "History", href: "/dashboard/education/history" },
    { label: "Certificates", href: "/dashboard/education/certificates" },
    { label: "Reports", href: "/dashboard/education/reports" },
    { label: "Goals", href: "/dashboard/education/goals" },
    { label: "Feedback", href: "/dashboard/education#feedback" },
  ],
};

export const memberBeastEducationNavigation: ModuleNavSection = {
  label: "BeastEducation",
  href: "/dashboard/education",
  module: "learning",
  children: [
    { label: "Guidance Counselor", href: "/dashboard/education" },
    { label: "Learning Path", href: "/dashboard/education/learning-path" },
    { label: "Courses", href: "/dashboard/education/courses" },
    { label: "Lessons", href: "/dashboard/education/lessons" },
    { label: "Reviews", href: "/dashboard/education/reviews" },
    { label: "Achievements", href: "/dashboard/education/achievements" },
    { label: "History", href: "/dashboard/education/history" },
    { label: "Certificates", href: "/dashboard/education/certificates" },
    { label: "Reports", href: "/dashboard/education/reports" },
    { label: "Goals", href: "/dashboard/education/goals" },
  ],
};

export const memberBeastMoneyNavigation: ModuleNavSection = {
  ...beastMoneyNavigation,
  children: beastMoneyNavigation.children?.filter((item) => !item.future),
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
  health: {
    label: "BeastHealth",
    href: "/dashboard/health",
    module: "health",
    children: [
      { label: "Overview", href: "/dashboard/health" },
      { label: "Health Profile", href: "/dashboard/health/profile" },
      { label: "Conditions", href: "/dashboard/health/conditions" },
      { label: "Medications", href: "/dashboard/health/medications" },
      { label: "Procedures", href: "/dashboard/health/procedures" },
      { label: "Family History", href: "/dashboard/health/family-history" },
      { label: "Lifestyle", href: "/dashboard/health/lifestyle" },
      { label: "Vitals", href: "/dashboard/health/vitals" },
      { label: "Documents", href: "/dashboard/health/documents" },
      { label: "AI Advisor", href: "/dashboard/health/ai-advisor" },
    ],
  },
  goals: { label: "BeastGoals", module: "goals", comingSoon: true },
  home: {
    label: "BeastHome",
    href: "/dashboard/home",
    module: "home",
    children: [
      { label: "Overview", href: "/dashboard/home" },
      { label: "Home", href: "/dashboard/home/property" },
      { label: "Vehicles", href: "/dashboard/home/vehicles" },
      { label: "Maintenance", href: "/dashboard/home/maintenance" },
      { label: "Security", href: "/dashboard/home/security" },
      { label: "Documents", href: "/dashboard/home/documents" },
      { label: "Settings", href: "/dashboard/home/settings" },
    ],
  },
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

export function buildApplicationNavigationForPersona({
  isOwner,
  registry = beastModuleRegistry,
}: {
  isOwner: boolean;
  registry?: BeastModuleRegistryEntry[];
}) {
  return buildBeastModuleNavigationForPersona({ isOwner, registry }).filter(
    (item) =>
      item.module === "money" ||
      item.module === "learning" ||
      item.module === "health" ||
      item.module === "home"
  );
}

export function buildOwnerNavigationForPersona({
  isOwner,
  registry = beastModuleRegistry,
}: {
  isOwner: boolean;
  registry?: BeastModuleRegistryEntry[];
}) {
  return buildBeastModuleNavigationForPersona({ isOwner, registry }).filter(
    (item) => item.module === "admin"
  );
}

export const beastModuleNavigation: ModuleNavSection[] = [
  ...buildBeastModuleNavigationForPersona({ isOwner: true }),
  { label: "BeastProjects", module: "projects", comingSoon: true },
];

export const memberBeastModuleNavigation: ModuleNavSection[] =
  buildBeastModuleNavigationForPersona({ isOwner: false }).map((item) =>
    item.module === "money"
      ? memberBeastMoneyNavigation
      : item.module === "learning"
        ? memberBeastEducationNavigation
        : item
  );

export function getBeastModuleNavigationForPersona(isAdmin: boolean) {
  return isAdmin ? beastModuleNavigation : memberBeastModuleNavigation;
}

export const sharedNavigation: ModuleNavSection[] = [
  { label: "Goals", href: "/dashboard/goals", module: "goals" },
  { label: "Calendar", href: "/dashboard/calendar", module: "calendar" },
  { label: "Timeline", href: "/dashboard/timeline", module: "timeline" },
  { label: "Documents", href: "/dashboard/uploads", module: "documents" },
  { label: "Personal Hub", href: "/dashboard/profile", module: "beastos" },
  { label: "Settings", href: "/dashboard/settings", module: "beastos" },
];

export const allModuleNavigation: ModuleNavSection[] = [
  beastOSNavigation,
  ...beastModuleNavigation,
  ...sharedNavigation,
];

export function getModuleChildren(module: ModuleKey) {
  return allModuleNavigation.find((item) => item.module === module)?.children || [];
}
