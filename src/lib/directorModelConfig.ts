/** Director-only reference configuration. This descriptor does not enable inference or authorize spending. */
export const directorModelConfig = Object.freeze({
  version: "sol-high-v1", model: "gpt-6.1-sol", reasoningEffort: "high", serviceTier: "default",
  maxOutputTokens: 4800, timeoutMs: 80_000, maxRequestBytes: 60_000, reservedInputTokens: 65_536,
  pricingDate: "2026-10-17", inputPerMillion: 2, cachedInputPerMillion: 0.10,
  cacheWritePerMillion: 2.50, outputPerMillion: 10,
  pricingSource: "https://developers.openai.com/api/docs/models/gpt-6.1-sol",
} as const);
export const directorMaximumCallUsd = (directorModelConfig.reservedInputTokens * (directorModelConfig.inputPerMillion + directorModelConfig.cacheWritePerMillion) + directorModelConfig.maxOutputTokens * directorModelConfig.outputPerMillion) / 1_000_000;
export type DirectorModelReceipt = {
  requestedModel: string; actualModel: string | null; reasoningEffort: string; serviceTier: string;
  status: string; latencyMs: number; inputTokens: number | null; outputTokens: number | null;
  cachedInputTokens: number | null; cacheWriteTokens: number | null; reasoningTokens: number | null;
  estimatedUsd: number | null; reservedUsd: number; configVersion: string;
};
