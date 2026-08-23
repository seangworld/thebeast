export const ANALYTICS_CONTRACT_VERSION = "bo404-v1";

export const analyticsEventNames = [
  "page_viewed",
  "navigation_selected",
  "call_to_action_selected",
  "beast_entry_selected",
  "article_viewed",
  "resource_viewed",
  "outbound_link_selected",
  "contact_action_initiated",
  "sign_in_selected",
  "account_creation_selected",
  "auth_initiated",
  "account_created",
  "search_performed",
  "search_succeeded",
  "search_no_results",
  "error_encountered",
  "performance_issue",
  "session_started",
  "login_completed",
  "logout_completed",
  "module_opened",
  "workspace_viewed",
  "professional_opened",
  "conversation_created",
  "conversation_resumed",
  "conversation_completed",
  "recommendation_accepted",
  "recommendation_deferred",
  "recommendation_dismissed",
  "knowledge_area_selected",
  "knowledge_item_added",
  "knowledge_item_edited",
  "missing_information_flow_started",
  "missing_information_flow_completed",
  "goal_created",
  "document_uploaded",
  "workflow_completed",
  "roadmap_updated",
  "verified_record_added",
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];
export type AnalyticsConsentState = "enabled" | "disabled" | "pending";
export type AnalyticsEnvironment =
  | "development"
  | "test"
  | "preview"
  | "production";

export const analyticsPropertyNames = [
  "contract_version",
  "product_id",
  "module_id",
  "workspace_id",
  "professional_id",
  "environment",
  "action",
  "category",
  "result",
  "status",
  "source",
  "destination",
  "error_category",
  "performance_bucket",
] as const;

export type AnalyticsPropertyName = (typeof analyticsPropertyNames)[number];
export type AnalyticsProperties = Partial<
  Record<AnalyticsPropertyName, string>
>;

export type AnalyticsProductRegistration = {
  productId: string;
  supportedEvents: readonly AnalyticsEventName[];
  defaultModuleId?: string;
};

export type AnalyticsContext = {
  registration: AnalyticsProductRegistration;
  moduleId?: string;
  workspaceId?: string;
  professionalId?: string;
};

export type AnalyticsDispatchInput = {
  event: AnalyticsEventName;
  context: AnalyticsContext;
  properties?: Record<string, unknown>;
  consent: AnalyticsConsentState;
  environment: AnalyticsEnvironment;
  measurementId: string;
};

export type AnalyticsDispatch = {
  event: AnalyticsEventName;
  properties: AnalyticsProperties;
  rejectedProperties: readonly string[];
};

const stableIdentifier = /^[a-z][a-z0-9_]{1,63}$/;
const measurementIdPattern = /^G-[A-Z0-9]{6,20}$/;
const eventSet = new Set<string>(analyticsEventNames);
const propertySet = new Set<string>(analyticsPropertyNames);

const approvedCategoricalValues: Partial<
  Record<AnalyticsPropertyName, ReadonlySet<string>>
> = {
  environment: new Set(["development", "test", "preview", "production"]),
  result: new Set([
    "success",
    "no_results",
    "cancelled",
    "unavailable",
    "failed",
  ]),
  status: new Set([
    "started",
    "continued",
    "completed",
    "accepted",
    "deferred",
    "dismissed",
    "enabled",
    "disabled",
    "pending",
  ]),
  error_category: new Set([
    "authorization",
    "configuration",
    "network",
    "not_found",
    "provider",
    "rate_limited",
    "timeout",
    "validation",
    "unknown",
  ]),
  performance_bucket: new Set([
    "under_1s",
    "1s_to_3s",
    "3s_to_10s",
    "over_10s",
    "unknown",
  ]),
};

export function registerAnalyticsProduct(
  registration: AnalyticsProductRegistration
): AnalyticsProductRegistration {
  if (!stableIdentifier.test(registration.productId)) {
    throw new Error("Analytics product identifiers must be stable lowercase IDs.");
  }
  if (
    registration.defaultModuleId &&
    !stableIdentifier.test(registration.defaultModuleId)
  ) {
    throw new Error("Analytics module identifiers must be stable lowercase IDs.");
  }
  if (
    !registration.supportedEvents.length ||
    registration.supportedEvents.some((event) => !eventSet.has(event))
  ) {
    throw new Error("Analytics registrations require approved events.");
  }
  return Object.freeze({
    ...registration,
    supportedEvents: Object.freeze(
      Array.from(new Set(registration.supportedEvents))
    ),
  });
}

export const beastAnalyticsProductRegistry = [
  registerAnalyticsProduct({
    productId: "beastos",
    defaultModuleId: "beastos",
    supportedEvents: analyticsEventNames,
  }),
  registerAnalyticsProduct({
    productId: "beastmoney",
    defaultModuleId: "money",
    supportedEvents: analyticsEventNames,
  }),
  registerAnalyticsProduct({
    productId: "beasteducation",
    defaultModuleId: "education",
    supportedEvents: analyticsEventNames,
  }),
  registerAnalyticsProduct({
    productId: "beasthealth",
    defaultModuleId: "health",
    supportedEvents: analyticsEventNames,
  }),
  registerAnalyticsProduct({
    productId: "beasthome",
    defaultModuleId: "home",
    supportedEvents: analyticsEventNames,
  }),
  registerAnalyticsProduct({
    productId: "beastsecurity",
    defaultModuleId: "security",
    supportedEvents: analyticsEventNames,
  }),
  registerAnalyticsProduct({
    productId: "beastadmin",
    defaultModuleId: "admin",
    supportedEvents: analyticsEventNames,
  }),
] as const;

export function normalizeAnalyticsEnvironment(
  value: string | undefined
): AnalyticsEnvironment {
  if (value === "production") return "production";
  if (value === "preview") return "preview";
  if (value === "test") return "test";
  return "development";
}

export function normalizeAnalyticsConsent(
  value: string | null | undefined
): AnalyticsConsentState {
  if (value === "enabled" || value === "disabled") return value;
  return "pending";
}

export function analyticsPerformanceBucket(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "unknown";
  if (milliseconds < 1000) return "under_1s";
  if (milliseconds < 3000) return "1s_to_3s";
  if (milliseconds < 10000) return "3s_to_10s";
  return "over_10s";
}

function isApprovedPropertyValue(
  name: AnalyticsPropertyName,
  value: unknown
): value is string {
  if (typeof value !== "string" || !value || value.length > 64) return false;
  if (name === "contract_version") {
    return value === ANALYTICS_CONTRACT_VERSION;
  }
  const approvedValues = approvedCategoricalValues[name];
  if (approvedValues) return approvedValues.has(value);
  return stableIdentifier.test(value);
}

export function sanitizeAnalyticsProperties(
  properties: Record<string, unknown>
) {
  const accepted: AnalyticsProperties = {};
  const rejected: string[] = [];

  for (const [name, value] of Object.entries(properties)) {
    if (!propertySet.has(name)) {
      rejected.push(name);
      continue;
    }
    const propertyName = name as AnalyticsPropertyName;
    if (!isApprovedPropertyValue(propertyName, value)) {
      rejected.push(name);
      continue;
    }
    accepted[propertyName] = value;
  }

  return {
    accepted,
    rejected: Object.freeze(rejected.sort()),
  };
}

export function buildAnalyticsDispatch(
  input: AnalyticsDispatchInput
): AnalyticsDispatch | null {
  if (
    input.consent !== "enabled" ||
    input.environment !== "production" ||
    !measurementIdPattern.test(input.measurementId) ||
    !input.context.registration.supportedEvents.includes(input.event)
  ) {
    return null;
  }

  const baseProperties: Record<string, unknown> = {
    ...input.properties,
    contract_version: ANALYTICS_CONTRACT_VERSION,
    product_id: input.context.registration.productId,
    module_id:
      input.context.moduleId ||
      input.context.registration.defaultModuleId,
    workspace_id: input.context.workspaceId,
    professional_id: input.context.professionalId,
    environment: input.environment,
  };
  const definedProperties = Object.fromEntries(
    Object.entries(baseProperties).filter(([, value]) => value !== undefined)
  );
  const sanitized = sanitizeAnalyticsProperties(definedProperties);

  return {
    event: input.event,
    properties: sanitized.accepted,
    rejectedProperties: sanitized.rejected,
  };
}

export function createPageViewDeduplicator() {
  let lastPath = "";
  return {
    shouldTrack(pathname: string) {
      const normalized = normalizeAnalyticsPath(pathname);
      if (!normalized || normalized === lastPath) return false;
      lastPath = normalized;
      return true;
    },
    reset() {
      lastPath = "";
    },
  };
}

function safeCampaignValue(value: string | null) {
  return value && /^[A-Za-z0-9._~-]{1,64}$/.test(value) ? value : null;
}

export function buildGa4PageView(
  dispatch: AnalyticsDispatch | null,
  location: { origin: string; pathname: string; search?: string; referrer?: string }
) {
  if (!dispatch || dispatch.event !== "page_viewed") return null;
  const origin = /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(location.origin)
    ? location.origin
    : "https://thebeast.seangworld.com";
  const context = classifyBeastRoute(location.pathname);
  const safePath = ["analytics", context.registration.productId, context.workspaceId || context.moduleId || "entry"]
    .map((part) => part.replace(/[^a-z0-9_]/g, ""))
    .join("/");
  const source = new URLSearchParams(location.search || "");
  const campaign = new URLSearchParams();
  for (const name of ["utm_source", "utm_medium", "utm_campaign"] as const) {
    const value = safeCampaignValue(source.get(name));
    if (value) campaign.set(name, value);
  }
  let pageReferrer: string | undefined;
  try {
    const referrer = new URL(location.referrer || "");
    if (referrer.protocol === "https:" || referrer.protocol === "http:") pageReferrer = referrer.origin;
  } catch {
    pageReferrer = undefined;
  }
  const query = campaign.toString();
  return {
    event: "page_view" as const,
    properties: {
      ...dispatch.properties,
      page_location: `${origin}/${safePath}${query ? `?${query}` : ""}`,
      ...(pageReferrer ? { page_referrer: pageReferrer } : {}),
    },
  };
}

export function normalizeAnalyticsPath(pathname: string) {
  const path = pathname.split(/[?#]/, 1)[0].replace(/\/+/g, "/");
  if (
    !path.startsWith("/") ||
    path.startsWith("/auth/") ||
    path === "/login" ||
    path === "/forgot-password" ||
    path === "/reset-password"
  ) {
    return "";
  }
  return path.length > 1 ? path.replace(/\/$/, "") : path;
}

const workspaceRegistry = new Set([
  "today",
  "calendar",
  "notifications",
  "messages",
  "timeline",
  "search",
  "relationships",
  "uploads",
  "dashboard",
  "coach",
  "income",
  "expenses",
  "bills",
  "debts",
  "payoff_plan",
  "retirement",
  "reports",
  "financial_health",
  "guidance_counselor",
  "educational_roadmap",
  "career_planning",
  "schools",
  "scholarships",
  "certifications",
  "conditions",
  "medications",
  "procedures",
  "vitals",
  "appointments",
  "documents",
  "ai_advisor",
  "property",
  "maintenance",
  "vehicles",
  "security",
  "analytics",
  "members",
  "roadmap",
  "platform_health",
]);

function safeWorkspaceId(segment: string | undefined) {
  const normalized = segment?.replaceAll("-", "_") || "";
  return workspaceRegistry.has(normalized) ? normalized : undefined;
}

export function classifyBeastRoute(pathname: string): AnalyticsContext {
  const path = normalizeAnalyticsPath(pathname) || "/";
  const segments = path.split("/").filter(Boolean);
  const dashboardIndex = segments.indexOf("dashboard");
  const route = dashboardIndex >= 0 ? segments.slice(dashboardIndex + 1) : [];
  const area = route[0] || "beastos";
  const workspaceId = safeWorkspaceId(route.at(-1));

  if (area === "money") {
    return {
      registration: beastAnalyticsProductRegistry[1],
      workspaceId,
      professionalId: route.includes("coach") ? "money_coach" : undefined,
    };
  }
  if (area === "education" || area === "learning") {
    return {
      registration: beastAnalyticsProductRegistry[2],
      workspaceId,
      professionalId: route.includes("guidance-counselor")
        ? "guidance_counselor"
        : undefined,
    };
  }
  if (area === "health") {
    return {
      registration: beastAnalyticsProductRegistry[3],
      workspaceId,
      professionalId: route.includes("ai-advisor")
        ? "health_advisor"
        : undefined,
    };
  }
  if (area === "home") {
    return {
      registration: beastAnalyticsProductRegistry[4],
      workspaceId,
    };
  }
  if (area === "security") {
    return {
      registration: beastAnalyticsProductRegistry[5],
      workspaceId,
    };
  }
  if (area === "admin") {
    return {
      registration: beastAnalyticsProductRegistry[6],
      workspaceId,
    };
  }
  return {
    registration: beastAnalyticsProductRegistry[0],
    moduleId:
      area === "goals" || area === "uploads" ? area : "beastos",
    workspaceId,
  };
}
