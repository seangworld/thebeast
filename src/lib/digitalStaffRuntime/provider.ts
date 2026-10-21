import { consumeResponseStream, newStreamDiagnostic } from "./providerStream";
import { prepareEvaluationCall } from "./evaluationProviderHook";
import {
  classifyDigitalStaffFailure,
  DigitalStaffServiceError,
  reportDigitalStaffError,
} from "./security";

const openAIResponsesEndpoint = "https://api.openai.com/v1/responses";
export const digitalStaffProviderTimeoutMs = 60_000;

function normalizedOpenAIKey(value: string | undefined) {
  const key = value?.trim() || "";
  const tokenStarts = key.match(/sk-/g)?.length || 0;
  if (
    !key.startsWith("sk-") ||
    tokenStarts !== 1 ||
    /\s|,|\bbearer\b/i.test(key)
  ) {
    throw new Error("OpenAI provider authentication is not configured safely.");
  }
  return key;
}

export function createOpenAIRequestHeaders(
  requestId: string,
  apiKey = process.env.OPENAI_API_KEY
) {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${normalizedOpenAIKey(apiKey)}`);
  headers.set("Content-Type", "application/json");
  headers.set("X-Client-Request-Id", requestId);
  return headers;
}

function safeProviderDiagnosticValue(value: unknown) {
  return typeof value === "string" && /^[a-z0-9_.-]{1,80}$/i.test(value)
    ? value
    : null;
}

async function openAIProviderStatusError(response: Response) {
  let errorType: string | null = null;
  let errorCode: string | null = null;
  try {
    const payload = await response.json() as { error?: { type?: unknown; code?: unknown } };
    errorType = safeProviderDiagnosticValue(payload.error?.type);
    errorCode = safeProviderDiagnosticValue(payload.error?.code);
  } catch {
    // The HTTP status remains the safe fallback when the provider body is absent or malformed.
  }
  const diagnostic = [
    errorType ? `type=${errorType}` : null,
    errorCode ? `code=${errorCode}` : null,
  ].filter(Boolean).join(", ");
  return new Error(`OpenAI Responses API returned status ${response.status}${diagnostic ? ` (${diagnostic})` : ""}.`);
}

export async function requestOpenAIResponse<T>(
  body: unknown,
  options: {
    fetchImpl?: typeof fetch;
    apiKey?: string;
    requestId?: string;
    signal?: AbortSignal;
  } = {}
) {
  const requestId = options.requestId || crypto.randomUUID();
  const reservation = prepareEvaluationCall(body, requestId);
  const guardedBody = reservation?.body ?? body;
  try {
    const response = await (options.fetchImpl || fetch)(openAIResponsesEndpoint, {
      method: "POST",
      headers: createOpenAIRequestHeaders(requestId, options.apiKey),
      body: JSON.stringify(guardedBody),
      signal: options.signal,
    });
    if (!response.ok) {
      throw await openAIProviderStatusError(response);
    }
    const payload = (await response.json()) as T;
    reservation?.settle(payload);
    return payload;
  } catch (error) {
    reservation?.unknown();
    const category = classifyDigitalStaffFailure("openai-responses", error);
    reportDigitalStaffError("openai-responses", error, requestId);
    throw new DigitalStaffServiceError(requestId, category);
  }
}

export async function requestOpenAIResponseStream<T>(
  body: unknown,
  options: {
    apiKey?: string;
    requestId?: string;
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
    timeoutMs?: number;
    onOutputTextDelta?: (delta: string) => void | Promise<void>;
    onFirstEvent?: () => void;
    onFirstOutput?: () => void;
    onResponseHeaders?: () => void;
    onComplete?: () => void;
  } = {}
) {
  const requestId = options.requestId || crypto.randomUUID();
  const reservation = prepareEvaluationCall(body, requestId);
  const guardedBody = reservation?.body ?? body;
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? digitalStaffProviderTimeoutMs;
  let timedOut = false;
  const diagnostic = newStreamDiagnostic();
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abortFromCaller();
  else options.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error(`OpenAI provider timed out after ${timeoutMs}ms.`));
  }, timeoutMs);
  try {
    const response = await (options.fetchImpl || fetch)(openAIResponsesEndpoint, {
      method: "POST",
      headers: createOpenAIRequestHeaders(requestId, options.apiKey),
      body: JSON.stringify({ ...(guardedBody as Record<string, unknown>), stream: true }),
      signal: controller.signal,
    });
    diagnostic.httpStatus = response.status;
    diagnostic.providerRequestId = response.headers.get("x-request-id")?.slice(0, 256) || null;
    if (!response.ok || !response.body) {
      throw await openAIProviderStatusError(response);
    }
    options.onResponseHeaders?.();
    const completed = await consumeResponseStream<T>(response.body.getReader(), diagnostic, {
      onFirstEvent: options.onFirstEvent,
      onFirstOutput: options.onFirstOutput,
      onDelta: options.onOutputTextDelta,
    });
    reservation?.diagnostic?.(diagnostic);
    reservation?.settle(completed);
    options.onComplete?.();
    return completed;
  } catch (error) {
    diagnostic.failure ??= { name: error instanceof Error ? error.name.slice(0, 100) : "UnknownError", message: error instanceof Error ? error.message.slice(0, 2048) : "Non-Error provider failure" };
    if (timedOut) diagnostic.outcome = "timeout";
    else if (options.signal?.aborted) diagnostic.outcome = "caller_abort";
    reservation?.unknown(diagnostic);
    const reported = timedOut
      ? new Error(`OpenAI provider timed out after ${timeoutMs}ms.`)
      : options.signal?.aborted
        ? new Error("OpenAI provider request was aborted by the caller.")
        : error;
    reportDigitalStaffError("openai-responses-stream", reported, requestId);
    throw new DigitalStaffServiceError(
      requestId,
      classifyDigitalStaffFailure("openai-responses-stream", reported)
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}
