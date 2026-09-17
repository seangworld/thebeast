import type { SupabaseClient } from "@supabase/supabase-js";
import { isDebtStrategy, type DebtStrategy } from "./debtStrategies";
import { parseCustomDebtOrder } from "./customDebtOrder";
import { roundMoney } from "./formatters";

export async function saveDebtStrategySettings(
  client: Pick<SupabaseClient, "auth" | "from">,
  input: { strategy: DebtStrategy; extraPayment: number; customDebtOrder?: string[] }
): Promise<{ ok: boolean; message: string }> {
  if (!isDebtStrategy(input.strategy) || !Number.isFinite(input.extraPayment) || input.extraPayment < 0 || input.extraPayment > 1_000_000_000) {
    return { ok: false, message: "Choose a strategy and a valid non-negative monthly extra payment." };
  }
  const order = parseCustomDebtOrder(input.customDebtOrder);
  if (input.strategy === "custom" && order.length === 0) {
    return { ok: false, message: "Set a custom payoff order in Payoff Plan before saving." };
  }
  try {
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return { ok: false, message: "Sign in again before saving your debt strategy." };
    const payload = {
      user_id: auth.user.id,
      strategy: input.strategy,
      extra_payment: input.strategy === "minimum" ? 0 : roundMoney(input.extraPayment),
      ...(input.strategy === "custom" ? { custom_debt_order: order } : {}),
    };
    const { data, error } = await client.from("debt_settings").upsert(payload, { onConflict: "user_id" })
      .select("*").single();
    if (error) return { ok: false, message: input.strategy === "custom" && ["42703", "PGRST204"].includes(error.code)
      ? "Custom payoff saving needs the database update. Your changes have not been saved."
      : "Could not save your debt strategy. Your edits are still here; please try again." };
    if (!data || data.user_id !== auth.user.id || data.strategy !== payload.strategy || Number(data.extra_payment) !== payload.extra_payment ||
        (input.strategy === "custom" && JSON.stringify(parseCustomDebtOrder(data.custom_debt_order)) !== JSON.stringify(order))) {
      return { ok: false, message: "Could not confirm the saved strategy. Refresh to check it before trying again." };
    }
    return { ok: true, message: "Debt settings saved. Paycheck suggestions will use this strategy; your manual assignments are unchanged." };
  } catch {
    return { ok: false, message: "Could not confirm the saved strategy. Refresh to check it before trying again." };
  }
}
