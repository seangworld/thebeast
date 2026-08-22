import {
  FIRST_PARTY_TELEMETRY_CONTRACT_VERSION,
  firstPartyModuleForProfessional,
  firstPartyPerformanceBucket,
  firstPartyProfessionalId,
  isFirstPartyTelemetrySnapshot,
  normalizeFirstPartyTelemetryRecord,
  type FirstPartyTelemetryErrorCategory,
  type FirstPartyTelemetryRecordInput,
} from "../firstPartyTelemetry";
import type { SeangworldProviderSnapshot } from "../seangworldIntelligence";
import { createAdminClient } from "../supabase/admin";
import type { createRouteClient } from "../supabase/server";

type RouteClient = ReturnType<typeof createRouteClient>;

export function firstPartyTelemetryEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env
) {
  if (environment.VERCEL_ENV === "production") return "production" as const;
  if (environment.VERCEL_ENV === "preview") return "preview" as const;
  if (environment.NODE_ENV === "test") return "test" as const;
  return "development" as const;
}

function safeDatabaseCode(error: unknown) {
  if (!error || typeof error !== "object") return "unknown";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_]{1,40}$/i.test(code)
    ? code
    : "unknown";
}

export async function recordServerFirstPartyTelemetry(input: {
  actorId: string;
  record: FirstPartyTelemetryRecordInput;
  environment?: Readonly<Record<string, string | undefined>>;
}) {
  const record = normalizeFirstPartyTelemetryRecord(input.record);
  if (!record) return false;
  const admin = createAdminClient();
  if (!admin) return false;
  const { error } = await admin.rpc("record_beast_telemetry_event", {
    p_actor_id: input.actorId,
    p_event_name: record.eventName,
    p_environment: firstPartyTelemetryEnvironment(input.environment),
    p_module_id: record.moduleId,
    p_professional_id: record.professionalId || null,
    p_outcome: record.outcome,
    p_error_category: record.errorCategory || null,
    p_performance_bucket: record.performanceBucket || null,
    p_model_route: record.modelRoute || null,
  });
  if (error) {
    console.warn("First-party telemetry write failed safely.", {
      event: record.eventName,
      code: safeDatabaseCode(error),
    });
    return false;
  }
  return true;
}

export function digitalStaffTelemetryRecord(input: {
  professionalId: string;
  status: "completed" | "failed";
  latencyMs: number;
  model?: string | null;
  errorCategory?: FirstPartyTelemetryErrorCategory;
}): FirstPartyTelemetryRecordInput | null {
  const professionalId = firstPartyProfessionalId(input.professionalId);
  if (!professionalId) return null;
  return {
    eventName:
      input.status === "completed"
        ? "professional_turn_completed"
        : "professional_turn_failed",
    moduleId: firstPartyModuleForProfessional(input.professionalId),
    professionalId,
    outcome: input.status === "completed" ? "success" : "failed",
    errorCategory:
      input.status === "failed" ? input.errorCategory || "unknown" : null,
    performanceBucket: firstPartyPerformanceBucket(input.latencyMs),
    modelRoute:
      input.status === "completed"
        ? input.model?.includes("luna")
          ? "ordinary"
          : "strong"
        : "none",
  };
}

export function firstPartyErrorCategoryFromDigitalStaff(value: string) {
  if (value.includes("timeout")) return "timeout" as const;
  if (value.includes("auth")) return "authorization" as const;
  if (value.includes("database") || value.includes("rls")) return "database" as const;
  if (value.includes("validation") || value.includes("unsupported")) return "validation" as const;
  if (value.includes("not_found")) return "not_found" as const;
  return "provider" as const;
}

function failedProvider(
  synchronizedAt: string,
  error: unknown
): SeangworldProviderSnapshot {
  const unavailable = safeDatabaseCode(error) === "PGRST202";
  const guidance = unavailable
    ? "Apply the approved BA-TEL-001 telemetry migration in this environment."
    : "First-party aggregate telemetry is temporarily unavailable. Member actions remain unaffected.";
  return {
    id: "first_party",
    label: "First-party ecosystem telemetry",
    status: unavailable ? "not_configured" : "unavailable",
    connectionStatus: unavailable ? "not_configured" : "unavailable",
    guidance,
    lastSynchronizationAt: synchronizedAt,
    lastSuccessfulSynchronizationAt: null,
    freshness: "unknown",
    dataThroughDate: null,
    reportingDelayDays: null,
    error: unavailable
      ? null
      : {
          code: "first_party_aggregation_unavailable",
          message: guidance,
          retryable: true,
        },
    data: null,
  };
}

export async function loadFirstPartyTelemetryProvider(
  client: RouteClient,
  reportingDays: number,
  generatedAt: string,
  environment: Readonly<Record<string, string | undefined>> = process.env
): Promise<SeangworldProviderSnapshot> {
  const environmentName = firstPartyTelemetryEnvironment(environment);
  const { data, error } = await client.rpc(
    "get_beast_admin_first_party_telemetry",
    {
      reporting_days: reportingDays,
      telemetry_environment: environmentName,
    }
  );
  if (error) return failedProvider(generatedAt, error);
  if (!isFirstPartyTelemetrySnapshot(data)) {
    return failedProvider(generatedAt, { code: "INVALID_CONTRACT" });
  }
  const hasData =
    data.members.registered > 0 ||
    data.ownerAdmin.accounts > 0 ||
    data.activity.meaningfulActions > 0;
  return {
    id: "first_party",
    label: "First-party ecosystem telemetry",
    status: hasData ? "configured" : "no_data",
    connectionStatus: hasData ? "connected" : "no_data",
    guidance: hasData
      ? "Privacy-preserving member aggregates are derived from canonical records and bounded operational events."
      : "The first-party provider is connected, but no canonical member or owner activity exists yet.",
    lastSynchronizationAt: generatedAt,
    lastSuccessfulSynchronizationAt: generatedAt,
    freshness: "current",
    dataThroughDate: data.coverage.lastActivityAt?.slice(0, 10) || null,
    reportingDelayDays: null,
    error: null,
    data: { firstPartyTelemetry: data },
  };
}

export function firstPartyTelemetryContractVersion() {
  return FIRST_PARTY_TELEMETRY_CONTRACT_VERSION;
}
