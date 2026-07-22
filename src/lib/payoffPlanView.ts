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
};

type PayoffDebtSummary = { id: string; name: string; interest_rate: number };

export function buildPayoffPlanDisplayRows(
  result: Pick<UnifiedStrategyResult, "payoff_months">,
  debts: readonly PayoffDebtSummary[],
  startDate = new Date(),
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
