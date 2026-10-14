/**
 * Agency-only write-origin policy; preview access is opt-in and fail-closed.
 * This module has no imports, clients, process.env reads, or network access.
 * VERCEL_URL is trusted only as platform configuration in an explicitly approved
 * isolated custom target. Request headers never supply an allowed hostname.
 */
export const AGENCY_PRODUCTION_ORIGIN = "https://thebeast.seangworld.com";
export const AGENCY_PRODUCTION_SUPABASE_REF = "grpyzwvgqiwtxadfdtni";

export type AgencyWriteEnvironment = Readonly<Record<string, string | undefined> & {
  VERCEL?: string;
  VERCEL_ENV?: string;
  VERCEL_TARGET_ENV?: string;
  VERCEL_URL?: string;
  AGENCY_PREVIEW_WRITES_ENABLED?: string;
  AGENCY_PREVIEW_TARGET_ENV?: string;
  AGENCY_PREVIEW_SUPABASE_URL?: string;
}>;

export type AgencyWriteInput = Readonly<{
  method: string;
  origin: string | null;
  requestUrl: string;
  effectiveSupabaseUrl?: string;
}>;

export type AgencyWriteDecision =
  | { allowed: true; target: "production" | "isolated_preview"; origin: string }
  | { allowed: false; reason: "method" | "environment" | "disabled" | "hostname" | "origin" | "request_url" | "isolation" };

const reservedTargets = new Set(["production", "preview", "development"]);
const customTargetPattern = /^[a-z][a-z0-9-]{0,62}$/;
// A single canonical generated Vercel hostname. This is syntax validation only:
// admission still requires exact equality with this deployment's VERCEL_URL.
const deploymentHostnamePattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.vercel\.app$/;
const isolatedSupabaseUrlPattern = /^https:\/\/([a-z0-9]{20})\.supabase\.co$/;

export function evaluateAgencyWritePolicy(input: AgencyWriteInput, env: AgencyWriteEnvironment): AgencyWriteDecision {
  if (input.method !== "POST") return { allowed: false, reason: "method" };

  // Preserve the old production Origin rule. TARGET_ENV may be absent in older
  // production configurations; an explicit contradictory target is denied.
  // No preview flags, request-URL rule, or database pin alter this branch.
  if (env.VERCEL_ENV === "production" &&
      (env.VERCEL_TARGET_ENV === undefined || env.VERCEL_TARGET_ENV === "production")) {
    return input.origin === AGENCY_PRODUCTION_ORIGIN
      ? { allowed: true, target: "production", origin: AGENCY_PRODUCTION_ORIGIN }
      : { allowed: false, reason: "origin" };
  }

  const approvedTarget = env.AGENCY_PREVIEW_TARGET_ENV;
  if (env.VERCEL !== "1" || env.VERCEL_ENV !== "preview" || !approvedTarget ||
      approvedTarget !== approvedTarget.trim() || !customTargetPattern.test(approvedTarget) || reservedTargets.has(approvedTarget) ||
      env.VERCEL_TARGET_ENV !== approvedTarget) {
    return { allowed: false, reason: "environment" };
  }
  if (env.AGENCY_PREVIEW_WRITES_ENABLED !== "true") return { allowed: false, reason: "disabled" };

  const hostname = env.VERCEL_URL;
  if (!hostname || hostname !== hostname.trim() || !deploymentHostnamePattern.test(hostname)) return { allowed: false, reason: "hostname" };
  const origin = `https://${hostname}`;
  if (input.origin !== origin) return { allowed: false, reason: "origin" };

  try {
    const destination = new URL(input.requestUrl);
    if (/[\x00-\x20\x7f]/.test(input.requestUrl) || destination.origin !== origin || destination.username || destination.password) {
      return { allowed: false, reason: "request_url" };
    }
  } catch {
    return { allowed: false, reason: "request_url" };
  }

  const expectedUrl = env.AGENCY_PREVIEW_SUPABASE_URL;
  const expectedProject = expectedUrl?.match(isolatedSupabaseUrlPattern)?.[1];
  if (!expectedProject || expectedUrl !== expectedUrl?.trim() || expectedProject === AGENCY_PRODUCTION_SUPABASE_REF || input.effectiveSupabaseUrl !== expectedUrl) {
    return { allowed: false, reason: "isolation" };
  }
  return { allowed: true, target: "isolated_preview", origin };
}

type AgencyWriteRequest = Request;

/**
 * Thin injectable wrapper. The supplied configuration getter must be read-only
 * and return the URL used by the existing Supabase client factory. This wrapper
 * does not replace socialOwner's session, profile, or admin checks.
 */
export async function agencyWriteOwner<T>(request: AgencyWriteRequest, dependencies: {
  env: AgencyWriteEnvironment;
  getEffectiveSupabaseUrl: () => string;
  socialOwner: (request?: AgencyWriteRequest) => Promise<T | null>;
}): Promise<T | null> {
  let effectiveSupabaseUrl: string | undefined;
  if (dependencies.env.VERCEL_ENV === "preview") {
    try { effectiveSupabaseUrl = dependencies.getEffectiveSupabaseUrl(); }
    catch { return null; }
  }
  const decision = evaluateAgencyWritePolicy({
    method: request.method,
    origin: request.headers.get("origin"),
    requestUrl: request.url,
    effectiveSupabaseUrl,
  }, dependencies.env);
  if (!decision.allowed) return null;
  return decision.target === "production"
    ? dependencies.socialOwner(request)
    : dependencies.socialOwner();
}
