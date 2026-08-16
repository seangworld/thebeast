import {
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

export async function requestOpenAIResponse<T>(
  body: unknown,
  options: {
    fetchImpl?: typeof fetch;
    apiKey?: string;
    requestId?: string;
  } = {}
) {
  const requestId = options.requestId || crypto.randomUUID();
  try {
    const response = await (options.fetchImpl || fetch)(openAIResponsesEndpoint, {
      method: "POST",
      headers: createOpenAIRequestHeaders(requestId, options.apiKey),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`OpenAI Responses API returned status ${response.status}.`);
    }
    return (await response.json()) as T;
  } catch (error) {
    reportDigitalStaffError("openai-responses", error, requestId);
    throw new DigitalStaffServiceError(requestId);
  }
}

type OpenAIStreamEvent = {
  type?: string;
  delta?: string;
  response?: unknown;
};

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
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? digitalStaffProviderTimeoutMs;
  let timedOut = false;
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
      body: JSON.stringify({ ...(body as Record<string, unknown>), stream: true }),
      signal: controller.signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`OpenAI Responses API returned status ${response.status}.`);
    }
    options.onResponseHeaders?.();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completed: T | null = null;
    let sawOutput = false;
    let sawEvent = false;
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const frames = buffer.split("\n\n");
      buffer = frames.pop() || "";
      for (const frame of frames) {
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          const event = JSON.parse(line.slice(6)) as OpenAIStreamEvent;
          if (!sawEvent) {
            sawEvent = true;
            options.onFirstEvent?.();
          }
          if (event.type === "response.output_text.delta" && event.delta) {
            if (!sawOutput) {
              sawOutput = true;
              options.onFirstOutput?.();
            }
            await options.onOutputTextDelta?.(event.delta);
          }
          if (event.type === "response.completed" && event.response) completed = event.response as T;
        }
      }
      if (done) break;
    }
    if (!completed) throw new Error("OpenAI streaming response did not complete safely.");
    options.onComplete?.();
    return completed;
  } catch (error) {
    const reported = timedOut
      ? new Error(`OpenAI provider timed out after ${timeoutMs}ms.`)
      : options.signal?.aborted
        ? new Error("OpenAI provider request was aborted by the caller.")
        : error;
    reportDigitalStaffError("openai-responses-stream", reported, requestId);
    throw new DigitalStaffServiceError(requestId);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }
}
