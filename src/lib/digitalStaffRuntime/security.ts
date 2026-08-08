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
    detail: sanitizedErrorDetail(error),
  });
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
