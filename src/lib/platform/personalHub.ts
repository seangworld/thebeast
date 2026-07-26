import type { PlatformModule } from "./types";

export type PersonalHubSectionId =
  | "personal-information"
  | "household"
  | "family"
  | "emergency-contacts"
  | "notification-preferences"
  | "privacy"
  | "connected-modules"
  | "ai-preferences"
  | "communication-preferences"
  | "future-memory-settings";

export type PersonalHubSection = {
  id: PersonalHubSectionId;
  label: string;
  description: string;
  href: string;
  availability: "available" | "foundation";
};

export type PersonalHubModuleReference = {
  module: PlatformModule;
  reads: string[];
  owns: string[];
};

export const personalHubCanonicalRoute = "/dashboard/settings";
export const personalInformationCanonicalRoute =
  "/dashboard/settings/profile";

export const personalHubSections: PersonalHubSection[] = [
  {
    id: "personal-information",
    label: "Personal Information",
    description:
      "Shared identity, preferred name, location, timezone, and personal context.",
    href: personalInformationCanonicalRoute,
    availability: "available",
  },
  {
    id: "household",
    label: "Household",
    description:
      "Household membership, roles, and permissioned shared visibility.",
    href: `${personalHubCanonicalRoute}#household`,
    availability: "foundation",
  },
  {
    id: "family",
    label: "Family",
    description:
      "Family relationships and shared context owned by BeastOS.",
    href: `${personalHubCanonicalRoute}#family`,
    availability: "foundation",
  },
  {
    id: "emergency-contacts",
    label: "Emergency Contacts",
    description:
      "A reserved owner-controlled location for future emergency contact information.",
    href: `${personalHubCanonicalRoute}#emergency-contacts`,
    availability: "foundation",
  },
  {
    id: "notification-preferences",
    label: "Notification Preferences",
    description:
      "Shared notification channels, quiet hours, and module-level delivery choices.",
    href: `${personalHubCanonicalRoute}#notification-preferences`,
    availability: "foundation",
  },
  {
    id: "privacy",
    label: "Privacy",
    description:
      "Account-level privacy, export, deletion, and sharing boundaries.",
    href: `${personalHubCanonicalRoute}#privacy`,
    availability: "foundation",
  },
  {
    id: "connected-modules",
    label: "Connected Modules",
    description:
      "Which Beast modules may reference shared Personal Hub context.",
    href: `${personalHubCanonicalRoute}#connected-modules`,
    availability: "foundation",
  },
  {
    id: "ai-preferences",
    label: "AI Preferences",
    description:
      "Permissioned context and specialist preferences shared through BeastOS.",
    href: `${personalHubCanonicalRoute}#ai-preferences`,
    availability: "foundation",
  },
  {
    id: "communication-preferences",
    label: "Communication Preferences",
    description:
      "Reserved preferences for tone, detail, format, and preferred channels.",
    href: `${personalHubCanonicalRoute}#communication-preferences`,
    availability: "foundation",
  },
  {
    id: "future-memory-settings",
    label: "Future Memory Settings",
    description:
      "A reserved location for future correction, retention, export, and deletion controls.",
    href: `${personalHubCanonicalRoute}#future-memory-settings`,
    availability: "foundation",
  },
];

export const personalHubOwnershipRules = [
  "BeastOS is the single owner of shared member identity and platform-wide preferences.",
  "Modules reference permissioned Personal Hub data instead of creating duplicate shared profiles.",
  "Modules continue to own domain records such as debts, lessons, health history, and educational understanding.",
  "A shared profile change becomes available to every authorized module through the BeastOS profile contract.",
  "Authentication identity remains separate from editable Personal Hub information.",
];

export const personalHubModuleReferences: PersonalHubModuleReference[] = [
  {
    module: "money",
    reads: ["preferred name", "timezone", "communication preferences"],
    owns: ["financial accounts", "debts", "cashflow", "financial plans"],
  },
  {
    module: "learning",
    reads: ["preferred name", "timezone", "shared personal context"],
    owns: ["lessons", "roadmaps", "educational understanding", "certificates"],
  },
  {
    module: "health",
    reads: ["identity", "household permissions", "privacy preferences"],
    owns: ["health history", "conditions", "medications", "vitals"],
  },
  {
    module: "home",
    reads: ["household", "family permissions", "notification preferences"],
    owns: ["properties", "vehicles", "maintenance", "home records"],
  },
  {
    module: "goals",
    reads: ["identity", "connected modules", "communication preferences"],
    owns: ["goals", "milestones", "goal lifecycle"],
  },
  {
    module: "documents",
    reads: ["identity", "household permissions", "privacy preferences"],
    owns: ["documents", "uploads", "access grants", "retention metadata"],
  },
];

export function getPersonalHubSection(id: PersonalHubSectionId) {
  return personalHubSections.find((section) => section.id === id);
}

export function getPersonalHubReference(module: PlatformModule) {
  return personalHubModuleReferences.find(
    (reference) => reference.module === module
  );
}
