export type OwnerProviderAction = {
  provider: "OpenAI" | "Shotstack";
  reason: "credits_required";
  label: string;
  url: string;
};

export const OPENAI_BILLING_ACTION: OwnerProviderAction = {
  provider: "OpenAI",
  reason: "credits_required",
  label: "Open OpenAI Billing",
  url: "https://platform.openai.com/settings/organization/billing/overview",
};

export function normalizeOwnerProviderAction(value: unknown): OwnerProviderAction | null {
  if (!value || typeof value !== "object") return null;
  const action = value as Record<string, unknown>;
  if (action.provider !== "OpenAI" && action.provider !== "Shotstack") return null;
  if (action.reason !== "credits_required" || typeof action.label !== "string" || typeof action.url !== "string") return null;
  try {
    const url = new URL(action.url);
    if (url.protocol !== "https:" || !["platform.openai.com", "dashboard.shotstack.io"].includes(url.hostname)) return null;
  } catch {
    return null;
  }
  return action as OwnerProviderAction;
}
