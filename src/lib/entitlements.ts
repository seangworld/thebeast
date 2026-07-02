export const MEMBERSHIP_PLANS = ["free", "pro"] as const;
export type MembershipPlan = (typeof MEMBERSHIP_PLANS)[number];

export const USER_ROLES = ["user", "beta", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ADMIN_VIEW_MODES = ["admin", "pro", "free"] as const;
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
} as const;

export type EntitlementFeature = keyof typeof FEATURE_ENTITLEMENTS;

export type MembershipProfile = {
  role?: UserRole | string | null;
  membership_plan?: MembershipPlan | string | null;
  plan?: MembershipPlan | string | null;
} | null | undefined;

export type EntitlementContext = {
  plan: MembershipPlan;
  role: UserRole;
};

export function normalizeRole(role: unknown): UserRole {
  return USER_ROLES.includes(role as UserRole) ? (role as UserRole) : "user";
}

export function normalizePlan(plan: unknown): MembershipPlan {
  return MEMBERSHIP_PLANS.includes(plan as MembershipPlan)
    ? (plan as MembershipPlan)
    : "free";
}

export function normalizeAdminViewMode(mode: unknown): AdminViewMode {
  return ADMIN_VIEW_MODES.includes(mode as AdminViewMode)
    ? (mode as AdminViewMode)
    : "admin";
}

export function resolveEntitlementContext(
  profile: MembershipProfile
): EntitlementContext {
  const role = normalizeRole(profile?.role);
  const explicitPlan = profile?.membership_plan ?? profile?.plan;
  const plan =
    role === "admin" || role === "beta"
      ? "pro"
      : normalizePlan(explicitPlan);

  return { plan, role };
}

export function resolveEffectiveEntitlementContext(
  profile: MembershipProfile,
  adminViewMode: AdminViewMode = "admin"
): EntitlementContext {
  const realContext = resolveEntitlementContext(profile);

  if (realContext.role !== "admin") {
    return realContext;
  }

  if (adminViewMode === "free") {
    return { plan: "free", role: "user" };
  }

  if (adminViewMode === "pro") {
    return { plan: "pro", role: "user" };
  }

  return realContext;
}

export function isAdminViewSimulationActive(
  profile: MembershipProfile,
  adminViewMode: AdminViewMode
) {
  return resolveEntitlementContext(profile).role === "admin" &&
    adminViewMode !== "admin";
}

export function hasEntitlement(
  context: EntitlementContext | MembershipProfile,
  feature: EntitlementFeature
) {
  const entitlementContext =
    context && "plan" in context && "role" in context
      ? (context as EntitlementContext)
      : resolveEntitlementContext(context as MembershipProfile);

  if (entitlementContext.role === "admin" || entitlementContext.role === "beta") {
    return true;
  }

  const requiredPlan = FEATURE_ENTITLEMENTS[feature].requiredPlan;
  if (requiredPlan === "free") return true;

  return entitlementContext.plan === "pro";
}
