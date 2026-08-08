import {
  DigitalStaffServiceError,
  reportDigitalStaffError,
} from "./security";

const openAIResponsesEndpoint = "https://api.openai.com/v1/responses";

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
