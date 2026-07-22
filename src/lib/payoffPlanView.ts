import { addMonthsClamped, formatMonthYear, roundMoney } from "./formatters";
import type { PayoffMonth, UnifiedStrategyResult } from "./unifiedStrategyEngine";

export const PAYOFF_OPTIONAL_COLUMNS = [
  { id: "month", label: "Month" },
  { id: "minimumPayment", label: "Minimum Payment" },
  { id: "remainingInterest", label: "Remaining Interest" },
  { id: "monthsRemaining", label: "Months Remaining" },
] as const;

export type PayoffOptionalColumn = (typeof PAYOFF_OPTIONAL_COLUMNS)[number]["id"];

export type PayoffPlanDisplayRow = PayoffMonth & {
  key: string;
  debtId?: string;
  apr: number;
  payoffDate: string;
  status: string;
  remainingInterest: number;
  totalProjectedInterest: number;
  monthsRemaining: number | null;
  suggestedPayment: number;
  suggestedPaymentSource: "money_coach" | "planned_fallback" | "minimum_fallback";
  suggestedPaymentLabel: string;
  suggestedPaymentWhy: string;
};

type PayoffDebtSummary = { id: string; name: string; interest_rate: number };

export type PayoffRecommendationInput =
  | "cash_flow"
  | "goals"
  | "debt_priorities"
  | "velocity_banking"
  | "emergency_fund"
  | "financial_story";

export type PayoffPaymentRecommendation = {
  debtId: string;
  amount: number;
  why: string;
  generatedAt: string;
  inputs: readonly PayoffRecommendationInput[];
};

export function resolveSuggestedPayment(row: PayoffMonth, debtId: string | undefined, recommendations: readonly PayoffPaymentRecommendation[]) {
  const recommendation = debtId ? recommendations.find((item) => item.debtId === debtId) : undefined;
  if (recommendation && Number.isFinite(recommendation.amount) && recommendation.amount >= Number(row.required_minimum || 0)) {
    return { amount: roundMoney(recommendation.amount), source: "money_coach" as const, label: "Money Coach recommendation", why: recommendation.why };
  }
  if (Number(row.total_payment || 0) > 0) {
    return { amount: roundMoney(row.total_payment), source: "planned_fallback" as const, label: "Planned payment fallback", why: "No Money Coach recommendation has been generated for this debt yet. Using the current Payoff Plan payment." };
  }
  return { amount: roundMoney(row.required_minimum), source: "minimum_fallback" as const, label: "Minimum payment fallback", why: "No Money Coach recommendation or planned payment is available yet. Using the required minimum payment." };
}

export function buildPayoffPlanDisplayRows(
  result: Pick<UnifiedStrategyResult, "payoff_months">,
  debts: readonly PayoffDebtSummary[],
  startDate = new Date(),
  recommendations: readonly PayoffPaymentRecommendation[] = [],
): PayoffPlanDisplayRow[] {
  const totalInterestByTarget = new Map<string, number>();
  const payoffMonthByTarget = new Map<string, number>();
  for (const row of result.payoff_months) {
    totalInterestByTarget.set(row.target, roundMoney((totalInterestByTarget.get(row.target) ?? 0) + Number(row.monthly_interest || 0)));
    if (row.paid_off) payoffMonthByTarget.set(row.target, row.month);
  }

  const remainingInterestByTarget = new Map(totalInterestByTarget);
  return result.payoff_months.map((row, index) => {
    const debt = debts.find((item) => item.name === row.target);
    const payoffMonth = payoffMonthByTarget.get(row.target);
    const remainingInterest = remainingInterestByTarget.get(row.target) ?? 0;
    const suggested = resolveSuggestedPayment(row, debt?.id, recommendations);
    remainingInterestByTarget.set(row.target, roundMoney(remainingInterest - Number(row.monthly_interest || 0)));
    return {
      ...row,
      key: `${row.month}-${row.target}-${index}`,
      debtId: debt?.id,
      apr: Number(debt?.interest_rate || 0),
      payoffDate: payoffMonth ? formatMonthYear(addMonthsClamped(startDate, payoffMonth)) : "Not projected",
      status: row.paid_off ? "Paid off" : row.warning || "On track",
      remainingInterest,
      totalProjectedInterest: totalInterestByTarget.get(row.target) ?? 0,
      monthsRemaining: payoffMonth ? Math.max(payoffMonth - row.month, 0) : null,
      suggestedPayment: suggested.amount,
      suggestedPaymentSource: suggested.source,
      suggestedPaymentLabel: suggested.label,
      suggestedPaymentWhy: suggested.why,
    };
  });
}

export function parsePayoffColumnPreference(value: string | null): PayoffOptionalColumn[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    const allowed = new Set(PAYOFF_OPTIONAL_COLUMNS.map((column) => column.id));
    return parsed.filter((item): item is PayoffOptionalColumn => typeof item === "string" && allowed.has(item as PayoffOptionalColumn));
  } catch {
    return [];
  }
}
