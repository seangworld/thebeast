export const digitalStaffUnavailableMessage =
  "The Digital Staff service is temporarily unavailable. Please try again.";

const secretPatterns: Array<[RegExp, string]> = [
  [/(authorization\s*["']?\s*[:=]\s*)[^\r\n}]+/gi, "$1[REDACTED]"],
  [/\bbearer\s+[^\s,"';}\]]+/gi, "Bearer [REDACTED]"],
  [/\bsk-proj-[A-Za-z0-9_-]{6,}\b/g, "[REDACTED_OPENAI_KEY]"],
  [/\bsk-[A-Za-z0-9_-]{6,}\b/g, "[REDACTED_OPENAI_KEY]"],
  [/\bsbp_[A-Za-z0-9_-]{6,}\b/g, "[REDACTED_SUPABASE_TOKEN]"],
  [/\bsb_secret_[A-Za-z0-9_-]{6,}\b/g, "[REDACTED_SUPABASE_SECRET]"],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, "[REDACTED_JWT]"],
  [/\b(?:vercel_|vc[ap]_)[A-Za-z0-9._-]{6,}\b/gi, "[REDACTED_VERCEL_TOKEN]"],
  [/(\b(?:OPENAI_API_KEY|VERCEL_TOKEN|SUPABASE_ACCESS_TOKEN|SUPABASE_SERVICE_ROLE_KEY)\b\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]"],
  [/(\b(?:service[_ -]?role(?:[_ -]?key)?|supabase[_ -]?service[_ -]?key)\b\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]"],
];

export function sanitizeSecretText(value: string) {
  return secretPatterns.reduce(
    (sanitized, [pattern, replacement]) => sanitized.replace(pattern, replacement),
    value
  );
}

export function sanitizedErrorDetail(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return sanitizeSecretText(raw).replace(/[\r\n]+/g, " ").slice(0, 500);
}

export class DigitalStaffServiceError extends Error {
  readonly requestId: string;

  constructor(requestId: string) {
    super(digitalStaffUnavailableMessage);
    this.name = "DigitalStaffServiceError";
    this.requestId = requestId;
  }
}

export function digitalStaffRequestId(error: unknown, fallback: string) {
  return error instanceof DigitalStaffServiceError ? error.requestId : fallback;
}

export function reportDigitalStaffError(
  scope: string,
  error: unknown,
  requestId: string
) {
  console.error("Digital Staff request failed.", {
    scope,
    requestId,
    category: classifyDigitalStaffFailure(scope, error),
    detail: sanitizedErrorDetail(error),
  });
}

export function classifyDigitalStaffFailure(scope: string, error: unknown) {
  const detail = sanitizedErrorDetail(error).toLowerCase();
  if (/timed out|timeout/.test(detail)) return "provider_timeout";
  if (/aborted by the caller/.test(detail)) return "request_aborted";
  if (/canonical context query failed/.test(detail)) return "database_context_failure";
  if (/authentication|required|unauthori[sz]ed|jwt|session/.test(detail)) return "auth_failure";
  if (/proposal.*(not available|not found)|not found/.test(detail)) return "proposal_not_found";
  if (/outside the canonical|cannot persist|unsupported|unknown digital/.test(detail)) return "unsupported_proposal_type";
  if (/rls|row-level security|permission denied|policy/.test(detail)) return "rls_failure";
  if (/constraint|duplicate|violates/.test(detail)) return "database_constraint_failure";
  if (/json|serialize|parse/.test(detail)) return "serialization_failure";
  if (/validation|required|malformed/.test(detail)) return "validation_failure";
  if (/revalidat/.test(detail)) return "revalidation_failure";
  if (scope.includes("proposal")) return "canonical_writer_failure";
  return "provider_or_runtime_failure";
}

export function reportDigitalStaffLifecycle(
  requestId: string,
  professionalId: string,
  timings: Record<string, number | null>
) {
  console.info("Digital Staff lifecycle completed.", {
    requestId,
    professionalId,
    timings,
  });
}

export function safeDigitalStaffFailure(
  scope: string,
  error: unknown,
  fallbackRequestId: string
) {
  const requestId = digitalStaffRequestId(error, fallbackRequestId);
  reportDigitalStaffError(scope, error, requestId);
  return { error: digitalStaffUnavailableMessage, requestId };
}
