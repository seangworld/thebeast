import type { SupabaseClient } from "@supabase/supabase-js";

export const DEBT_PAYMENT_HISTORY_LIMIT = 250;
export const BILL_PAYMENT_HISTORY_LIMIT = 250;

type FinancialDataClient = Pick<SupabaseClient, "from">;

export async function loadCashFlowFinancialData(
  client: FinancialDataClient,
  userId: string,
  cycleMonth: string
) {
  const [
    incomeResult,
    billResult,
    billPaymentResult,
    debtPaymentResult,
    debtResult,
    cashSettingsResult,
    debtSettingsResult,
    fundingSourceResult,
  ] = await Promise.all([
    client
      .from("income_events")
      .select("*")
      .eq("user_id", userId)
      .order("next_date", { ascending: true }),
    client
      .from("bill_events")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true }),
    client
      .from("bill_payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(BILL_PAYMENT_HISTORY_LIMIT),
    client
      .from("debt_payments")
      .select("*")
      .eq("user_id", userId)
      .is("reversed_at", null)
      .order("payment_date", { ascending: false })
      .limit(DEBT_PAYMENT_HISTORY_LIMIT),
    client
      .from("debts")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true }),
    client
      .from("cash_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("debt_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("funding_sources")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  return {
    incomeRows: incomeResult.data,
    billRows: billResult.data,
    paymentRows: billPaymentResult.data,
    debtPaymentRows: debtPaymentResult.data,
    debtRows: debtResult.data,
    cashSettings: cashSettingsResult.data,
    debtSettings: debtSettingsResult.data,
    fundingSourceRows: fundingSourceResult.data,
  };
}

export async function loadDebtWorkspaceFinancialData(
  client: FinancialDataClient,
  userId: string
) {
  const [
    debtResult,
    debtPaymentResult,
    incomeResult,
    billResult,
    cashSettingsResult,
    fundingSourceResult,
    debtSettingsResult,
    velocitySettingsResult,
  ] = await Promise.all([
    client.from("debts").select("*").eq("user_id", userId),
    client
      .from("debt_payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(DEBT_PAYMENT_HISTORY_LIMIT),
    client
      .from("income_events")
      .select("*")
      .eq("user_id", userId)
      .order("next_date", { ascending: true }),
    client
      .from("bill_events")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true }),
    client
      .from("cash_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("funding_sources")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true),
    client
      .from("debt_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
    client
      .from("velocity_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return {
    debtRows: debtResult.data,
    debtPaymentRows: debtPaymentResult.data,
    incomeRows: incomeResult.data,
    billRows: billResult.data,
    cashSettings: cashSettingsResult.data,
    fundingSourceRows: fundingSourceResult.data,
    settings: debtSettingsResult.data,
    velocitySettingsRow: velocitySettingsResult.data,
  };
}
