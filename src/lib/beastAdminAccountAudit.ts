export const beastAdminAccountAuditActions = [
  "invitation_sent",
  "invitation_resent",
  "invitation_revoked",
  "invitation_accepted",
  "email_changed",
  "email_verification_resent",
  "role_changed",
  "account_suspended",
  "account_restored",
  "module_access_changed",
  "beta_assignment_changed",
  "password_reset_triggered",
  "beastos_sessions_revoked",
  "fresh_sign_in_required",
  "suspicious_activity_flagged",
  "suspicious_activity_cleared",
  "account_deletion_requested",
  "account_deletion_canceled",
] as const;

export type BeastAdminAccountAuditAction =
  (typeof beastAdminAccountAuditActions)[number];

export const beastAdminAccountAuditActionLabels: Record<
  BeastAdminAccountAuditAction,
  string
> = {
  invitation_sent: "Member invited",
  invitation_resent: "Invitation resent",
  invitation_revoked: "Invitation revoked",
  invitation_accepted: "Invitation accepted",
  email_changed: "Sign-in email changed",
  email_verification_resent: "Email verification resent",
  role_changed: "Role changed",
  account_suspended: "Account suspended",
  account_restored: "Account restored",
  module_access_changed: "Module access changed",
  beta_assignment_changed: "Beta assignment changed",
  password_reset_triggered: "Password reset triggered",
  beastos_sessions_revoked: "Sessions revoked",
  fresh_sign_in_required: "Fresh sign-in required",
  suspicious_activity_flagged: "Suspicious activity flagged",
  suspicious_activity_cleared: "Suspicious activity cleared",
  account_deletion_requested: "Account deletion requested",
  account_deletion_canceled: "Account deletion canceled",
};

export type BeastAdminAccountAuditEvent = {
  id: string;
  actorId: string;
  actorName: string;
  memberId: string;
  memberName: string;
  action: BeastAdminAccountAuditAction | "account_updated";
  occurredAt: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  outcome: "succeeded" | "failed";
  reason: string | null;
};

export type BeastAdminAccountAuditSnapshot = {
  events: BeastAdminAccountAuditEvent[];
  eventCount: number;
  limit: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDateString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !Number.isNaN(Date.parse(value))
  );
}

export function normalizeBeastAdminAccountAuditReason(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return undefined;
  const reason = value.trim();
  return reason && reason.length <= 500 ? reason : undefined;
}

export function normalizeBeastAdminAccountAuditSnapshot(
  value: unknown
): BeastAdminAccountAuditSnapshot | null {
  if (
    !isRecord(value) ||
    !Array.isArray(value.events) ||
    typeof value.eventCount !== "number" ||
    typeof value.limit !== "number"
  ) {
    return null;
  }

  const validActions = new Set<string>([
    ...beastAdminAccountAuditActions,
    "account_updated",
  ]);
  const events = value.events.flatMap((event) => {
    if (
      !isRecord(event) ||
      typeof event.id !== "string" ||
      typeof event.actorId !== "string" ||
      typeof event.actorName !== "string" ||
      typeof event.memberId !== "string" ||
      typeof event.memberName !== "string" ||
      typeof event.action !== "string" ||
      !validActions.has(event.action) ||
      !isDateString(event.occurredAt) ||
      !isRecord(event.previousValue) ||
      !isRecord(event.newValue) ||
      (event.outcome !== "succeeded" && event.outcome !== "failed")
    ) {
      return [];
    }
    const reason = normalizeBeastAdminAccountAuditReason(event.reason);
    if (reason === undefined) return [];

    return [
      {
        id: event.id,
        actorId: event.actorId,
        actorName: event.actorName,
        memberId: event.memberId,
        memberName: event.memberName,
        action: event.action as BeastAdminAccountAuditEvent["action"],
        occurredAt: event.occurredAt,
        previousValue: event.previousValue,
        newValue: event.newValue,
        outcome: event.outcome as BeastAdminAccountAuditEvent["outcome"],
        reason,
      },
    ];
  });

  if (events.length !== value.events.length) return null;

  return {
    events,
    eventCount: value.eventCount,
    limit: value.limit,
  };
}

export function getBeastAdminAccountAuditActionLabel(
  action: BeastAdminAccountAuditEvent["action"]
) {
  return action === "account_updated"
    ? "Account updated"
    : beastAdminAccountAuditActionLabels[action];
}

export function formatBeastAdminAccountAuditValue(
  value: Record<string, unknown>
) {
  if (!Object.keys(value).length) return "Not applicable.";

  return Object.entries(value)
    .map(([key, entry]) => {
      const label = key
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/^./, (character) => character.toUpperCase());
      const displayed =
        entry === null
          ? "Not provided"
          : Array.isArray(entry)
            ? entry.length
              ? entry.join(", ")
              : "None"
            : typeof entry === "object"
              ? JSON.stringify(entry)
              : String(entry);
      return `${label}: ${displayed}`;
    })
    .join("\n");
}
