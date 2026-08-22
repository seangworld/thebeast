import type { ModuleKey } from "@/app/components/design/DashboardPrimitives";
import {
  beastModuleRegistry,
  getVisibleModuleRegistryEntries,
  type BeastMemberModuleAccessOverride,
  type BeastModuleRegistryEntry,
} from "./moduleRegistry";
import { beastMoneyCoreNavigation } from "./moneyNavigation";

export type ModuleChildNavItem = {
  label: string;
  href: string;
  parent?: string;
  group?: string;
  future?: boolean;
  secondary?: boolean;
};

export type ModuleNavSection = {
  label: string;
  href?: string;
  module: ModuleKey;
  group?: string;
  external?: boolean;
  icon?: string;
  comingSoon?: boolean;
  defaultExpanded?: boolean;
  children?: ModuleChildNavItem[];
};

function matchesNavigationPath(pathname: string, href?: string) {
  if (!href || !href.startsWith("/")) return false;

  const [path] = href.split("#");
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function findActiveExpandableModule(
  pathname: string,
  sections: ModuleNavSection[]
): ModuleKey | null {
  const matchingSection = sections
    .filter((section) => section.children?.length)
    .flatMap((section) => {
      const matchingPaths = [
        section.href,
        ...(section.children?.map((child) => child.href) || []),
      ]
        .filter((href) => matchesNavigationPath(pathname, href))
        .map((href) => href?.split("#")[0].length || 0);

      return matchingPaths.length > 0
        ? [{ module: section.module, matchLength: Math.max(...matchingPaths) }]
        : [];
    })
    .sort((left, right) => right.matchLength - left.matchLength)[0];

  return matchingSection?.module || null;
}

export function toggleExpandedModule(
  current: ModuleKey | null,
  requested: ModuleKey
): ModuleKey | null {
  return current === requested ? null : requested;
}

export const primaryNavigation: ModuleNavSection[] = [
  {
    label: "Dashboard",
    href: "/dashboard/today",
    module: "beastos",
    group: "Daily",
  },
  {
    label: "Calendar",
    href: "/dashboard/calendar",
    module: "calendar",
    group: "Daily",
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    module: "notifications",
    group: "Daily",
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
    module: "beastos",
    group: "Daily",
  },
  {
    label: "Timeline",
    href: "/dashboard/timeline",
    module: "timeline",
    group: "Daily",
  },
  {
    label: "Personal Hub",
    href: "/dashboard/settings",
    module: "beastos",
    group: "Personal",
  },
  {
    label: "Search",
    href: "/dashboard/search",
    module: "search",
    group: "Personal",
  },
];

export const beastOSNavigation: ModuleNavSection = {
  label: "BeastOS",
  href: "/dashboard/today",
  module: "beastos",
  defaultExpanded: true,
  children: primaryNavigation.map(({ label, href, group }) => ({
    label,
    href: href || "/dashboard/today",
    group,
  })),
};

export const secondaryNavigation: ModuleNavSection[] = [
  {
    label: "Relationship Center",
    href: "/dashboard/relationships",
    module: "beastos",
  },
  {
    label: "Director",
    href: "/dashboard/director",
    module: "beastos",
  },
  {
    label: "Digital Staff",
    href: "/dashboard/digital-staff",
    module: "beastos",
  },
];

export const beastMoneyNavigation: ModuleNavSection = {
  label: "BeastMoney",
  href: "/dashboard/money/dashboard",
  module: "money",
  children: [...beastMoneyCoreNavigation],
};

export const beastLearningNavigation: ModuleNavSection = {
  label: "BeastEducation",
  href: "/dashboard/education",
  module: "learning",
  children: [
    { label: "Dashboard", href: "/dashboard/education" },
    {
      label: "Guidance Counselor",
      href: "/dashboard/education/guidance-counselor",
    },
    { label: "About You", href: "/dashboard/education/about-you" },
    { label: "Education Planning", href: "/dashboard/education/education-planning", group: "Planning" },
    { label: "Career Planning", href: "/dashboard/education/career-planning", group: "Planning" },
    { label: "Education Goals", href: "/dashboard/education/goals", group: "Planning" },
    { label: "Schools", href: "/dashboard/education/schools", group: "Research" },
    { label: "Certifications", href: "/dashboard/education/certifications", group: "Research" },
    { label: "Scholarships", href: "/dashboard/education/scholarships", group: "Research" },
    { label: "Education Documents", href: "/dashboard/education/documents" },
    { label: "Progress & Decisions", href: "/dashboard/education/progress" },
  ],
};

export const memberBeastEducationNavigation: ModuleNavSection = {
  label: "BeastEducation",
  href: "/dashboard/education",
  module: "learning",
  children: [
    { label: "Dashboard", href: "/dashboard/education" },
    {
      label: "Guidance Counselor",
      href: "/dashboard/education/guidance-counselor",
    },
    { label: "About You", href: "/dashboard/education/about-you" },
    { label: "Education Planning", href: "/dashboard/education/education-planning", group: "Planning" },
    { label: "Career Planning", href: "/dashboard/education/career-planning", group: "Planning" },
    { label: "Education Goals", href: "/dashboard/education/goals", group: "Planning" },
    { label: "Schools", href: "/dashboard/education/schools", group: "Research" },
    { label: "Certifications", href: "/dashboard/education/certifications", group: "Research" },
    { label: "Scholarships", href: "/dashboard/education/scholarships", group: "Research" },
    { label: "Education Documents", href: "/dashboard/education/documents" },
    { label: "Progress & Decisions", href: "/dashboard/education/progress" },
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
    { label: "CEO Mode", href: "/dashboard/admin", group: "Operations" },
    {
      label: "Development Console",
      href: "/dashboard/admin/development",
      group: "Operations",
    },
    {
      label: "Platform Health",
      href: "/dashboard/admin/platform-health",
      group: "Operations",
    },
    {
      label: "Migration Status",
      href: "/dashboard/admin/migrations",
      group: "Delivery",
    },
    {
      label: "SQL Explorer",
      href: "/dashboard/admin/migrations/explorer",
      group: "Delivery",
    },
    {
      label: "Release Center",
      href: "/dashboard/admin/releases",
      group: "Delivery",
    },
    {
      label: "Digital Professional History",
      href: "/dashboard/admin/execution-history",
      group: "Delivery",
    },
    { label: "Roadmap", href: "/dashboard/admin/roadmap", group: "Delivery" },
    {
      label: "Executive Metrics",
      href: "/dashboard/admin/metrics",
      group: "Insights",
    },
    {
      label: "AI Analytics",
      href: "/dashboard/admin/analytics",
      group: "Insights",
    },
    {
      label: "SEANGWORLD Intelligence",
      href: "/dashboard/admin/intelligence",
      group: "Insights",
    },
    {
      label: "BeastHunter",
      href: "/dashboard/admin/intelligence/hunter",
      group: "Insights",
    },
    {
      label: "Knowledge Inspector",
      href: "/dashboard/admin/knowledge",
      group: "Insights",
    },
    {
      label: "Ecosystem Map",
      href: "/dashboard/admin/ecosystem",
      group: "Insights",
    },
    { label: "Members", href: "/dashboard/admin/members", group: "Members" },
    {
      label: "Member Messages",
      href: "/dashboard/admin/messages",
      group: "Members",
    },
    {
      label: "Beta Feedback",
      href: "/dashboard/admin/feedback",
      group: "Members",
    },
    { label: "Modules", href: "/dashboard/admin/modules", group: "Governance" },
    {
      label: "Feature Flags",
      href: "/dashboard/admin/flags",
      group: "Governance",
    },
    {
      label: "Prompt Library",
      href: "/dashboard/admin/prompt-library",
      group: "Governance",
    },
    {
      label: "Planned Workspaces",
      href: "/dashboard/admin/planned-workspaces",
      group: "Governance",
    },
    {
      label: "Revenue",
      href: "/dashboard/admin/ads",
      group: "Insights",
    },
    {
      label: "Settings",
      href: "/dashboard/admin/settings",
      group: "Governance",
    },
  ],
};

export const beastSecurityNavigation: ModuleNavSection = {
  label: "BeastSecurity",
  module: "projects",
  comingSoon: true,
};

const plannedModuleNavigation: Record<string, ModuleNavSection> = {
  health: {
    label: "BeastHealth",
    href: "/dashboard/health",
    module: "health",
    children: [
      { label: "Overview", href: "/dashboard/health" },
      { label: "Health Advisor", href: "/dashboard/health/ai-advisor" },
      { label: "Health Profile", href: "/dashboard/health/profile", group: "Health records" },
      { label: "Conditions", href: "/dashboard/health/conditions", group: "Health records" },
      { label: "Medications", href: "/dashboard/health/medications", group: "Health records" },
      { label: "Procedures", href: "/dashboard/health/procedures", group: "Health records" },
      { label: "Family History", href: "/dashboard/health/family-history", group: "Health records" },
      { label: "Lifestyle", href: "/dashboard/health/lifestyle", group: "Health records" },
      { label: "Health Measurements", href: "/dashboard/health/vitals", group: "Health records" },
      { label: "Health Goals", href: "/dashboard/health/goals", group: "Planning" },
      { label: "Health Documents", href: "/dashboard/health/documents", group: "Health records" },
      { label: "Providers", href: "/dashboard/health/provider-directory", group: "Health records" },
      { label: "Appointments", href: "/dashboard/health/appointments", group: "Health records" },
      { label: "Timeline", href: "/dashboard/health/timeline", group: "Health records" },
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
      { label: "Home Goals", href: "/dashboard/home/goals" },
      { label: "Home Documents", href: "/dashboard/home/documents" },
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
  moduleAccess = [],
}: {
  isOwner: boolean;
  registry?: BeastModuleRegistryEntry[];
  moduleAccess?: BeastMemberModuleAccessOverride[];
}) {
  return getVisibleModuleRegistryEntries({ isOwner, registry, moduleAccess })
    .map(navigationFromRegistryEntry)
    .filter(Boolean) as ModuleNavSection[];
}

export function buildApplicationNavigationForPersona({
  isOwner,
  registry = beastModuleRegistry,
  moduleAccess = [],
}: {
  isOwner: boolean;
  registry?: BeastModuleRegistryEntry[];
  moduleAccess?: BeastMemberModuleAccessOverride[];
}) {
  return buildBeastModuleNavigationForPersona({
    isOwner,
    registry,
    moduleAccess,
  }).filter(
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
  if (!isOwner) return [];

  const ownerModules = buildBeastModuleNavigationForPersona({ isOwner, registry }).filter(
    (item) => item.module === "admin"
  );

  return ownerModules.filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate.label === item.label) === index
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

export function getBeastModuleNavigationForPersona(
  isAdmin: boolean,
  moduleAccess: BeastMemberModuleAccessOverride[] = []
) {
  if (isAdmin) return beastModuleNavigation;

  return buildBeastModuleNavigationForPersona({
    isOwner: false,
    moduleAccess,
  }).map((item) =>
    item.module === "money"
      ? memberBeastMoneyNavigation
      : item.module === "learning"
        ? memberBeastEducationNavigation
        : item
  );
}

export const sharedNavigation: ModuleNavSection[] = [
  {
    label: "Documents",
    href: "/dashboard/uploads",
    module: "documents",
  },
  { label: "Goals", href: "/dashboard/goals", module: "goals" },
];

export const allModuleNavigation: ModuleNavSection[] = [
  beastOSNavigation,
  ...beastModuleNavigation,
  ...sharedNavigation,
];

export function getModuleChildren(module: ModuleKey) {
  return allModuleNavigation.find((item) => item.module === module)?.children || [];
}
