export const beastAdminAccountAccessActions = [
  "revoke_sessions",
  "require_fresh_sign_in",
  "flag_suspicious",
  "clear_suspicious",
] as const;

export type BeastAdminAccountAccessAction =
  (typeof beastAdminAccountAccessActions)[number];

export type BeastAdminAccountAccessEvent = {
  id: string;
  type:
    | "sign_in"
    | "sign_out"
    | "password_reset_requested"
    | "password_updated"
    | "email_change"
    | "session_revoked"
    | "fresh_sign_in_required"
    | "suspicious_activity_flagged"
    | "suspicious_activity_cleared"
    | "account_authentication_updated";
  title: string;
  description: string;
  occurredAt: string;
  source: "supabase_auth" | "beast_admin";
  deviceCategory: string | null;
  platform: string | null;
  browser: string | null;
};

export type BeastAdminAccountAccessSnapshot = {
  memberId: string;
  lastSuccessfulSignInAt: string | null;
  retentionDays: number;
  providerAuditAvailable: boolean;
  failedSignInEvidenceAvailable: boolean;
  locationCollectionEnabled: false;
  freshSignInRequiredAfter: string | null;
  suspiciousActivityFlagged: boolean;
  suspiciousActivityFlaggedAt: string | null;
  suspiciousActivityReason: string | null;
  events: BeastAdminAccountAccessEvent[];
};

type CoarseUserAgent = {
  deviceCategory: string;
  platform: string;
  browser: string;
};

type ProviderEvent = {
  id: string;
  action: string;
  occurredAt: string;
  userAgent: string | null;
};

type PlatformEvent = {
  id: string;
  action: string;
  occurredAt: string;
  reason: string | null;
};

type RawAccessHistory = {
  memberId: string;
  lastSuccessfulSignInAt: string | null;
  emailChangeSentAt: string | null;
  retentionDays: number;
  providerAuditAvailable: boolean;
  providerEvents: ProviderEvent[];
  platformEvents: PlatformEvent[];
  control: {
    freshSignInRequiredAfter: string | null;
    suspiciousActivityFlagged: boolean;
    suspiciousActivityFlaggedAt: string | null;
    suspiciousActivityReason: string | null;
  };
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

function nullableDate(value: unknown): string | null | undefined {
  return value === null ? null : isDateString(value) ? value : undefined;
}

function nullableString(value: unknown): string | null | undefined {
  return value === null
    ? null
    : typeof value === "string"
      ? value
      : undefined;
}

export function normalizeBeastAdminAccountAccessAction(
  value: unknown
): { action: BeastAdminAccountAccessAction; reason: string | null } | null {
  if (
    !isRecord(value) ||
    !beastAdminAccountAccessActions.includes(
      value.action as BeastAdminAccountAccessAction
    )
  ) {
    return null;
  }

  const reason =
    value.reason === null || value.reason === undefined
      ? null
      : typeof value.reason === "string"
        ? value.reason.trim() || null
        : undefined;
  if (reason === undefined || (reason && reason.length > 500)) return null;
  if (value.action === "flag_suspicious" && !reason) return null;

  return {
    action: value.action as BeastAdminAccountAccessAction,
    reason,
  };
}

export function categorizeAuthUserAgent(
  userAgent: string | null | undefined
): CoarseUserAgent | null {
  if (!userAgent?.trim()) return null;

  const ua = userAgent.toLowerCase();
  const deviceCategory = /ipad|tablet|kindle|silk/.test(ua)
    ? "Tablet"
    : /mobile|iphone|ipod|android/.test(ua)
      ? "Mobile"
      : "Desktop";
  const platform = /iphone|ipad|ipod/.test(ua)
    ? "iOS or iPadOS"
    : /android/.test(ua)
      ? "Android"
      : /windows/.test(ua)
        ? "Windows"
        : /macintosh|mac os x/.test(ua)
          ? "macOS"
          : /linux|x11/.test(ua)
            ? "Linux"
            : "Other platform";
  const browser = /edg\//.test(ua)
    ? "Microsoft Edge"
    : /firefox|fxios/.test(ua)
      ? "Firefox"
      : /crios|chrome/.test(ua)
        ? "Chrome"
        : /safari/.test(ua)
          ? "Safari"
          : "Other browser";

  return { deviceCategory, platform, browser };
}

function normalizeProviderEvent(value: unknown): ProviderEvent | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.action !== "string" ||
    !isDateString(value.occurredAt)
  ) {
    return null;
  }
  const userAgent = nullableString(value.userAgent);
  if (userAgent === undefined) return null;

  return {
    id: value.id,
    action: value.action,
    occurredAt: value.occurredAt,
    userAgent,
  };
}

function normalizePlatformEvent(value: unknown): PlatformEvent | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    typeof value.action !== "string" ||
    !isDateString(value.occurredAt)
  ) {
    return null;
  }
  const reason = nullableString(value.reason);
  if (reason === undefined) return null;

  return {
    id: value.id,
    action: value.action,
    occurredAt: value.occurredAt,
    reason,
  };
}

function normalizeRawAccessHistory(value: unknown): RawAccessHistory | null {
  if (
    !isRecord(value) ||
    typeof value.memberId !== "string" ||
    typeof value.retentionDays !== "number" ||
    typeof value.providerAuditAvailable !== "boolean" ||
    !Array.isArray(value.providerEvents) ||
    !Array.isArray(value.platformEvents) ||
    !isRecord(value.control)
  ) {
    return null;
  }

  const lastSuccessfulSignInAt = nullableDate(value.lastSuccessfulSignInAt);
  const emailChangeSentAt = nullableDate(value.emailChangeSentAt);
  const freshSignInRequiredAfter = nullableDate(
    value.control.freshSignInRequiredAfter
  );
  const suspiciousActivityFlaggedAt = nullableDate(
    value.control.suspiciousActivityFlaggedAt
  );
  const suspiciousActivityReason = nullableString(
    value.control.suspiciousActivityReason
  );
  if (
    lastSuccessfulSignInAt === undefined ||
    emailChangeSentAt === undefined ||
    freshSignInRequiredAfter === undefined ||
    suspiciousActivityFlaggedAt === undefined ||
    suspiciousActivityReason === undefined ||
    typeof value.control.suspiciousActivityFlagged !== "boolean"
  ) {
    return null;
  }

  const providerEvents = value.providerEvents.map(normalizeProviderEvent);
  const platformEvents = value.platformEvents.map(normalizePlatformEvent);
  if (
    providerEvents.some((event) => !event) ||
    platformEvents.some((event) => !event)
  ) {
    return null;
  }

  return {
    memberId: value.memberId,
    lastSuccessfulSignInAt,
    emailChangeSentAt,
    retentionDays: value.retentionDays,
    providerAuditAvailable: value.providerAuditAvailable,
    providerEvents: providerEvents as ProviderEvent[],
    platformEvents: platformEvents as PlatformEvent[],
    control: {
      freshSignInRequiredAfter,
      suspiciousActivityFlagged: value.control.suspiciousActivityFlagged,
      suspiciousActivityFlaggedAt,
      suspiciousActivityReason,
    },
  };
}

function providerEventPresentation(event: ProviderEvent) {
  const action = event.action.toLowerCase();
  if (action === "login") {
    return {
      type: "sign_in" as const,
      title: "Sign-in activity",
      description:
        "Supabase Auth recorded a sign-in event. The account’s latest confirmed success is shown separately.",
    };
  }
  if (action === "logout") {
    return {
      type: "sign_out" as const,
      title: "Signed out",
      description: "Supabase Auth recorded a sign-out event.",
    };
  }
  if (action === "user_recovery_requested") {
    return {
      type: "password_reset_requested" as const,
      title: "Password reset requested",
      description: "Supabase Auth recorded a password recovery request.",
    };
  }
  if (action === "user_updated_password") {
    return {
      type: "password_updated" as const,
      title: "Password updated",
      description: "Supabase Auth recorded a completed password update.",
    };
  }
  if (action === "token_revoked") {
    return {
      type: "session_revoked" as const,
      title: "Session token revoked",
      description: "Supabase Auth recorded a token revocation.",
    };
  }
  if (
    action === "user_modified" ||
    action === "user_confirmation_requested"
  ) {
    return {
      type: "account_authentication_updated" as const,
      title: "Authentication account updated",
      description:
        "Supabase Auth recorded an account change. The event does not prove which field changed.",
    };
  }
  return null;
}

function platformEventPresentation(event: PlatformEvent) {
  const presentations = {
    beastos_sessions_revoked: {
      type: "session_revoked" as const,
      title: "BeastOS sessions revoked",
      description:
        "The Beast owner required every current BeastOS session to authenticate again.",
    },
    fresh_sign_in_required: {
      type: "fresh_sign_in_required" as const,
      title: "Fresh sign-in required",
      description:
        "The Beast owner required the member to authenticate again before continuing.",
    },
    suspicious_activity_flagged: {
      type: "suspicious_activity_flagged" as const,
      title: "Activity flagged for review",
      description: event.reason
        ? `Owner review note: ${event.reason}`
        : "The Beast owner flagged authentication activity for review.",
    },
    suspicious_activity_cleared: {
      type: "suspicious_activity_cleared" as const,
      title: "Activity review cleared",
      description:
        "The Beast owner cleared the authentication activity review flag.",
    },
    authentication_email_changed: {
      type: "email_change" as const,
      title: "Sign-in email changed",
      description:
        "The Beast owner changed the authoritative Supabase Auth email through the confirmed account workflow.",
    },
  };

  return presentations[event.action as keyof typeof presentations] || null;
}

export function normalizeBeastAdminAccountAccessSnapshot(
  value: unknown
): BeastAdminAccountAccessSnapshot | null {
  const raw = normalizeRawAccessHistory(value);
  if (!raw) return null;

  const events: BeastAdminAccountAccessEvent[] = [];
  for (const event of raw.providerEvents) {
    const presentation = providerEventPresentation(event);
    if (!presentation) continue;
    const userAgent = categorizeAuthUserAgent(event.userAgent);
    events.push({
      id: `provider-${event.id}`,
      ...presentation,
      occurredAt: event.occurredAt,
      source: "supabase_auth",
      deviceCategory: userAgent?.deviceCategory || null,
      platform: userAgent?.platform || null,
      browser: userAgent?.browser || null,
    });
  }

  for (const event of raw.platformEvents) {
    const presentation = platformEventPresentation(event);
    if (!presentation) continue;
    events.push({
      id: `platform-${event.id}`,
      ...presentation,
      occurredAt: event.occurredAt,
      source: "beast_admin",
      deviceCategory: null,
      platform: null,
      browser: null,
    });
  }

  if (
    raw.emailChangeSentAt &&
    !events.some(
      (event) =>
        event.type === "email_change" &&
        event.occurredAt === raw.emailChangeSentAt
    )
  ) {
    events.push({
      id: `auth-email-change-${raw.emailChangeSentAt}`,
      type: "email_change",
      title: "Email change requested",
      description:
        "Supabase Auth currently records a pending sign-in email change from this time.",
      occurredAt: raw.emailChangeSentAt,
      source: "supabase_auth",
      deviceCategory: null,
      platform: null,
      browser: null,
    });
  }

  events.sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() -
      new Date(left.occurredAt).getTime()
  );

  return {
    memberId: raw.memberId,
    lastSuccessfulSignInAt: raw.lastSuccessfulSignInAt,
    retentionDays: raw.retentionDays,
    providerAuditAvailable: raw.providerAuditAvailable,
    failedSignInEvidenceAvailable: false,
    locationCollectionEnabled: false,
    freshSignInRequiredAfter: raw.control.freshSignInRequiredAfter,
    suspiciousActivityFlagged: raw.control.suspiciousActivityFlagged,
    suspiciousActivityFlaggedAt:
      raw.control.suspiciousActivityFlaggedAt,
    suspiciousActivityReason: raw.control.suspiciousActivityReason,
    events: events.slice(0, 100),
  };
}

export function normalizeBeastAdminAccountAccessResponse(
  value: unknown
): BeastAdminAccountAccessSnapshot | null {
  if (
    !isRecord(value) ||
    typeof value.memberId !== "string" ||
    typeof value.retentionDays !== "number" ||
    typeof value.providerAuditAvailable !== "boolean" ||
    value.failedSignInEvidenceAvailable !== false ||
    value.locationCollectionEnabled !== false ||
    typeof value.suspiciousActivityFlagged !== "boolean" ||
    !Array.isArray(value.events)
  ) {
    return null;
  }

  const lastSuccessfulSignInAt = nullableDate(value.lastSuccessfulSignInAt);
  const freshSignInRequiredAfter = nullableDate(
    value.freshSignInRequiredAfter
  );
  const suspiciousActivityFlaggedAt = nullableDate(
    value.suspiciousActivityFlaggedAt
  );
  const suspiciousActivityReason = nullableString(
    value.suspiciousActivityReason
  );
  if (
    lastSuccessfulSignInAt === undefined ||
    freshSignInRequiredAfter === undefined ||
    suspiciousActivityFlaggedAt === undefined ||
    suspiciousActivityReason === undefined
  ) {
    return null;
  }

  const eventTypes = new Set([
    "sign_in",
    "sign_out",
    "password_reset_requested",
    "password_updated",
    "email_change",
    "session_revoked",
    "fresh_sign_in_required",
    "suspicious_activity_flagged",
    "suspicious_activity_cleared",
    "account_authentication_updated",
  ]);
  const events = value.events.flatMap((event) => {
    if (
      !isRecord(event) ||
      typeof event.id !== "string" ||
      !eventTypes.has(String(event.type)) ||
      typeof event.title !== "string" ||
      typeof event.description !== "string" ||
      !isDateString(event.occurredAt) ||
      (event.source !== "supabase_auth" &&
        event.source !== "beast_admin")
    ) {
      return [];
    }
    const deviceCategory = nullableString(event.deviceCategory);
    const platform = nullableString(event.platform);
    const browser = nullableString(event.browser);
    if (
      deviceCategory === undefined ||
      platform === undefined ||
      browser === undefined
    ) {
      return [];
    }
    return [
      {
        id: event.id,
        type: event.type as BeastAdminAccountAccessEvent["type"],
        title: event.title,
        description: event.description,
        occurredAt: event.occurredAt,
        source: event.source as BeastAdminAccountAccessEvent["source"],
        deviceCategory,
        platform,
        browser,
      },
    ];
  });
  if (events.length !== value.events.length) return null;

  return {
    memberId: value.memberId,
    lastSuccessfulSignInAt,
    retentionDays: value.retentionDays,
    providerAuditAvailable: value.providerAuditAvailable,
    failedSignInEvidenceAvailable: false,
    locationCollectionEnabled: false,
    freshSignInRequiredAfter,
    suspiciousActivityFlagged: value.suspiciousActivityFlagged,
    suspiciousActivityFlaggedAt,
    suspiciousActivityReason,
    events,
  };
}
