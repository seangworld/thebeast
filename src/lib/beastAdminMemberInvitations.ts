import { USER_ROLES, type UserRole } from "./entitlements";
import {
  beastAdminEditableModuleIds,
  type BeastAdminEditableModuleId,
} from "./beastAdminMemberEditing";
import {
  householdRelationshipTypes,
  type HouseholdRelationshipType,
} from "./platform/household";

export const beastAdminInvitationStates = [
  "sent",
  "resent",
  "accepted",
  "expired",
  "revoked",
] as const;

export type BeastAdminInvitationState =
  (typeof beastAdminInvitationStates)[number];

export type BeastAdminMemberInvitationRequest = {
  email: string;
  displayName: string;
  role: UserRole;
  householdId: string | null;
  relationship: HouseholdRelationshipType | null;
  moduleAccess: BeastAdminEditableModuleId[];
  betaFlagIds: string[];
  invitationMessage: string | null;
};

export type BeastAdminMemberInvitationResult = {
  invitationId: string;
  memberId: string;
  state: BeastAdminInvitationState;
  auditEventId: string;
  message: string;
};

export type BeastAdminInvitationAction = "resend" | "revoke";

export type BeastAdminInvitationHousehold = {
  id: string;
  name: string;
};

export type BeastAdminMemberInvitation = {
  id: string;
  memberId: string;
  email: string;
  displayName: string;
  role: UserRole;
  state: BeastAdminInvitationState;
  householdId: string | null;
  householdName: string | null;
  relationship: HouseholdRelationshipType | null;
  moduleAccess: BeastAdminEditableModuleId[];
  betaFlagIds: string[];
  invitationMessage: string | null;
  sentAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  resendCount: number;
};

export type BeastAdminInvitationDirectory = {
  invitations: BeastAdminMemberInvitation[];
  households: BeastAdminInvitationHousehold[];
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

function isDateString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

function isNullableDate(value: unknown): value is string | null {
  return value === null || isDateString(value);
}

export function normalizeBeastAdminMemberInvitationRequest(
  value: unknown
): BeastAdminMemberInvitationRequest | null {
  if (!isRecord(value)) return null;

  const email =
    typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const displayName =
    typeof value.displayName === "string" ? value.displayName.trim() : "";
  const householdId =
    value.householdId === null || value.householdId === ""
      ? null
      : typeof value.householdId === "string"
        ? value.householdId.trim()
        : undefined;
  const relationship =
    value.relationship === null || value.relationship === ""
      ? null
      : householdRelationshipTypes.includes(
            value.relationship as HouseholdRelationshipType
          )
        ? (value.relationship as HouseholdRelationshipType)
        : undefined;
  const moduleAccess = uniqueStrings(value.moduleAccess);
  const betaFlagIds = uniqueStrings(value.betaFlagIds);
  const invitationMessage =
    value.invitationMessage === null || value.invitationMessage === ""
      ? null
      : typeof value.invitationMessage === "string"
        ? value.invitationMessage.trim() || null
        : undefined;

  if (
    !emailPattern.test(email) ||
    email.length > 320 ||
    !displayName ||
    displayName.length > 100 ||
    !USER_ROLES.includes(value.role as UserRole) ||
    householdId === undefined ||
    (householdId !== null && !uuidPattern.test(householdId)) ||
    relationship === undefined ||
    (relationship !== null && householdId === null) ||
    !moduleAccess ||
    moduleAccess.some(
      (moduleId) =>
        !beastAdminEditableModuleIds.includes(
          moduleId as BeastAdminEditableModuleId
        )
    ) ||
    !betaFlagIds ||
    betaFlagIds.some((flagId) => !uuidPattern.test(flagId)) ||
    invitationMessage === undefined ||
    (invitationMessage !== null && invitationMessage.length > 1000)
  ) {
    return null;
  }

  return {
    email,
    displayName,
    role: value.role as UserRole,
    householdId,
    relationship,
    moduleAccess: moduleAccess as BeastAdminEditableModuleId[],
    betaFlagIds,
    invitationMessage,
  };
}

export function normalizeBeastAdminInvitationAction(
  value: unknown
): BeastAdminInvitationAction | null {
  if (
    !isRecord(value) ||
    (value.action !== "resend" && value.action !== "revoke")
  ) {
    return null;
  }
  return value.action;
}

export function normalizeBeastAdminInvitationDirectory(
  value: unknown
): BeastAdminInvitationDirectory | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.invitations) ||
    !Array.isArray(value.households)
  ) {
    return null;
  }

  const households = value.households.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.name !== "string"
    ) {
      return [];
    }
    return [{ id: entry.id, name: entry.name.trim() || "Unnamed household" }];
  });

  const invitations = value.invitations.flatMap((entry) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== "string" ||
      typeof entry.memberId !== "string" ||
      typeof entry.email !== "string" ||
      typeof entry.displayName !== "string" ||
      !USER_ROLES.includes(entry.role as UserRole) ||
      !beastAdminInvitationStates.includes(
        entry.state as BeastAdminInvitationState
      ) ||
      (entry.householdId !== null && typeof entry.householdId !== "string") ||
      (entry.householdName !== null &&
        typeof entry.householdName !== "string") ||
      (entry.relationship !== null &&
        !householdRelationshipTypes.includes(
          entry.relationship as HouseholdRelationshipType
        )) ||
      (entry.invitationMessage !== null &&
        typeof entry.invitationMessage !== "string") ||
      !isDateString(entry.sentAt) ||
      !isDateString(entry.expiresAt) ||
      !isNullableDate(entry.acceptedAt) ||
      !isNullableDate(entry.revokedAt) ||
      typeof entry.resendCount !== "number" ||
      !Number.isInteger(entry.resendCount) ||
      entry.resendCount < 0
    ) {
      return [];
    }

    const moduleAccess = uniqueStrings(entry.moduleAccess);
    const betaFlagIds = uniqueStrings(entry.betaFlagIds);
    if (
      !moduleAccess ||
      moduleAccess.some(
        (moduleId) =>
          !beastAdminEditableModuleIds.includes(
            moduleId as BeastAdminEditableModuleId
          )
      ) ||
      !betaFlagIds ||
      betaFlagIds.some((flagId) => !uuidPattern.test(flagId))
    ) {
      return [];
    }

    return [
      {
        id: entry.id,
        memberId: entry.memberId,
        email: entry.email,
        displayName: entry.displayName.trim() || "Not provided.",
        role: entry.role as UserRole,
        state: entry.state as BeastAdminInvitationState,
        householdId: entry.householdId as string | null,
        householdName: entry.householdName as string | null,
        relationship: entry.relationship as HouseholdRelationshipType | null,
        moduleAccess: moduleAccess as BeastAdminEditableModuleId[],
        betaFlagIds,
        invitationMessage: entry.invitationMessage as string | null,
        sentAt: entry.sentAt,
        expiresAt: entry.expiresAt,
        acceptedAt: entry.acceptedAt,
        revokedAt: entry.revokedAt,
        resendCount: entry.resendCount,
      },
    ];
  });

  if (
    households.length !== value.households.length ||
    invitations.length !== value.invitations.length
  ) {
    return null;
  }

  return { households, invitations };
}

export function buildBeastInvitationCallbackUrl(
  runtimeOrigin: string,
  configuredSiteUrl?: string | null
) {
  for (const candidate of [configuredSiteUrl, runtimeOrigin]) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:") {
        const callback = new URL("/auth/callback", url.origin);
        callback.searchParams.set("flow", "invite");
        callback.searchParams.set("next", "/dashboard/onboarding");
        return callback.toString();
      }
    } catch {
      // Continue to the runtime fallback.
    }
  }

  return "http://localhost:3000/auth/callback?flow=invite&next=%2Fdashboard%2Fonboarding";
}

export function getBeastInvitationErrorMessage(error: unknown) {
  const candidate =
    error && typeof error === "object"
      ? (error as { code?: unknown; message?: unknown })
      : {};
  const code = String(candidate.code || "").toLowerCase();
  const message = String(candidate.message || "").toLowerCase();

  if (
    code === "email_exists" ||
    /already (?:registered|exists)|email.*(?:duplicate|unique)/i.test(message)
  ) {
    return "That email already belongs to a Beast account. Open the existing member instead.";
  }
  if (code.includes("rate") || message.includes("rate limit")) {
    return "An invitation was sent recently. Wait a moment before trying again.";
  }
  if (
    code === "email_address_invalid" ||
    code === "email_address_not_authorized"
  ) {
    return "Enter an email address that can receive Beast invitations.";
  }

  return "BeastAdmin could not send the invitation. No member setup was saved.";
}
