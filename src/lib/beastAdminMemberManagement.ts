import type {
  BeastAdminMemberAccountStatus,
  BeastAdminMemberDirectoryEntry,
  BeastAdminMemberEmailVerificationStatus,
} from "./beastAdminMemberTimeline";
import type { BeastModuleIdentifier } from "./moduleRegistry";

export const BEAST_ADMIN_MEMBER_USAGE_PERIOD_DAYS = 90;

export type BeastAdminMemberUsageSummary = {
  memberId: string;
  mostUsedModuleId: BeastModuleIdentifier;
  activityCount: number;
  latestActivityAt: string;
  periodDays: number;
};

export type BeastAdminManagedMember = BeastAdminMemberDirectoryEntry & {
  usageEvidenceState: "available" | "unavailable";
  mostUsedModuleId: BeastModuleIdentifier | null;
  mostUsedModuleActivityCount: number;
  usagePeriodDays: number;
};

export const beastAdminMemberSortKeys = [
  "displayName",
  "email",
  "emailVerification",
  "role",
  "accountStatus",
  "householdRole",
  "mostUsedModule",
  "lastSignIn",
  "lastActive",
  "joined",
] as const;

export type BeastAdminMemberSortKey =
  (typeof beastAdminMemberSortKeys)[number];
export type BeastAdminMemberSortDirection = "asc" | "desc";

export type BeastAdminMemberManagementFilters = {
  query: string;
  role: string;
  accountStatus: BeastAdminMemberAccountStatus | "all";
  emailVerification:
    | BeastAdminMemberEmailVerificationStatus
    | "all";
  moduleUsage: BeastModuleIdentifier | "insufficient" | "all";
  betaStatus: "all" | "assigned" | "not_assigned";
  lastActive:
    | "all"
    | "7_days"
    | "30_days"
    | "90_days"
    | "inactive_90_days"
    | "never";
};

const usageModuleLabels: Partial<Record<BeastModuleIdentifier, string>> = {
  beastos: "BeastOS",
  money: "BeastMoney",
  learning: "BeastEducation",
  goals: "BeastGoals",
  documents: "BeastDocuments",
  health: "BeastHealth",
  home: "BeastHome",
  admin: "BeastAdmin",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isUsageModuleId(value: unknown): value is BeastModuleIdentifier {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(usageModuleLabels, value)
  );
}

export function normalizeBeastAdminMemberUsageSummary(
  value: unknown
): BeastAdminMemberUsageSummary[] | null {
  if (!Array.isArray(value)) return null;

  const summaries = value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.memberId !== "string" ||
      !isUsageModuleId(entry.mostUsedModuleId) ||
      typeof entry.activityCount !== "number" ||
      !Number.isInteger(entry.activityCount) ||
      entry.activityCount <= 0 ||
      !isTimestamp(entry.latestActivityAt) ||
      typeof entry.periodDays !== "number" ||
      !Number.isInteger(entry.periodDays) ||
      entry.periodDays < 1 ||
      entry.periodDays > 365
    ) {
      return [];
    }

    return [
      {
        memberId: entry.memberId,
        mostUsedModuleId: entry.mostUsedModuleId,
        activityCount: entry.activityCount,
        latestActivityAt: entry.latestActivityAt,
        periodDays: entry.periodDays,
      },
    ];
  });

  return summaries.length === value.length ? summaries : null;
}

export function buildBeastAdminManagedMemberDirectory({
  members,
  usage,
  usageEvidenceAvailable,
  periodDays = BEAST_ADMIN_MEMBER_USAGE_PERIOD_DAYS,
}: {
  members: BeastAdminMemberDirectoryEntry[];
  usage: BeastAdminMemberUsageSummary[];
  usageEvidenceAvailable: boolean;
  periodDays?: number;
}): BeastAdminManagedMember[] {
  const usageByMember = new Map(
    usage.map((summary) => [summary.memberId, summary])
  );

  return members.map((member) => {
    const summary = usageByMember.get(member.id);
    return {
      ...member,
      usageEvidenceState: usageEvidenceAvailable
        ? "available"
        : "unavailable",
      mostUsedModuleId: summary?.mostUsedModuleId || null,
      mostUsedModuleActivityCount: summary?.activityCount || 0,
      usagePeriodDays: summary?.periodDays || periodDays,
    };
  });
}

export function getBeastAdminMostUsedModuleLabel(
  member: BeastAdminManagedMember
) {
  if (member.usageEvidenceState === "unavailable") {
    return "Usage unavailable";
  }
  if (!member.mostUsedModuleId) return "Not enough activity";
  return usageModuleLabels[member.mostUsedModuleId] || "Not enough activity";
}

export function filterBeastAdminManagedMembers(
  members: BeastAdminManagedMember[],
  filters: BeastAdminMemberManagementFilters,
  now = new Date()
) {
  const query = filters.query.trim().toLocaleLowerCase();
  const nowTime = now.getTime();
  const day = 24 * 60 * 60 * 1000;

  return members.filter((member) => {
    const lastActiveTime = member.lastActivityAt
      ? new Date(member.lastActivityAt).getTime()
      : null;
    const activeAge = lastActiveTime === null ? null : nowTime - lastActiveTime;
    const matchesQuery =
      !query ||
      [member.displayName, member.email || ""].some((value) =>
        value.toLocaleLowerCase().includes(query)
      );
    const matchesRole =
      filters.role === "all" || member.role === filters.role;
    const matchesAccount =
      filters.accountStatus === "all" ||
      member.accountStatus === filters.accountStatus;
    const matchesVerification =
      filters.emailVerification === "all" ||
      member.emailVerificationStatus === filters.emailVerification;
    const matchesModule =
      filters.moduleUsage === "all" ||
      (filters.moduleUsage === "insufficient"
        ? member.usageEvidenceState === "available" &&
          !member.mostUsedModuleId
        : member.usageEvidenceState === "available" &&
          member.mostUsedModuleId === filters.moduleUsage);
    const hasBeta = member.betaAssignments.length > 0;
    const matchesBeta =
      filters.betaStatus === "all" ||
      (filters.betaStatus === "assigned" && hasBeta) ||
      (filters.betaStatus === "not_assigned" && !hasBeta);
    const matchesLastActive =
      filters.lastActive === "all" ||
      (filters.lastActive === "never" && lastActiveTime === null) ||
      (filters.lastActive === "7_days" &&
        activeAge !== null &&
        activeAge <= 7 * day) ||
      (filters.lastActive === "30_days" &&
        activeAge !== null &&
        activeAge <= 30 * day) ||
      (filters.lastActive === "90_days" &&
        activeAge !== null &&
        activeAge <= 90 * day) ||
      (filters.lastActive === "inactive_90_days" &&
        (activeAge === null || activeAge > 90 * day));

    return (
      matchesQuery &&
      matchesRole &&
      matchesAccount &&
      matchesVerification &&
      matchesModule &&
      matchesBeta &&
      matchesLastActive
    );
  });
}

function compareNullable(
  left: string | null,
  right: string | null,
  direction: BeastAdminMemberSortDirection
) {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  const comparison = left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return direction === "asc" ? comparison : -comparison;
}

export function sortBeastAdminManagedMembers(
  members: BeastAdminManagedMember[],
  key: BeastAdminMemberSortKey,
  direction: BeastAdminMemberSortDirection
) {
  const value = (member: BeastAdminManagedMember): string | null => {
    switch (key) {
      case "displayName":
        return member.displayName;
      case "email":
        return member.email;
      case "emailVerification":
        return member.emailVerificationStatus;
      case "role":
        return member.role;
      case "accountStatus":
        return member.accountStatus;
      case "householdRole":
        return member.householdRole;
      case "mostUsedModule":
        return getBeastAdminMostUsedModuleLabel(member);
      case "lastSignIn":
        return member.lastSignInAt;
      case "lastActive":
        return member.lastActivityAt;
      case "joined":
        return member.createdAt;
    }
  };

  return [...members].sort(
    (left, right) =>
      compareNullable(value(left), value(right), direction) ||
      left.id.localeCompare(right.id)
  );
}

export function paginateBeastAdminManagedMembers<T>(
  members: T[],
  requestedPage: number,
  pageSize: number
) {
  const pageCount = Math.max(1, Math.ceil(members.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * pageSize;
  return {
    page,
    pageCount,
    pageSize,
    total: members.length,
    items: members.slice(start, start + pageSize),
  };
}
