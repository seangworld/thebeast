import {
  getVisibleModuleRegistryEntries,
  type BeastModuleIdentifier,
} from "./moduleRegistry";
import {
  beastAdminAccountKinds,
  normalizeMemberModuleAccessOverrides,
  type BeastAdminAccountKind,
  type BeastAdminMemberModuleAccessOverride,
} from "./beastAdminMemberEditing";

export const beastAdminMemberTimelineCategories = [
  "registration",
  "module",
  "conversation",
  "goals",
  "learning",
  "money",
  "health",
  "documents",
] as const;

export type BeastAdminMemberTimelineCategory =
  (typeof beastAdminMemberTimelineCategories)[number];

export const beastAdminMemberAccountStatuses = [
  "active",
  "invited",
  "suspended",
  "deleted",
] as const;

export type BeastAdminMemberAccountStatus =
  (typeof beastAdminMemberAccountStatuses)[number];

export const beastAdminMemberEmailVerificationStatuses = [
  "verified",
  "unverified",
  "not_provided",
] as const;

export type BeastAdminMemberEmailVerificationStatus =
  (typeof beastAdminMemberEmailVerificationStatuses)[number];

export type BeastAdminMemberModuleAccess = {
  id: BeastModuleIdentifier;
  label: string;
};

export type BeastAdminMemberBetaAssignment = {
  id: string;
  flagKey: string;
  name: string;
  stage: "internal_testing" | "beta";
  sourceScope: "member" | "role";
};

export type BeastAdminMemberDirectoryEntry = {
  id: string;
  displayName: string;
  email: string | null;
  emailVerificationStatus: BeastAdminMemberEmailVerificationStatus;
  pendingEmail?: string | null;
  emailChangeSentAt?: string | null;
  verifiedAt?: string | null;
  lastVerificationEmailSentAt?: string | null;
  accountStatus: BeastAdminMemberAccountStatus;
  accountKind: BeastAdminAccountKind;
  role: string;
  householdRole: string | null;
  enabledModules: BeastAdminMemberModuleAccess[];
  moduleAccessOverrides: BeastAdminMemberModuleAccessOverride[];
  betaAssignments: BeastAdminMemberBetaAssignment[];
  createdAt: string;
  profileCreatedAt: string | null;
  lastSignInAt: string | null;
  lastActivityAt: string | null;
  /** Compatibility alias for existing operational summaries. */
  registeredAt: string;
  eventCount: number;
};

export type BeastAdminMemberTimelineMember = {
  id: string;
  displayName: string;
  email: string | null;
  role: string;
  registeredAt: string;
};

export type BeastAdminMemberTimelineEvent = {
  id: string;
  occurredAt: string;
  category: BeastAdminMemberTimelineCategory;
  moduleId: string;
  title: string;
  detail: string;
};

export type BeastAdminMemberTimelineCoverage = {
  category: BeastAdminMemberTimelineCategory;
  state: "available" | "derived" | "partial";
  detail: string;
};

export type BeastAdminMemberTimelineSnapshot = {
  member: BeastAdminMemberTimelineMember;
  eventCount: number;
  hasMore: boolean;
  events: BeastAdminMemberTimelineEvent[];
  coverage: BeastAdminMemberTimelineCoverage[];
};

export const beastAdminMemberTimelineCategoryLabels: Record<
  BeastAdminMemberTimelineCategory,
  string
> = {
  registration: "Registration",
  module: "Module activations",
  conversation: "Conversations",
  goals: "Goals",
  learning: "Learning",
  money: "Money",
  health: "Health",
  documents: "Documents",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isDateString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

export function isBeastAdminMemberTimelineCategory(
  value: unknown
): value is BeastAdminMemberTimelineCategory {
  return beastAdminMemberTimelineCategories.includes(
    value as BeastAdminMemberTimelineCategory
  );
}

function normalizeMemberBase(
  value: unknown
): BeastAdminMemberTimelineMember | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.displayName !== "string" ||
    typeof value.role !== "string" ||
    !isDateString(value.registeredAt) ||
    (value.email !== null && typeof value.email !== "string")
  ) {
    return null;
  }

  return {
    id: value.id,
    displayName: value.displayName.trim() || "Not provided.",
    email: value.email,
    role: value.role,
    registeredAt: value.registeredAt,
  };
}

function isNullableDateString(value: unknown): value is string | null {
  return value === null || isDateString(value);
}

function normalizeBetaAssignments(
  value: unknown
): BeastAdminMemberBetaAssignment[] | null {
  if (!Array.isArray(value)) return null;

  const assignments = value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.flagKey !== "string" ||
      typeof entry.name !== "string" ||
      !["internal_testing", "beta"].includes(String(entry.stage)) ||
      !["member", "role"].includes(String(entry.sourceScope))
    ) {
      return [];
    }

    return [
      {
        id: entry.id,
        flagKey: entry.flagKey,
        name: entry.name,
        stage: entry.stage as BeastAdminMemberBetaAssignment["stage"],
        sourceScope:
          entry.sourceScope as BeastAdminMemberBetaAssignment["sourceScope"],
      },
    ];
  });

  return assignments.length === value.length ? assignments : null;
}

export function buildBeastAdminMemberModuleAccess(
  role: string,
  moduleAccessOverrides: BeastAdminMemberModuleAccessOverride[] = []
) {
  return getVisibleModuleRegistryEntries({
    isOwner: role === "admin",
    moduleAccess: moduleAccessOverrides,
  }).map((module) => ({
    id: module.identifier,
    label: module.name,
  }));
}

export function normalizeBeastAdminMemberDirectory(
  value: unknown
): BeastAdminMemberDirectoryEntry[] | null {
  if (!Array.isArray(value)) return null;

  const members = value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      (entry.displayName !== null && typeof entry.displayName !== "string") ||
      (entry.email !== null && typeof entry.email !== "string") ||
      !beastAdminMemberEmailVerificationStatuses.includes(
        entry.emailVerificationStatus as BeastAdminMemberEmailVerificationStatus
      ) ||
      !beastAdminMemberAccountStatuses.includes(
        entry.accountStatus as BeastAdminMemberAccountStatus
      ) ||
      !beastAdminAccountKinds.includes(entry.accountKind as BeastAdminAccountKind) ||
      (entry.role !== null && typeof entry.role !== "string") ||
      (entry.householdRole !== null &&
        typeof entry.householdRole !== "string") ||
      !isDateString(entry.createdAt) ||
      !isNullableDateString(entry.profileCreatedAt) ||
      !isNullableDateString(entry.lastSignInAt) ||
      !isNullableDateString(entry.lastActivityAt) ||
      !isNonNegativeNumber(entry.eventCount)
    ) {
      return [];
    }

    const betaAssignments = normalizeBetaAssignments(entry.betaAssignments);
    const moduleAccessOverrides = normalizeMemberModuleAccessOverrides(
      entry.moduleAccessOverrides
    );
    if (!betaAssignments || !moduleAccessOverrides) return [];

    const role =
      typeof entry.role === "string" && entry.role.trim()
        ? entry.role.trim()
        : "Not provided.";

    return [
      {
        id: entry.id,
        displayName:
          typeof entry.displayName === "string" && entry.displayName.trim()
            ? entry.displayName.trim()
            : "Not provided.",
        email: entry.email,
        emailVerificationStatus:
          entry.emailVerificationStatus as BeastAdminMemberEmailVerificationStatus,
        accountStatus:
          entry.accountStatus as BeastAdminMemberAccountStatus,
        accountKind: entry.accountKind as BeastAdminAccountKind,
        role,
        householdRole: entry.householdRole,
        enabledModules: buildBeastAdminMemberModuleAccess(
          role,
          moduleAccessOverrides
        ),
        moduleAccessOverrides,
        betaAssignments,
        createdAt: entry.createdAt,
        profileCreatedAt: entry.profileCreatedAt,
        lastSignInAt: entry.lastSignInAt,
        lastActivityAt: entry.lastActivityAt,
        registeredAt: entry.createdAt,
        eventCount: entry.eventCount,
      },
    ];
  });

  return members.length === value.length ? members : null;
}

export type BeastAdminMemberEmailStatus = {
  id: string;
  currentEmail: string | null;
  emailVerificationStatus: BeastAdminMemberEmailVerificationStatus;
  pendingEmail: string | null;
  emailChangeSentAt: string | null;
  verifiedAt: string | null;
  lastVerificationEmailSentAt: string | null;
};

export function normalizeBeastAdminMemberEmailStatuses(
  value: unknown
): BeastAdminMemberEmailStatus[] | null {
  if (!Array.isArray(value)) return null;

  const statuses = value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      (entry.currentEmail !== null && typeof entry.currentEmail !== "string") ||
      !beastAdminMemberEmailVerificationStatuses.includes(
        entry.emailVerificationStatus as BeastAdminMemberEmailVerificationStatus
      ) ||
      (entry.pendingEmail !== null && typeof entry.pendingEmail !== "string") ||
      !isNullableDateString(entry.emailChangeSentAt) ||
      !isNullableDateString(entry.verifiedAt ?? null) ||
      !isNullableDateString(entry.lastVerificationEmailSentAt ?? null)
    ) {
      return [];
    }

    return [
      {
        id: entry.id,
        currentEmail: entry.currentEmail,
        emailVerificationStatus:
          entry.emailVerificationStatus as BeastAdminMemberEmailVerificationStatus,
        pendingEmail: entry.pendingEmail,
        emailChangeSentAt: entry.emailChangeSentAt,
        verifiedAt:
          typeof entry.verifiedAt === "string" ? entry.verifiedAt : null,
        lastVerificationEmailSentAt:
          typeof entry.lastVerificationEmailSentAt === "string"
            ? entry.lastVerificationEmailSentAt
            : null,
      },
    ];
  });

  return statuses.length === value.length ? statuses : null;
}

export function mergeBeastAdminMemberEmailStatuses(
  members: BeastAdminMemberDirectoryEntry[],
  statuses: BeastAdminMemberEmailStatus[]
) {
  const statusesByMember = new Map(
    statuses.map((status) => [status.id, status])
  );

  return members.map((member) => {
    const status = statusesByMember.get(member.id);
    if (!status) return member;

    return {
      ...member,
      email: status.currentEmail,
      emailVerificationStatus: status.emailVerificationStatus,
      pendingEmail: status.pendingEmail,
      emailChangeSentAt: status.emailChangeSentAt,
      verifiedAt: status.verifiedAt,
      lastVerificationEmailSentAt:
        status.lastVerificationEmailSentAt,
    };
  });
}

export type BeastAdminMemberDirectoryFilters = {
  query: string;
  role: string;
  accountStatus: BeastAdminMemberAccountStatus | "all";
  betaStatus: "all" | "assigned" | "not_assigned";
  moduleId: BeastModuleIdentifier | "all";
};

export function filterBeastAdminMemberDirectory(
  members: BeastAdminMemberDirectoryEntry[],
  filters: BeastAdminMemberDirectoryFilters
) {
  const query = filters.query.trim().toLocaleLowerCase();

  return members.filter((member) => {
    const matchesQuery =
      !query ||
      [
        member.displayName,
        member.email || "",
        member.pendingEmail || "",
        member.role,
        member.accountStatus,
        ...member.betaAssignments.flatMap((assignment) => [
          assignment.name,
          assignment.flagKey,
        ]),
      ].some((value) => value.toLocaleLowerCase().includes(query));
    const matchesRole =
      filters.role === "all" || member.role === filters.role;
    const matchesAccountStatus =
      filters.accountStatus === "all" ||
      member.accountStatus === filters.accountStatus;
    const hasBetaAssignment = member.betaAssignments.length > 0;
    const matchesBetaStatus =
      filters.betaStatus === "all" ||
      (filters.betaStatus === "assigned" && hasBetaAssignment) ||
      (filters.betaStatus === "not_assigned" && !hasBetaAssignment);
    const matchesModule =
      filters.moduleId === "all" ||
      member.enabledModules.some((module) => module.id === filters.moduleId);

    return (
      matchesQuery &&
      matchesRole &&
      matchesAccountStatus &&
      matchesBetaStatus &&
      matchesModule
    );
  });
}

function normalizeTimelineEvents(
  value: unknown
): BeastAdminMemberTimelineEvent[] | null {
  if (!Array.isArray(value)) return null;

  const events = value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      !isDateString(entry.occurredAt) ||
      !isBeastAdminMemberTimelineCategory(entry.category) ||
      typeof entry.moduleId !== "string" ||
      typeof entry.title !== "string" ||
      typeof entry.detail !== "string"
    ) {
      return [];
    }

    return [
      {
        id: entry.id,
        occurredAt: entry.occurredAt,
        category: entry.category,
        moduleId: entry.moduleId,
        title:
          entry.category === "registration" ? "Profile created" : entry.title,
        detail:
          entry.category === "registration"
            ? "The owner-scoped public profile was created. This timestamp may differ from the authentication signup for a backfilled profile."
            : entry.detail,
      },
    ];
  });

  return events.length === value.length ? events : null;
}

function normalizeCoverage(
  value: unknown
): BeastAdminMemberTimelineCoverage[] | null {
  if (!Array.isArray(value)) return null;

  const coverage = value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      !isBeastAdminMemberTimelineCategory(entry.category) ||
      !["available", "derived", "partial"].includes(String(entry.state)) ||
      typeof entry.detail !== "string"
    ) {
      return [];
    }

    return [
      {
        category: entry.category,
        state: entry.state as BeastAdminMemberTimelineCoverage["state"],
        detail: entry.detail,
      },
    ];
  });

  return coverage.length === value.length ? coverage : null;
}

export function normalizeBeastAdminMemberTimeline(
  value: unknown
): BeastAdminMemberTimelineSnapshot | null {
  if (
    !isRecord(value) ||
    !isNonNegativeNumber(value.eventCount) ||
    typeof value.hasMore !== "boolean"
  ) {
    return null;
  }

  const member = normalizeMemberBase(value.member);
  const events = normalizeTimelineEvents(value.events);
  const coverage = normalizeCoverage(value.coverage);
  if (!member || !events || !coverage) return null;

  return {
    member,
    eventCount: value.eventCount,
    hasMore: value.hasMore,
    events,
    coverage,
  };
}

export function filterBeastAdminMemberTimelineEvents(
  events: BeastAdminMemberTimelineEvent[],
  category: BeastAdminMemberTimelineCategory | "all"
) {
  return category === "all"
    ? events
    : events.filter((event) => event.category === category);
}

export function buildBeastAdminMemberTimelineCounts(
  events: BeastAdminMemberTimelineEvent[]
) {
  return beastAdminMemberTimelineCategories.reduce<
    Record<BeastAdminMemberTimelineCategory, number>
  >(
    (counts, category) => {
      counts[category] = events.filter(
        (event) => event.category === category
      ).length;
      return counts;
    },
    {
      registration: 0,
      module: 0,
      conversation: 0,
      goals: 0,
      learning: 0,
      money: 0,
      health: 0,
      documents: 0,
    }
  );
}
