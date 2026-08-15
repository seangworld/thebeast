export type MemberErrorCategory =
  | "validation"
  | "unauthorized"
  | "not_found"
  | "temporarily_unavailable"
  | "conflict"
  | "retryable"
  | "upload"
  | "internal";

export type MemberOperation = "load" | "create" | "update" | "delete" | "upload" | "save" | "action";

export type MemberSafeError = Readonly<{
  category: MemberErrorCategory;
  message: string;
  status: number;
  retryable: boolean;
  correlationId?: string;
}>;

const copy: Record<MemberErrorCategory, Omit<MemberSafeError, "category" | "correlationId">> = {
  validation: { message: "Check the highlighted information and try again.", status: 400, retryable: false },
  unauthorized: { message: "Sign in again or ask for access before trying this action.", status: 403, retryable: false },
  not_found: { message: "That item is no longer available. Refresh and try again.", status: 404, retryable: false },
  temporarily_unavailable: { message: "This workspace is temporarily unavailable. Please try again shortly.", status: 503, retryable: true },
  conflict: { message: "This item changed before your update was saved. Refresh and try again.", status: 409, retryable: false },
  retryable: { message: "We could not complete that request. Please try again.", status: 502, retryable: true },
  upload: { message: "The file could not be uploaded. Check the file and try again.", status: 422, retryable: true },
  internal: { message: "Something went wrong. Please try again.", status: 500, retryable: true },
};

type ErrorShape = { code?: unknown; status?: unknown; statusCode?: unknown; name?: unknown; message?: unknown };

export function classifyMemberError(error: unknown, operation: MemberOperation = "action"): MemberErrorCategory {
  const value = error && typeof error === "object" ? error as ErrorShape : {};
  const code = typeof value.code === "string" ? value.code.toLowerCase() : "";
  const status = Number(value.status ?? value.statusCode);
  const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
  if (operation === "upload" || /storage|bucket|payload too large|mime/.test(`${code} ${message}`)) return "upload";
  if (status === 401 || status === 403 || /unauthorized|forbidden|permission|row.level.security|policy/.test(`${code} ${message}`)) return "unauthorized";
  if (status === 404 || code === "pgrst116" || /not found|no rows/.test(message)) return "not_found";
  if (status === 409 || /23505|409|duplicate|conflict|unique/.test(`${code} ${message}`)) return "conflict";
  if (status === 400 || status === 422 || /validation|invalid input|23502|23514/.test(`${code} ${message}`)) return "validation";
  if (status === 429 || status === 502 || status === 504 || /timeout|rate limit|connection|network/.test(`${code} ${message}`)) return "retryable";
  if (status === 503 || /unavailable|maintenance/.test(message)) return "temporarily_unavailable";
  return "internal";
}

export function toMemberSafeError(
  error: unknown,
  options: { operation?: MemberOperation; correlationId?: string } = {}
): MemberSafeError {
  const category = classifyMemberError(error, options.operation);
  return { category, ...copy[category], ...(options.correlationId ? { correlationId: options.correlationId } : {}) };
}

export function memberSafeMessage(
  error: unknown,
  operation?: MemberOperation,
  safeGuidance: readonly string[] = []
): string {
  if (error instanceof Error && safeGuidance.includes(error.message)) {
    return error.message;
  }
  return toMemberSafeError(error, { operation }).message;
}
