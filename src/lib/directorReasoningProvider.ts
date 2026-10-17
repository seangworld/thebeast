import { requestOpenAIResponse } from "./digitalStaffRuntime/provider";
import { acquireDigitalStaffRequestLease } from "./digitalStaffRuntime/requestBudget";
import { directorModelConfig as config, directorMaximumCallUsd, type DirectorModelReceipt } from "./directorModelConfig";
import { directorExecutionInstructions, directorExecutionSchema, reasoningInput, validateDirectorReasoning, type DirectorReasoningContext } from "./directorReasoning";

/** Disabled until explicitly configured. Tests inject transport; never silently substitute a script for AI. */
export function directorReasoningAvailable() {
  return process.env.BEAST_DIRECTOR_REASONING_ENABLED === "true" && process.env.BEAST_DIRECTOR_MODEL_CONFIG === config.version && Boolean(process.env.OPENAI_API_KEY);
}

export async function reasonAboutDirectorObjective(ownerId: string, context: DirectorReasoningContext, signal?: AbortSignal, transport = requestOpenAIResponse, receipt?: (value: DirectorModelReceipt) => void) {
  if (!directorReasoningAvailable()) throw new Error("Director AI planning is not enabled. Real-model evaluation and spending authorization remain required.");
  const body = directorReasoningRequest(context);
  const lease = acquireDigitalStaffRequestLease(ownerId, "beastfusion.fusion-director");
  if (!lease.ok) throw new Error("Another Director request is active or the request budget was reached.");
  const started = Date.now();
  const usage: DirectorModelReceipt = { requestedModel: config.model, actualModel: null, reasoningEffort: config.reasoningEffort, serviceTier: config.serviceTier, status: "transport_failed", latencyMs: 0, inputTokens: null, outputTokens: null, cachedInputTokens: null, cacheWriteTokens: null, reasoningTokens: null, estimatedUsd: null, reservedUsd: directorMaximumCallUsd, configVersion: config.version };
  try {
    const payload = await transport<{ status?: string; incomplete_details?: { reason?: string }; output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }>; model?: string; service_tier?: string; usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number }; output_tokens_details?: { reasoning_tokens?: number } } }>(body, { signal: AbortSignal.any([signal || new AbortController().signal, AbortSignal.timeout(config.timeoutMs)]) });
    usage.actualModel = payload.model || null; usage.status = payload.status || "unknown";
    usage.serviceTier = payload.service_tier || "unknown";
    const count = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
    usage.inputTokens = count(payload.usage?.input_tokens); usage.outputTokens = count(payload.usage?.output_tokens);
    usage.cachedInputTokens = count(payload.usage?.input_tokens_details?.cached_tokens);
    usage.cacheWriteTokens = count(payload.usage?.input_tokens_details?.cache_write_tokens);
    usage.reasoningTokens = count(payload.usage?.output_tokens_details?.reasoning_tokens);
    // Usage-derived estimate, not invoice reconciliation. Missing cache categories receive no discount.
    if (usage.inputTokens !== null && usage.outputTokens !== null) {
      const cached = usage.cachedInputTokens || 0, writes = usage.cacheWriteTokens || 0;
      if (cached + writes <= usage.inputTokens) usage.estimatedUsd = ((usage.inputTokens - cached - writes) * config.inputPerMillion + cached * config.cachedInputPerMillion + writes * config.cacheWritePerMillion + usage.outputTokens * config.outputPerMillion) / 1_000_000;
    }
    if (usage.actualModel !== config.model || usage.serviceTier !== config.serviceTier) throw new Error("Director provider identity or tier differs from the approved configuration. No plan saved.");
    if (payload.status !== "completed") throw new Error("Director response incomplete or refused. No plan or assignment was saved; no automatic retry.");
    if (usage.inputTokens === null || usage.outputTokens === null || usage.estimatedUsd === null || usage.inputTokens > config.reservedInputTokens || usage.outputTokens > config.maxOutputTokens || (usage.reasoningTokens || 0) > usage.outputTokens) throw new Error("Director provider usage is unknown or outside the configured allowance. No plan saved.");
    const text = payload.output_text || payload.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("Director returned no plan or refused the request.");
    let value;
    try { value = JSON.parse(text); } catch { throw new Error("Director response was not complete JSON. Nothing was assigned; request a new plan only under authorized inference limits."); }
    if (value?.contractVersion !== 2) throw new Error("Director returned an unsupported execution contract. No plan saved.");
    return validateDirectorReasoning(value, context);
  } finally { lease.release(); usage.latencyMs = Date.now() - started; receipt?.(usage); }
}

/** Same bounded request builder for production and offline evaluation preparation. No credential access. */
export function directorReasoningRequest(context: DirectorReasoningContext) {
  const input = reasoningInput(context);
  if (input.length > 24_000) throw new Error("Director evidence exceeds the planning budget. Narrow the objective.");
  const body = {
    model: config.model, service_tier: config.serviceTier, store: false,
    max_output_tokens: config.maxOutputTokens, reasoning: { effort: config.reasoningEffort },
    instructions: directorExecutionInstructions, input,
    text: { format: { type: "json_schema", name: "director_objective_plan", strict: true, schema: directorExecutionSchema } },
  };
  if (new TextEncoder().encode(JSON.stringify(body)).length > config.maxRequestBytes) throw new Error("Director request exceeds the reserved token budget. No provider call made.");
  return body;
}
