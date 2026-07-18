export type FundingClass = "cash" | "secured_credit" | "unsecured_credit" | "revolving_spending" | "promotional_balance_transfer";
export type FundingRuleSource = { id?: string; name?: string | null; type?: string | null; current_balance?: number | string | null; credit_limit?: number | string | null; available_credit?: number | string | null; interest_rate?: number | string | null; max_utilization_percent?: number | string | null; is_active?: boolean | null };
const number = (value: unknown) => Math.max(0, Number(value) || 0);
export function classifyFundingSource(source: FundingRuleSource): FundingClass {
  const type = `${source.type || ""} ${source.name || ""}`.toLowerCase();
  if (/checking|savings|cash/.test(type)) return "cash";
  if (/heloc|home equity/.test(type)) return "secured_credit";
  if (/ploc|personal line|personal loan/.test(type)) return "unsecured_credit";
  if (/balance transfer|promo/.test(type)) return "promotional_balance_transfer";
  return "revolving_spending";
}
export function mayFundDebtPayment(source: FundingRuleSource) {
  return ["cash", "secured_credit", "unsecured_credit"].includes(classifyFundingSource(source));
}
export function eligibleBorrowingCapacity(source: FundingRuleSource, targetApr: number) {
  if (!mayFundDebtPayment(source) || classifyFundingSource(source) === "cash") return 0;
  const apr = number(source.interest_rate); if (apr <= 0 || apr >= targetApr) return 0;
  const limit = number(source.credit_limit), balance = number(source.current_balance);
  const available = Math.max(0, number(source.available_credit) || limit - balance);
  const ceiling = limit * ((number(source.max_utilization_percent) || 100) / 100);
  return Math.max(0, Math.min(available, ceiling - balance));
}
export function fundingTrace(sources: FundingRuleSource[], targetApr: number, cashAmount: number) {
  const eligible = sources.filter((source) => source.is_active !== false && mayFundDebtPayment(source));
  return { cashAmount, borrowedAmount: eligible.reduce((sum, source) => sum + eligibleBorrowingCapacity(source, targetApr), 0), sources: eligible.map((source) => ({ name: source.name || "Funding source", classification: classifyFundingSource(source), eligible: eligibleBorrowingCapacity(source, targetApr) > 0 })) };
}
