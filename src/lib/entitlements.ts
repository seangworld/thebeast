import {
  getMembershipEntitlementPlan,
  type MembershipPlan,
  type MembershipSnapshot,
} from "./membership/types";

export {
  MEMBERSHIP_PLANS,
  normalizeMembershipPlan as normalizePlan,
  type MembershipPlan,
  type MembershipSnapshot,
} from "./membership/types";

export const USER_ROLES = ["user", "beta", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_VIEW_MODES = ["admin", "member"] as const;
export type AdminViewMode = (typeof ADMIN_VIEW_MODES)[number];
export const ADMIN_VIEW_MODE_STORAGE_KEY = "beast_admin_view_mode";
export const ADMIN_VIEW_MODE_EVENT = "beast-admin-view-mode-change";

export const FEATURE_ENTITLEMENTS = {
  dashboard: {
    label: "Dashboard",
    requiredPlan: "free",
  },
  cashflow: {
    label: "Cash Flow",
    requiredPlan: "free",
  },
  debt_strategy: {
    label: "Debt Strategy",
    requiredPlan: "free",
  },
  velocity_planner: {
    label: "Velocity Planner",
    requiredPlan: "pro",
  },
  beast_advisor: {
    label: "Beast Advisor",
    requiredPlan: "pro",
  },
  scenario_planning: {
    label: "Scenario Planning",
    requiredPlan: "pro",
  },
  beast_admin: {
    label: "BeastAdmin",
    requiredPlan: "pro",
    ownerOnly: true,
  },
} as const;

export type EntitlementFeature = keyof typeof FEATURE_ENTITLEMENTS;

export type EntitlementSubject = {
  role?: UserRole | string | null;
  membership?: MembershipSnapshot | null;
} | null | undefined;

export type EntitlementContext = {
  plan: MembershipPlan;
  role: UserRole;
};

export function normalizeRole(role: unknown): UserRole {
  return USER_ROLES.includes(role as UserRole) ? (role as UserRole) : "user";
}

export function normalizeAdminViewMode(mode: unknown): AdminViewMode {
  if (mode === "pro" || mode === "free") return "member";

  return ADMIN_VIEW_MODES.includes(mode as AdminViewMode)
    ? (mode as AdminViewMode)
    : "admin";
}

export function resolveEntitlementContext(
  subject: EntitlementSubject
): EntitlementContext {
  const role = normalizeRole(subject?.role);
  const plan =
    role === "admin" || role === "beta"
      ? "pro"
      : getMembershipEntitlementPlan(subject?.membership);

  return { plan, role };
}

export function resolveEffectiveEntitlementContext(
  subject: EntitlementSubject,
  adminViewMode: AdminViewMode = "admin"
): EntitlementContext {
  const realContext = resolveEntitlementContext(subject);

  if (realContext.role !== "admin") {
    return realContext;
  }

  if (adminViewMode === "member") {
    return { plan: "free", role: "user" };
  }

  return realContext;
}

export function isAdminViewSimulationActive(
  subject: EntitlementSubject,
  adminViewMode: AdminViewMode
) {
  return resolveEntitlementContext(subject).role === "admin" &&
    adminViewMode !== "admin";
}

function isOwnerOnlyFeature(feature: EntitlementFeature) {
  return "ownerOnly" in FEATURE_ENTITLEMENTS[feature] &&
    FEATURE_ENTITLEMENTS[feature].ownerOnly === true;
}

export function hasEntitlement(
  context: EntitlementContext | EntitlementSubject,
  feature: EntitlementFeature
) {
  const entitlementContext =
    context && "plan" in context && "role" in context
      ? (context as EntitlementContext)
      : resolveEntitlementContext(context as EntitlementSubject);

  if (isOwnerOnlyFeature(feature)) {
    return entitlementContext.role === "admin";
  }

  if (entitlementContext.role === "admin" || entitlementContext.role === "beta") {
    return true;
  }

  return Boolean(FEATURE_ENTITLEMENTS[feature]);
}
