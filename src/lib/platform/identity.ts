import type { PlatformModule } from "./types";

export const beastOSPlatformIdentity = {
  name: "BeastOS",
  role: "The operating system for the Beast ecosystem.",
  description:
    "One secure platform connects your identity, permissions, memory, shared services, and Beast applications.",
} as const;

export const beastOSApplications = [
  {
    id: "money",
    name: "Money",
    productName: "BeastMoney",
    href: "/dashboard/money",
    owner: "money",
  },
  {
    id: "education",
    name: "Education",
    productName: "BeastEducation",
    href: "/dashboard/education",
    owner: "learning",
  },
  {
    id: "health",
    name: "Health",
    productName: "BeastHealth",
    href: "/dashboard/health",
    owner: "health",
  },
  {
    id: "goals",
    name: "Goals",
    productName: "BeastGoals",
    href: "/dashboard/goals",
    owner: "beastos",
  },
  {
    id: "documents",
    name: "Documents",
    productName: "BeastDocuments",
    href: "/dashboard/uploads",
    owner: "beastos",
  },
  {
    id: "home",
    name: "Home",
    productName: "BeastHome",
    href: "/dashboard/home",
    owner: "home",
  },
  {
    id: "security",
    name: "Security",
    productName: "Security",
    href: "/dashboard/home/security",
    owner: "home",
  },
] as const;

export const beastOSSharedCapabilities = [
  "Authentication",
  "Identity",
  "Family",
  "Permissions",
  "Memory",
  "Search",
  "Timeline",
  "Notifications",
  "Professional collaboration",
] as const;

export const beastOSPlatformIdentityRules = [
  "BeastOS is the shared platform; it is never presented as a peer application.",
  "Money, Education, Health, Goals, Documents, Home, and Security are application experiences running on BeastOS.",
  "Authentication, identity, family, permissions, memory, search, timeline, notifications, and professional collaboration remain shared BeastOS capabilities.",
  "Applications keep their domain records and professional responsibilities while referencing authorized BeastOS context.",
] as const;

const workspaceContext: Record<PlatformModule, string> = {
  beastos: "The Beast platform",
  money: "Money application",
  learning: "Education application",
  health: "Health application",
  home: "Home application",
  projects: "Projects application",
  vehicles: "Vehicles application",
  goals: "Goals application",
  documents: "Documents application",
  family: "Family platform service",
  calendar: "Shared platform service",
  notifications: "Shared platform service",
  timeline: "Shared platform service",
  search: "Shared platform service",
  admin: "Platform administration",
};

export function getBeastOSWorkspaceContext(module: PlatformModule) {
  return workspaceContext[module];
}
