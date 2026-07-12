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
    { label: "Add Bill", href: "/dashboard/money/cashflow#add-bill", future: true },
    { label: "Add Debt", href: "/dashboard/money/debts#add-debt", future: true },
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
    { label: "Guide", href: "/dashboard/learning" },
    { label: "Continue", href: "/dashboard/learning/activities" },
    { label: "My Plan", href: "/dashboard/learning#learning-path" },
    { label: "How I'm Doing", href: "/dashboard/learning#progress" },
    { label: "Wins", href: "/dashboard/learning#achievements" },
  ],
};

export const memberBeastMoneyNavigation: ModuleNavSection = {
  ...beastMoneyNavigation,
  children: beastMoneyNavigation.children?.filter(
    (item) => item.label !== "Billing"
  ),
};

export const beastModuleNavigation: ModuleNavSection[] = [
  beastMoneyNavigation,
  beastLearningNavigation,
  { label: "BeastHealth", module: "health", comingSoon: true },
  { label: "BeastProjects", module: "projects", comingSoon: true },
  { label: "BeastGoals", module: "goals", comingSoon: true },
  { label: "BeastHome", module: "home", comingSoon: true },
  { label: "BeastDocuments", module: "documents", comingSoon: true },
];

export const memberBeastModuleNavigation: ModuleNavSection[] = [
  memberBeastMoneyNavigation,
  memberBeastLearningNavigation,
  { label: "BeastHealth", module: "health", comingSoon: true },
  { label: "BeastProjects", module: "projects", comingSoon: true },
  { label: "BeastGoals", module: "goals", comingSoon: true },
  { label: "BeastHome", module: "home", comingSoon: true },
  { label: "BeastDocuments", module: "documents", comingSoon: true },
];

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
