import {
  buildBetaAssignmentRows,
  type BeastAdminBetaAssignment,
  type BeastAdminFeedbackItem,
  type BeastAdminMember,
} from "./beastAdmin";
import { versionManifest } from "./appVersion";
import {
  beastModuleRegistry,
  type BeastModuleRegistryEntry,
  type BeastModuleStatus,
} from "./moduleRegistry";

export type BeastAdminTelemetryState = "connected" | "not-connected";

export type BeastAdminTelemetrySource = {
  label: string;
  state: BeastAdminTelemetryState;
  value: string;
  detail: string;
};

export type BeastAdminReleaseIdentity = {
  name: string;
  version: string;
  buildId: string;
  channel: string;
  releaseDate: string | null;
};

export type BeastAdminExecutiveSnapshot = {
  platformHealth: {
    label: "Visible" | "Visibility incomplete" | "Action required";
    tone: "green" | "yellow" | "red";
    summary: string;
    enabledModules: number;
    registeredModules: number;
    observabilityGaps: string[];
  };
  members: {
    total: number;
    active: number;
    invited: number;
    paused: number;
    betaRoleMembers: number;
    sourceLabel: string;
  };
  modules: {
    enabled: number;
    beta: number;
    byStatus: Record<BeastModuleStatus, number>;
    entries: BeastModuleRegistryEntry[];
  };
  aiUsage: BeastAdminTelemetrySource;
  errors: BeastAdminTelemetrySource;
  recentReleases: BeastAdminReleaseIdentity[];
  featureProgress: {
    operating: BeastModuleRegistryEntry[];
    foundations: BeastModuleRegistryEntry[];
    planned: BeastModuleRegistryEntry[];
    disabled: BeastModuleRegistryEntry[];
  };
  betaActivity: {
    assignedMembers: number;
    assignments: ReturnType<typeof buildBetaAssignmentRows>;
    openFeedback: BeastAdminFeedbackItem[];
  };
};

export const beastAdminTelemetry = {
  aiUsage: {
    label: "AI Usage",
    state: "not-connected",
    value: "Not measured",
    detail:
      "No centralized provider-usage or token telemetry feed is connected to BeastAdmin. This must not be interpreted as zero usage.",
  },
  errors: {
    label: "Errors",
    state: "not-connected",
    value: "Not measured",
    detail:
      "No centralized runtime error feed is connected to BeastAdmin. Platform health cannot be confirmed from the absence of reported errors.",
  },
} satisfies Record<"aiUsage" | "errors", BeastAdminTelemetrySource>;

function buildStatusCounts(modules: BeastModuleRegistryEntry[]) {
  return modules.reduce<Record<BeastModuleStatus, number>>(
    (counts, module) => {
      counts[module.status] += 1;
      return counts;
    },
    {
      active: 0,
      foundation: 0,
      planned: 0,
      disabled: 0,
    }
  );
}

export function buildRecentBeastReleases({
  identities = Object.values(versionManifest) as BeastAdminReleaseIdentity[],
  limit = 5,
}: {
  identities?: BeastAdminReleaseIdentity[];
  limit?: number;
} = {}) {
  return identities
    .filter(
      (identity): identity is BeastAdminReleaseIdentity & { releaseDate: string } =>
        Boolean(identity.releaseDate)
    )
    .sort(
      (left, right) =>
        right.releaseDate.localeCompare(left.releaseDate) ||
        left.name.localeCompare(right.name)
    )
    .slice(0, Math.max(0, limit));
}

export function buildBeastAdminExecutiveSnapshot({
  members = [],
  modules = beastModuleRegistry,
  betaAssignments = [],
  feedbackItems = [],
  aiUsage = beastAdminTelemetry.aiUsage,
  errors = beastAdminTelemetry.errors,
  releases = buildRecentBeastReleases(),
}: {
  members?: BeastAdminMember[];
  modules?: BeastModuleRegistryEntry[];
  betaAssignments?: BeastAdminBetaAssignment[];
  feedbackItems?: BeastAdminFeedbackItem[];
  aiUsage?: BeastAdminTelemetrySource;
  errors?: BeastAdminTelemetrySource;
  releases?: BeastAdminReleaseIdentity[];
} = {}): BeastAdminExecutiveSnapshot {
  const enabledModules = modules.filter((module) => module.enabled);
  const disabledModules = modules.filter(
    (module) => !module.enabled || module.status === "disabled"
  );
  const observabilityGaps = [aiUsage, errors]
    .filter((source) => source.state !== "connected")
    .map((source) => source.label);
  const statusCounts = buildStatusCounts(modules);
  const hasDisabledOperatingModule = disabledModules.some(
    (module) => module.visibility === "released" || module.visibility === "beta"
  );
  const platformHealth = hasDisabledOperatingModule
    ? {
        label: "Action required" as const,
        tone: "red" as const,
        summary:
          "At least one released or beta module is disabled. Review Module Status before relying on the platform.",
      }
    : observabilityGaps.length
      ? {
          label: "Visibility incomplete" as const,
          tone: "yellow" as const,
          summary:
            "All registered modules are enabled, but runtime health cannot be confirmed until AI usage and error telemetry are connected.",
        }
      : {
          label: "Visible" as const,
          tone: "green" as const,
          summary:
            "All registered modules are enabled and the configured operational telemetry feeds are connected.",
        };

  return {
    platformHealth: {
      ...platformHealth,
      enabledModules: enabledModules.length,
      registeredModules: modules.length,
      observabilityGaps,
    },
    members: {
      total: members.length,
      active: members.filter((member) => member.status === "Active").length,
      invited: members.filter((member) => member.status === "Invited").length,
      paused: members.filter((member) => member.status === "Paused").length,
      betaRoleMembers: members.filter((member) => member.role === "Beta").length,
      sourceLabel:
        members.length > 0
          ? "Caller-supplied member evidence"
          : "No live member source supplied",
    },
    modules: {
      enabled: enabledModules.length,
      beta: modules.filter((module) => module.beta).length,
      byStatus: statusCounts,
      entries: modules,
    },
    aiUsage,
    errors,
    recentReleases: releases,
    featureProgress: {
      operating: modules.filter((module) => module.status === "active"),
      foundations: modules.filter((module) => module.status === "foundation"),
      planned: modules.filter((module) => module.status === "planned"),
      disabled: disabledModules,
    },
    betaActivity: {
      assignedMembers: new Set(
        betaAssignments.map((assignment) => assignment.memberId)
      ).size,
      assignments: buildBetaAssignmentRows({ members, assignments: betaAssignments }),
      openFeedback: feedbackItems
        .filter(
          (item) => item.status !== "Released" && item.status !== "Declined"
        )
        .sort(
          (left, right) =>
            right.date.localeCompare(left.date) || left.id.localeCompare(right.id)
        ),
    },
  };
}
