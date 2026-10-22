// Shared across the existing Tutor route and adapter; no retries or tool calls.
export const tutorRuntimeLimits = {
  routeMs: 150_000,
  providerMs: 45_000,
  transcriptionTokens: 2_000,
  teachingTokens: 3_000,
  safetyTokens: 1_200,
  responseBytes: 96_000,
  transcriptionCharacters: 8_000,
} as const;

export type LearningProviderReceipt = {
  stage: 'worksheet' | 'teaching';
  model: string;
  finishReason: string | null;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
  latencyMs: number;
  outcome: 'completed' | 'incomplete' | 'failed' | 'cancelled';
};

export function tutorDeadline(signal?: AbortSignal, timeoutMs: number = tutorRuntimeLimits.routeMs) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, {once:true});
  const expire = () => controller.abort(new Error('Tutor deadline exceeded.'));
  const timer = Number.isFinite(timeoutMs) && timeoutMs > 0 ? setTimeout(expire, timeoutMs) : undefined;
  if (!timer) expire();
  return { signal:controller.signal, dispose:() => {clearTimeout(timer); signal?.removeEventListener('abort', abort);} };
}

export async function readBoundedLearningJSON(response: Response, signal: AbortSignal) {
  if (!response.body) throw new Error('Missing provider body.');
  const reader = response.body.getReader();
  let bytes = 0;
  const chunks: Uint8Array[] = [];
  const abort = () => { void reader.cancel().catch(() => {}); };
  signal.addEventListener('abort', abort, {once:true});
  try {
    signal.throwIfAborted();
    while (true) {
      const next = await reader.read();
      signal.throwIfAborted();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > tutorRuntimeLimits.responseBytes) throw new Error('Provider body exceeded limit.');
      chunks.push(next.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      model?: string;
      choices?: {finish_reason?: string; message?: {content?: string; refusal?: string}}[];
      usage?: {prompt_tokens?: number; completion_tokens?: number; total_tokens?: number};
    };
  } finally {
    signal.removeEventListener('abort', abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
