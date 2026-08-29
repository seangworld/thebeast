export const FIRST_PARTY_TELEMETRY_CONTRACT_VERSION = "ba-tel-001-v1";
export const FIRST_PARTY_TELEMETRY_RAW_RETENTION_DAYS = 180;
export const FIRST_PARTY_TELEMETRY_MINIMUM_COHORT = 5;

export const firstPartyTelemetryEventNames = [
  "onboarding_completed",
  "bill_created",
  "debt_created",
  "payment_recorded",
  "payoff_plan_viewed",
  "education_goal_created",
  "education_activity_completed",
  "education_course_created",
  "health_workspace_opened",
  "health_record_added",
  "appointment_record_added",
  "goal_created",
  "goal_completed",
  "document_uploaded",
  "document_processed",
  "document_viewed",
  "home_inventory_opened",
  "home_inventory_started",
  "home_inventory_confirmed",
  "home_inventory_exported",
  "professional_turn_started",
  "professional_turn_completed",
  "professional_turn_failed",
  "api_failure",
  "database_command_failed",
] as const;

export type FirstPartyTelemetryEventName =
  (typeof firstPartyTelemetryEventNames)[number];

export const firstPartyTelemetryModuleIds = [
  "beastos",
  "money",
  "education",
  "health",
  "goals",
  "documents",
  "home",
  "admin",
] as const;

export type FirstPartyTelemetryModuleId =
  (typeof firstPartyTelemetryModuleIds)[number];

export const firstPartyTelemetryProfessionalIds = [
  "fusion_director",
  "money_coach",
  "guidance_counselor",
  "tutor",
  "health_advisor",
] as const;

export type FirstPartyTelemetryProfessionalId =
  (typeof firstPartyTelemetryProfessionalIds)[number];

export const firstPartyTelemetryOutcomes = [
  "started",
  "completed",
  "success",
  "failed",
  "timeout",
] as const;

export type FirstPartyTelemetryOutcome =
  (typeof firstPartyTelemetryOutcomes)[number];

export const firstPartyTelemetryErrorCategories = [
  "authorization",
  "configuration",
  "database",
  "network",
  "not_found",
  "provider",
  "rate_limited",
  "timeout",
  "validation",
  "unknown",
] as const;

export type FirstPartyTelemetryErrorCategory =
  (typeof firstPartyTelemetryErrorCategories)[number];

export const firstPartyTelemetryPerformanceBuckets = [
  "under_1s",
  "1s_to_3s",
  "3s_to_10s",
  "over_10s",
  "unknown",
] as const;

export type FirstPartyTelemetryPerformanceBucket =
  (typeof firstPartyTelemetryPerformanceBuckets)[number];

export const firstPartyTelemetryModelRoutes = [
  "ordinary",
  "strong",
  "none",
] as const;

export type FirstPartyTelemetryModelRoute =
  (typeof firstPartyTelemetryModelRoutes)[number];

export const prohibitedFirstPartyTelemetryFields = [
  "name",
  "email",
  "address",
  "phone",
  "user_id",
  "member_id",
  "owner_id",
  "conversation_id",
  "prompt",
  "response",
  "message",
  "content",
  "notes",
  "goal_text",
  "filename",
  "file_content",
  "diagnosis",
  "medication",
  "symptom",
  "lab_value",
  "balance",
  "debt_amount",
  "bill_amount",
  "income_amount",
  "provider_token",
  "auth_secret",
] as const;

export const firstPartyTelemetryDerivedEvents = [
  "account_created",
  "email_verified",
  "onboarding_completed",
  "bill_created",
  "debt_created",
  "payment_recorded",
  "education_activity_completed",
  "health_record_added",
  "goal_created",
  "goal_completed",
  "document_uploaded",
  "professional_turn_completed",
] as const;

export type FirstPartyTelemetryRecordInput = {
  eventName: FirstPartyTelemetryEventName;
  moduleId: FirstPartyTelemetryModuleId;
  professionalId?: FirstPartyTelemetryProfessionalId | null;
  outcome: FirstPartyTelemetryOutcome;
  errorCategory?: FirstPartyTelemetryErrorCategory | null;
  performanceBucket?: FirstPartyTelemetryPerformanceBucket | null;
  modelRoute?: FirstPartyTelemetryModelRoute | null;
};

const allowedInputKeys = new Set([
  "eventName",
  "moduleId",
  "professionalId",
  "outcome",
  "errorCategory",
  "performanceBucket",
  "modelRoute",
]);

function oneOf<T extends readonly string[]>(values: T, value: unknown) {
  return typeof value === "string" && values.includes(value);
}

export function normalizeFirstPartyTelemetryRecord(
  value: unknown
): FirstPartyTelemetryRecordInput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => !allowedInputKeys.has(key))) return null;
  if (
    !oneOf(firstPartyTelemetryEventNames, input.eventName) ||
    !oneOf(firstPartyTelemetryModuleIds, input.moduleId) ||
    !oneOf(firstPartyTelemetryOutcomes, input.outcome)
  ) {
    return null;
  }
  if (
    input.professionalId != null &&
    !oneOf(firstPartyTelemetryProfessionalIds, input.professionalId)
  ) {
    return null;
  }
  if (
    input.errorCategory != null &&
    !oneOf(firstPartyTelemetryErrorCategories, input.errorCategory)
  ) {
    return null;
  }
  if (
    input.performanceBucket != null &&
    !oneOf(firstPartyTelemetryPerformanceBuckets, input.performanceBucket)
  ) {
    return null;
  }
  if (
    input.modelRoute != null &&
    !oneOf(firstPartyTelemetryModelRoutes, input.modelRoute)
  ) {
    return null;
  }
  return input as FirstPartyTelemetryRecordInput;
}

export function firstPartyPerformanceBucket(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return "unknown" as const;
  if (milliseconds < 1_000) return "under_1s" as const;
  if (milliseconds < 3_000) return "1s_to_3s" as const;
  if (milliseconds < 10_000) return "3s_to_10s" as const;
  return "over_10s" as const;
}

export function firstPartyProfessionalId(value: string) {
  if (value === "beastfusion.fusion-director") return "fusion_director" as const;
  if (value === "beastmoney.money-coach") return "money_coach" as const;
  if (value === "beasteducation.guidance-counselor") return "guidance_counselor" as const;
  if (value === "beasteducation.tutor") return "tutor" as const;
  if (value === "beasthealth.health-advisor") return "health_advisor" as const;
  return null;
}

export function firstPartyModuleForProfessional(value: string) {
  if (value === "beastmoney.money-coach") return "money" as const;
  if (value === "beasteducation.guidance-counselor" || value === "beasteducation.tutor") return "education" as const;
  if (value === "beasthealth.health-advisor") return "health" as const;
  return "beastos" as const;
}

export type FirstPartyTelemetryRetention = {
  day: 1 | 7 | 30;
  eligibleMembers: number;
  returnedMembers: number;
  rate: number | null;
  status: "available" | "insufficient_data";
};

export type FirstPartyTelemetrySnapshot = {
  contractVersion: typeof FIRST_PARTY_TELEMETRY_CONTRACT_VERSION;
  windowDays: number;
  generatedAt: string;
  environment: "development" | "test" | "preview" | "production";
  source: "canonical_records_and_bounded_events";
  historicalTreatment: "derived_from_canonical_records";
  rawEventRetentionDays: number;
  minimumCohortSize: number;
  coverage: { firstActivityAt: string | null; lastActivityAt: string | null };
  members: {
    registered: number;
    verified: number;
    onboardingCompleted: number;
    activated: number;
    activationRate: number | null;
  };
  ownerAdmin: { accounts: number; meaningfulActions: number };
  activity: { dau: number; wau: number; mau: number; meaningfulActions: number };
  retention: FirstPartyTelemetryRetention[];
  moduleAdoption: Array<{
    moduleId: FirstPartyTelemetryModuleId;
    moduleLabel: string;
    activatedMembers: number;
    meaningfulActions: number;
    adoptionRate: number | null;
  }>;
  crossModuleAdoption: Array<{
    minimumModules: 1 | 2 | 3;
    memberCount: number;
    rate: number | null;
    status: "available" | "insufficient_data";
  }>;
  professionalUsage: Array<{
    professionalId: FirstPartyTelemetryProfessionalId;
    turnsInitiated: number;
    turnsCompleted: number;
    successfulResponses: number;
    failures: number;
    timeouts: number;
    ordinaryRoutes: number;
    strongRoutes: number;
    medianLatencyMs: number | null;
    p95LatencyMs: number | null;
  }>;
  reliability: {
    successfulOperations: number;
    failures: number;
    timeouts: number;
    failureRate: number | null;
    errorCategories: Array<{ category: FirstPartyTelemetryErrorCategory; count: number }>;
  };
  funnel: Array<{
    stage: "account_created" | "email_verified" | "onboarding_completed" | "activated" | "returned";
    count: number;
  }>;
};

export function isFirstPartyTelemetrySnapshot(
  value: unknown
): value is FirstPartyTelemetrySnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const snapshot = value as Partial<FirstPartyTelemetrySnapshot>;
  return (
    snapshot.contractVersion === FIRST_PARTY_TELEMETRY_CONTRACT_VERSION &&
    typeof snapshot.windowDays === "number" &&
    typeof snapshot.generatedAt === "string" &&
    !Number.isNaN(Date.parse(snapshot.generatedAt)) &&
    snapshot.source === "canonical_records_and_bounded_events" &&
    snapshot.historicalTreatment === "derived_from_canonical_records" &&
    Boolean(snapshot.members) &&
    Boolean(snapshot.activity) &&
    Boolean(snapshot.ownerAdmin) &&
    Array.isArray(snapshot.retention) &&
    Array.isArray(snapshot.moduleAdoption) &&
    Array.isArray(snapshot.crossModuleAdoption) &&
    Array.isArray(snapshot.professionalUsage) &&
    Boolean(snapshot.reliability) &&
    Array.isArray(snapshot.funnel)
  );
}

export async function sendFirstPartyTelemetry(
  input: FirstPartyTelemetryRecordInput,
  fetchImplementation: typeof fetch = fetch
) {
  const normalized = normalizeFirstPartyTelemetryRecord(input);
  if (!normalized) return false;
  try {
    const response = await fetchImplementation("/api/telemetry/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(normalized),
      cache: "no-store",
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}
