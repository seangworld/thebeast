import type { ModuleKey } from "@/app/components/design/DashboardPrimitives";

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
  { label: "Today", href: "/dashboard", module: "beastos" },
];

export const platformNavigation: ModuleNavSection[] = [
  { label: "Calendar", href: "/dashboard/calendar", module: "calendar" },
  { label: "Notifications", href: "/dashboard/notifications", module: "notifications" },
  { label: "Timeline", href: "/dashboard/timeline", module: "timeline" },
  { label: "Search", href: "/dashboard/search", module: "search" },
];

export const beastMoneyNavigation: ModuleNavSection = {
  label: "Money",
  href: "/dashboard/money",
  module: "money",
  defaultExpanded: true,
  children: [
    { label: "Dashboard", href: "/dashboard/money" },
    { label: "Cash Flow", href: "/dashboard/money/cashflow" },
    { label: "Bills", href: "/dashboard/money/cashflow#bills" },
    { label: "Debts", href: "/dashboard/money/debts" },
    { label: "Payoff Plan", href: "/dashboard/money/debts#payoff-plan" },
    { label: "Velocity", href: "/dashboard/money/velocity" },
    { label: "Billing", href: "/dashboard/money/billing" },
    { label: "Settings", href: "/dashboard/money/settings" },
    { label: "Add Bill", href: "/dashboard/money/cashflow#add-bill", future: true },
    { label: "Add Debt", href: "/dashboard/money/debts#add-debt", future: true },
  ],
};

export const beastLearningNavigation: ModuleNavSection = {
  label: "Learning",
  href: "/dashboard/learning",
  module: "learning",
  defaultExpanded: true,
  children: [
    { label: "Today", href: "/dashboard/learning" },
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

export const beastModuleNavigation: ModuleNavSection[] = [
  beastLearningNavigation,
  { label: "Health", module: "health", comingSoon: true },
  { label: "Home", module: "home", comingSoon: true },
  { label: "Projects", module: "projects", comingSoon: true },
  { label: "Vehicles", module: "vehicles", comingSoon: true },
  { label: "Family", module: "family", comingSoon: true },
  { label: "Goals", module: "goals", comingSoon: true },
  { label: "Documents", module: "documents", comingSoon: true },
];

export const allModuleNavigation: ModuleNavSection[] = [
  ...primaryNavigation,
  beastMoneyNavigation,
  ...platformNavigation,
  ...beastModuleNavigation,
];

export function getModuleChildren(module: ModuleKey) {
  return allModuleNavigation.find((item) => item.module === module)?.children || [];
}
