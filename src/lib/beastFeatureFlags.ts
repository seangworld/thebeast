import {
  USER_ROLES,
  normalizeRole,
  type UserRole,
} from "./entitlements";
import {
  beastModuleRegistry,
  type BeastModuleIdentifier,
} from "./moduleRegistry";

export const beastFeatureFlagStages = [
  "hidden",
  "owner",
  "internal_testing",
  "beta",
  "released",
  "deprecated",
] as const;

export type BeastFeatureFlagStage = (typeof beastFeatureFlagStages)[number];

export const beastFeatureFlagStageLabels: Record<
  BeastFeatureFlagStage,
  string
> = {
  hidden: "Hidden",
  owner: "Owner",
  internal_testing: "Internal Testing",
  beta: "Beta",
  released: "Released",
  deprecated: "Deprecated",
};

export const beastFeatureFlagScopeTypes = [
  "module",
  "role",
  "member",
] as const;

export type BeastFeatureFlagScopeType =
  (typeof beastFeatureFlagScopeTypes)[number];

export type BeastFeatureFlagAssignment = {
  id: string;
  scopeType: BeastFeatureFlagScopeType;
  stage: BeastFeatureFlagStage;
  moduleId: BeastModuleIdentifier | null;
  roleName: UserRole | null;
  memberId: string | null;
  memberName: string | null;
  memberEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BeastFeatureFlag = {
  id: string;
  key: string;
  name: string;
  description: string;
  assignments: BeastFeatureFlagAssignment[];
  createdAt: string;
  updatedAt: string;
};

export type BeastFeatureFlagMember = {
  id: string;
  displayName: string;
  email: string | null;
  role: UserRole;
};

export type BeastFeatureFlagResolution = {
  flagKey: string;
  stage: BeastFeatureFlagStage;
  visible: boolean;
  deprecated: boolean;
  sourceScope: BeastFeatureFlagScopeType | "default";
  sourceId: string | null;
  reason: string;
};

export const beastFeatureFlagRules = [
  "Member assignments override role assignments, and role assignments override module assignments.",
  "Missing assignments resolve Hidden so unfinished work is never exposed by accident.",
  "Hidden remains unavailable to every audience, including owners.",
  "Owner is visible only to the admin role.",
  "Internal Testing is visible to explicitly assigned members or roles; a module fallback is owner-only.",
  "Beta module fallbacks are visible to beta and admin roles; explicit member or role assignments may opt in another audience.",
  "Released and Deprecated remain visible, while Deprecated tells the consuming feature to present replacement or retirement guidance.",
] as const;

const moduleIds = beastModuleRegistry.map((module) => module.id);

export function isBeastFeatureFlagStage(
  value: unknown
): value is BeastFeatureFlagStage {
  return beastFeatureFlagStages.includes(value as BeastFeatureFlagStage);
}

export function isBeastFeatureFlagScopeType(
  value: unknown
): value is BeastFeatureFlagScopeType {
  return beastFeatureFlagScopeTypes.includes(
    value as BeastFeatureFlagScopeType
  );
}

export function isBeastFeatureFlagModuleId(
  value: unknown
): value is BeastModuleIdentifier {
  return moduleIds.includes(value as BeastModuleIdentifier);
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function normalizeAssignment(
  value: unknown
): BeastFeatureFlagAssignment | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  if (
    typeof record.id !== "string" ||
    !isBeastFeatureFlagScopeType(record.scopeType) ||
    !isBeastFeatureFlagStage(record.stage) ||
    (record.moduleId !== null &&
      !isBeastFeatureFlagModuleId(record.moduleId)) ||
    (record.roleName !== null &&
      !USER_ROLES.includes(record.roleName as UserRole)) ||
    (record.memberId !== null && typeof record.memberId !== "string") ||
    (record.memberName !== null && typeof record.memberName !== "string") ||
    (record.memberEmail !== null && typeof record.memberEmail !== "string") ||
    !isTimestamp(record.createdAt) ||
    !isTimestamp(record.updatedAt)
  ) {
    return null;
  }

  const targetCount = [
    record.moduleId !== null,
    record.roleName !== null,
    record.memberId !== null,
  ].filter(Boolean).length;
  if (targetCount !== 1) return null;
  if (record.scopeType === "module" && record.moduleId === null) return null;
  if (record.scopeType === "role" && record.roleName === null) return null;
  if (record.scopeType === "member" && record.memberId === null) return null;

  return {
    id: record.id,
    scopeType: record.scopeType,
    stage: record.stage,
    moduleId: record.moduleId as BeastModuleIdentifier | null,
    roleName: record.roleName as UserRole | null,
    memberId: record.memberId as string | null,
    memberName:
      typeof record.memberName === "string"
        ? record.memberName.trim() || "Member"
        : null,
    memberEmail: record.memberEmail as string | null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function normalizeBeastFeatureFlags(
  value: unknown
): BeastFeatureFlag[] | null {
  if (!Array.isArray(value)) return null;

  const flags = value.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      typeof record.key !== "string" ||
      !/^[a-z][a-z0-9_.-]{2,79}$/.test(record.key) ||
      typeof record.name !== "string" ||
      !record.name.trim() ||
      typeof record.description !== "string" ||
      !Array.isArray(record.assignments) ||
      !isTimestamp(record.createdAt) ||
      !isTimestamp(record.updatedAt)
    ) {
      return null;
    }

    const assignments = record.assignments.map(normalizeAssignment);
    if (
      !assignments.every(
        (assignment): assignment is BeastFeatureFlagAssignment =>
          Boolean(assignment)
      )
    ) {
      return null;
    }

    return {
      id: record.id,
      key: record.key,
      name: record.name.trim(),
      description: record.description.trim(),
      assignments,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  });

  return flags.every((flag): flag is BeastFeatureFlag => Boolean(flag))
    ? flags
    : null;
}

export function normalizeBeastFeatureFlagMembers(
  value: unknown
): BeastFeatureFlagMember[] | null {
  if (!Array.isArray(value)) return null;

  const members = value.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const record = entry as Record<string, unknown>;
    if (
      typeof record.id !== "string" ||
      typeof record.displayName !== "string" ||
      !record.displayName.trim() ||
      (record.email !== null && typeof record.email !== "string") ||
      !USER_ROLES.includes(record.role as UserRole)
    ) {
      return null;
    }

    return {
      id: record.id,
      displayName: record.displayName.trim(),
      email: record.email as string | null,
      role: record.role as UserRole,
    };
  });

  return members.every(
    (member): member is BeastFeatureFlagMember => Boolean(member)
  )
    ? members
    : null;
}

function assignmentVisible({
  assignment,
  role,
}: {
  assignment: BeastFeatureFlagAssignment;
  role: UserRole;
}) {
  if (assignment.stage === "hidden") return false;
  if (assignment.stage === "owner") return role === "admin";
  if (
    assignment.stage === "released" ||
    assignment.stage === "deprecated"
  ) {
    return true;
  }
  if (assignment.scopeType === "member" || assignment.scopeType === "role") {
    return true;
  }
  if (assignment.stage === "internal_testing") return role === "admin";
  return role === "admin" || role === "beta";
}

export function resolveBeastFeatureFlag({
  flag,
  moduleId,
  memberId,
  role,
}: {
  flag: BeastFeatureFlag | null;
  moduleId: BeastModuleIdentifier;
  memberId: string;
  role: unknown;
}): BeastFeatureFlagResolution {
  if (!flag) {
    return {
      flagKey: "unknown",
      stage: "hidden",
      visible: false,
      deprecated: false,
      sourceScope: "default",
      sourceId: null,
      reason: "No flag definition or assignment exists, so visibility fails closed.",
    };
  }

  const normalizedRole = normalizeRole(role);
  const assignment =
    flag.assignments.find(
      (item) => item.scopeType === "member" && item.memberId === memberId
    ) ||
    flag.assignments.find(
      (item) =>
        item.scopeType === "role" && item.roleName === normalizedRole
    ) ||
    flag.assignments.find(
      (item) => item.scopeType === "module" && item.moduleId === moduleId
    );

  if (!assignment) {
    return {
      flagKey: flag.key,
      stage: "hidden",
      visible: false,
      deprecated: false,
      sourceScope: "default",
      sourceId: null,
      reason: "No member, role, or module assignment matched, so visibility fails closed.",
    };
  }

  return {
    flagKey: flag.key,
    stage: assignment.stage,
    visible: assignmentVisible({
      assignment,
      role: normalizedRole,
    }),
    deprecated: assignment.stage === "deprecated",
    sourceScope: assignment.scopeType,
    sourceId:
      assignment.memberId || assignment.roleName || assignment.moduleId,
    reason: `${assignment.scopeType} assignment resolved to ${beastFeatureFlagStageLabels[assignment.stage]}.`,
  };
}

export function normalizeBeastFeatureFlagResolution(
  value: unknown
): BeastFeatureFlagResolution | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  if (
    typeof record.flagKey !== "string" ||
    !isBeastFeatureFlagStage(record.stage) ||
    typeof record.visible !== "boolean" ||
    typeof record.deprecated !== "boolean" ||
    (record.sourceScope !== "default" &&
      !isBeastFeatureFlagScopeType(record.sourceScope)) ||
    (record.sourceId !== null && typeof record.sourceId !== "string") ||
    typeof record.reason !== "string"
  ) {
    return null;
  }

  return {
    flagKey: record.flagKey,
    stage: record.stage,
    visible: record.visible,
    deprecated: record.deprecated,
    sourceScope: record.sourceScope,
    sourceId: record.sourceId,
    reason: record.reason,
  };
}

export function filterBeastFeatureFlags(
  flags: BeastFeatureFlag[],
  query: string
) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return flags;

  return flags.filter((flag) =>
    [flag.key, flag.name, flag.description].some((value) =>
      value.toLocaleLowerCase().includes(normalized)
    )
  );
}
