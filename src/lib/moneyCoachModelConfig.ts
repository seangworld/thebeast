/** Money-only bounded candidates. Selection is provisional until independent financial grading. */
export const moneyCoachModelConfigurations = {
  "luna-medium-v1": { model: "gpt-5.6-luna", reasoningEffort: "medium", maxOutputTokens: 4800 },
  "sol-high-v1": { model: "gpt-6.1-sol", reasoningEffort: "high", maxOutputTokens: 4800 },
} as const;
export function moneyCoachModelConfiguration(id = process.env.BEAST_MONEY_COACH_MODEL_CONFIG) {
  if (!id) return null; // Retain the existing model selector until an explicit candidate is configured.
  if (!Object.hasOwn(moneyCoachModelConfigurations,id)) throw new Error("Unsupported Money Coach model configuration.");
  return moneyCoachModelConfigurations[id as keyof typeof moneyCoachModelConfigurations];
}
export function moneyCoachProviderLimits(model: string) {
  return { reasoning: { effort: model === "gpt-6.1-sol" ? "high" : "medium" }, max_output_tokens: 4800, service_tier: "default" };
}
export const moneyCoachRequestLimits = Object.freeze({ maxInputCharacters: 96_000, maximumPlanCalls: 1, automaticRetries: 0, timeoutMs: 60_000 });
