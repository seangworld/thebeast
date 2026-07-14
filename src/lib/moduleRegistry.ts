import type { ModuleKey } from "@/app/components/design/DashboardPrimitives";

export type BeastModuleIdentifier =
  | "beastos"
  | "money"
  | "learning"
  | "goals"
  | "documents"
  | "health"
  | "home"
  | "admin";

export type BeastModuleVisibility = "adminOnly" | "beta" | "released" | "disabled";
export type BeastModuleStatus = "active" | "foundation" | "planned" | "disabled";

export const MODULE_VISIBILITY_LABELS: Record<BeastModuleVisibility, string> = {
  adminOnly: "Admin Only",
  beta: "Beta",
  released: "Released",
  disabled: "Disabled",
};

export type BeastModuleRegistryEntry = {
  name: string;
  id: BeastModuleIdentifier;
  identifier: BeastModuleIdentifier;
  module: ModuleKey;
  version: string;
  status: BeastModuleStatus;
  visibility: BeastModuleVisibility;
  enabled: boolean;
  beta: boolean;
  ownerNotes: string;
  href?: string;
};

export const beastModuleRegistry: BeastModuleRegistryEntry[] = [
  {
    name: "BeastOS",
    id: "beastos",
    identifier: "beastos",
    module: "beastos",
    version: "v2.1",
    status: "active",
    visibility: "released",
    enabled: true,
    beta: false,
    ownerNotes: "Authenticated shell, Personal Hub, shared services, and platform ownership.",
    href: "/dashboard",
  },
  {
    name: "BeastMoney",
    id: "money",
    identifier: "money",
    module: "money",
    version: "v2.3.0",
    status: "active",
    visibility: "released",
    enabled: true,
    beta: false,
    ownerNotes: "Financial cockpit, cash flow, debts, forecasting, and Velocity planning.",
    href: "/dashboard/money",
  },
  {
    name: "BeastLearning",
    id: "learning",
    identifier: "learning",
    module: "learning",
    version: "v1.5 Private Beta",
    status: "active",
    visibility: "beta",
    enabled: true,
    beta: true,
    ownerNotes: "Mentor-first learning, Tutor sessions, curriculum, mastery, and diagnostics.",
    href: "/dashboard/learning",
  },
  {
    name: "BeastGoals",
    id: "goals",
    identifier: "goals",
    module: "goals",
    version: "shared",
    status: "foundation",
    visibility: "adminOnly",
    enabled: true,
    beta: false,
    ownerNotes: "Superseded standalone module; now shared BeastOS Personal Hub data.",
  },
  {
    name: "BeastDocuments",
    id: "documents",
    identifier: "documents",
    module: "documents",
    version: "shared",
    status: "foundation",
    visibility: "adminOnly",
    enabled: true,
    beta: false,
    ownerNotes: "Superseded standalone module; now shared BeastOS document infrastructure.",
  },
  {
    name: "BeastHealth",
    id: "health",
    identifier: "health",
    module: "health",
    version: "foundation",
    status: "foundation",
    visibility: "adminOnly",
    enabled: true,
    beta: true,
    ownerNotes: "Admin-only health workspace foundation with safety and privacy scope reserved.",
    href: "/dashboard/health",
  },
  {
    name: "BeastHome",
    id: "home",
    identifier: "home",
    module: "home",
    version: "planned",
    status: "planned",
    visibility: "adminOnly",
    enabled: true,
    beta: true,
    ownerNotes: "Future home workspace reserved for owner-approved implementation.",
  },
  {
    name: "BeastAdmin",
    id: "admin",
    identifier: "admin",
    module: "admin",
    version: "foundation",
    status: "foundation",
    visibility: "adminOnly",
    enabled: true,
    beta: false,
    ownerNotes: "Owner-only operational workspace for the Beast ecosystem.",
    href: "/dashboard/admin",
  },
];

export function getModuleRegistryEntry(identifier: BeastModuleIdentifier) {
  return beastModuleRegistry.find((entry) => entry.id === identifier);
}

export function isModuleVisibleForOwner(entry: BeastModuleRegistryEntry) {
  return entry.enabled && entry.visibility !== "disabled";
}

export function isModuleVisibleForMember(entry: BeastModuleRegistryEntry) {
  return entry.enabled && (entry.visibility === "released" || entry.visibility === "beta");
}

export function getVisibleModuleRegistryEntries({
  isOwner,
  registry = beastModuleRegistry,
}: {
  isOwner: boolean;
  registry?: BeastModuleRegistryEntry[];
}) {
  return registry.filter((entry) =>
    isOwner ? isModuleVisibleForOwner(entry) : isModuleVisibleForMember(entry)
  );
}

export function updateModuleVisibility(
  registry: BeastModuleRegistryEntry[],
  identifier: BeastModuleIdentifier,
  visibility: BeastModuleVisibility
) {
  return registry.map((entry) =>
    entry.id === identifier
      ? {
          ...entry,
          visibility,
          enabled: visibility !== "disabled",
          beta: visibility === "beta",
        }
      : entry
  );
}

export function getModuleVisibilityLabel(visibility: BeastModuleVisibility) {
  return MODULE_VISIBILITY_LABELS[visibility];
}
