import { USER_ROLES, type UserRole } from "./entitlements";
import type { BeastModuleIdentifier } from "./moduleRegistry";

export const beastAdminEditableAccountStatuses = [
  "active",
  "invited",
  "suspended",
] as const;

export type BeastAdminEditableAccountStatus =
  (typeof beastAdminEditableAccountStatuses)[number];

export const beastAdminEditableModuleIds = ["money", "learning", "home"] as const;

export type BeastAdminEditableModuleId =
  (typeof beastAdminEditableModuleIds)[number];

export const beastAdminAccountKinds = [
  "member",
  "system",
  "demo",
  "unmanaged",
] as const;

export type BeastAdminAccountKind = (typeof beastAdminAccountKinds)[number];

export type BeastAdminMemberEditRequest = {
  displayName: string | null;
  email: string;
  role: UserRole;
  accountStatus: BeastAdminEditableAccountStatus;
  moduleAccess: BeastAdminEditableModuleId[];
  betaFlagIds: string[];
  confirmEmailChange: boolean;
};

export type BeastAdminMemberEditResult = {
  memberId: string;
  emailChanged: boolean;
  emailReverificationRequired: boolean;
  auditEventId: string;
  message: string;
};

export type BeastAdminMemberModuleAccessOverride = {
  moduleId: BeastAdminEditableModuleId;
  enabled: boolean;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function uniqueStrings(value: unknown) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    return null;
  }

  const normalized = value.map((item) => item.trim()).filter(Boolean);
  return normalized.length === new Set(normalized).size ? normalized : null;
}

export function normalizeBeastAdminMemberEditRequest(
  value: unknown
): BeastAdminMemberEditRequest | null {
  if (!isRecord(value)) return null;

  const displayName =
    value.displayName === null
      ? null
      : typeof value.displayName === "string"
        ? value.displayName.trim() || null
        : undefined;
  const email =
    typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const moduleAccess = uniqueStrings(value.moduleAccess);
  const betaFlagIds = uniqueStrings(value.betaFlagIds);

  if (
    displayName === undefined ||
    (displayName !== null && displayName.length > 100) ||
    !emailPattern.test(email) ||
    email.length > 320 ||
    !USER_ROLES.includes(value.role as UserRole) ||
    !beastAdminEditableAccountStatuses.includes(
      value.accountStatus as BeastAdminEditableAccountStatus
    ) ||
    !moduleAccess ||
    moduleAccess.some(
      (moduleId) =>
        !beastAdminEditableModuleIds.includes(
          moduleId as BeastAdminEditableModuleId
        )
    ) ||
    !betaFlagIds ||
    betaFlagIds.some((flagId) => !uuidPattern.test(flagId)) ||
    typeof value.confirmEmailChange !== "boolean"
  ) {
    return null;
  }

  return {
    displayName,
    email,
    role: value.role as UserRole,
    accountStatus:
      value.accountStatus as BeastAdminEditableAccountStatus,
    moduleAccess: moduleAccess as BeastAdminEditableModuleId[],
    betaFlagIds,
    confirmEmailChange: value.confirmEmailChange,
  };
}

export function isProtectedBeastAdminAccount({
  accountKind,
  appMetadata,
}: {
  accountKind: unknown;
  appMetadata?: Record<string, unknown> | null;
}) {
  if (
    accountKind === "system" ||
    accountKind === "demo" ||
    accountKind === "unmanaged"
  ) {
    return true;
  }

  return Boolean(
    appMetadata?.is_system === true ||
      appMetadata?.is_demo === true ||
      appMetadata?.account_kind === "system" ||
      appMetadata?.account_kind === "demo" ||
      appMetadata?.account_type === "system" ||
      appMetadata?.account_type === "demo"
  );
}

export function wouldRemoveFinalBeastOwner({
  currentRole,
  nextRole,
  nextStatus,
  adminCount,
}: {
  currentRole: string;
  nextRole: UserRole;
  nextStatus: BeastAdminEditableAccountStatus;
  adminCount: number;
}) {
  return (
    currentRole === "admin" &&
    adminCount <= 1 &&
    (nextRole !== "admin" || nextStatus === "suspended")
  );
}

export function isBeastAdminEditableModuleId(
  value: BeastModuleIdentifier
): value is BeastAdminEditableModuleId {
  return beastAdminEditableModuleIds.includes(
    value as BeastAdminEditableModuleId
  );
}

export function normalizeMemberModuleAccessOverrides(
  value: unknown
): BeastAdminMemberModuleAccessOverride[] | null {
  if (!Array.isArray(value)) return null;

  const rows = value.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      !beastAdminEditableModuleIds.includes(
        entry.moduleId as BeastAdminEditableModuleId
      ) ||
      typeof entry.enabled !== "boolean"
    ) {
      return [];
    }

    return [
      {
        moduleId: entry.moduleId as BeastAdminEditableModuleId,
        enabled: entry.enabled,
      },
    ];
  });

  return rows.length === value.length ? rows : null;
}
