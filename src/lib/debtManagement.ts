import { addMonthsClamped } from "./formatters";

export type DebtDueStatus = "Upcoming" | "Due Soon" | "Due Today" | "Overdue" | "Paid";
export type DebtPaymentAction =
  | "minimum"
  | "full_balance"
  | "custom"
  | "statement_balance"
  | "skip"
  | "paid_outside_beast";

export type DebtPaymentMode = "minimum" | "minimum_plus_extra" | "custom";

export function getDebtPaymentWarning({ balance, minimumPayment, amount }: { balance: number; minimumPayment: number; amount: number }) {
  if (amount > Math.max(Number(balance || 0), 0)) return "Payment is greater than the current balance and will be capped at the balance.";
  if (amount > 0 && amount < Math.max(Number(minimumPayment || 0), 0)) return "This payment is below the configured minimum; Beast will record the amount you entered.";
  return null;
}

/** Resolve the member-entered payment amount before the canonical payment writer runs. */
export function calculateDebtPaymentAmount({
  balance,
  minimumPayment,
  mode,
  extraPayment = 0,
  customAmount = 0,
}: {
  balance: number;
  minimumPayment: number;
  mode: DebtPaymentMode;
  extraPayment?: number;
  customAmount?: number;
}) {
  const currentBalance = Math.max(Number(balance || 0), 0);
  const minimum = Math.max(Number(minimumPayment || 0), 0);
  if (mode === "minimum_plus_extra") {
    return Math.min(currentBalance, minimum + Math.max(Number(extraPayment || 0), 0));
  }
  if (mode === "custom") return Math.max(Number(customAmount || 0), 0);
  return Math.min(currentBalance, minimum);
}

export type DebtDueState = {
  status: DebtDueStatus;
  daysUntilDue: number | null;
  daysLate: number | null;
  badgeClassName: string;
  isOverdue: boolean;
};

const DAY_MS = 86_400_000;

function dateOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function toDebtDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getDebtDueState({ balance, dueDate, now = new Date(), dueSoonDays = 7 }: {
  balance: number;
  dueDate: Date;
  now?: Date;
  dueSoonDays?: number;
}): DebtDueState {
  if (Number(balance || 0) <= 0) {
    return { status: "Paid", daysUntilDue: null, daysLate: null, isOverdue: false, badgeClassName: "bg-emerald-900/60 text-emerald-200" };
  }
  const days = Math.round((dateOnly(dueDate).getTime() - dateOnly(now).getTime()) / DAY_MS);
  if (days < 0) return { status: "Overdue", daysUntilDue: null, daysLate: Math.abs(days), isOverdue: true, badgeClassName: "bg-red-900/70 text-red-100" };
  if (days === 0) return { status: "Due Today", daysUntilDue: 0, daysLate: null, isOverdue: false, badgeClassName: "bg-orange-900/70 text-orange-100" };
  if (days <= dueSoonDays) return { status: "Due Soon", daysUntilDue: days, daysLate: null, isOverdue: false, badgeClassName: "bg-amber-900/60 text-amber-100" };
  return { status: "Upcoming", daysUntilDue: days, daysLate: null, isOverdue: false, badgeClassName: "bg-slate-800 text-slate-200" };
}

export function getDebtDueDetail(state: DebtDueState) {
  if (state.status === "Paid") return "Balance paid";
  if (state.daysLate !== null) return `${state.daysLate} day${state.daysLate === 1 ? "" : "s"} late`;
  if (state.daysUntilDue === 0) return "Due today";
  if (state.daysUntilDue === 1) return "Due tomorrow";
  return `${state.daysUntilDue} day${state.daysUntilDue === 1 ? "" : "s"} until due`;
}

export function getNextDebtCycleDate(currentDueDate: Date) {
  return toDebtDateInput(addMonthsClamped(currentDueDate, 1));
}

export function buildDebtOverdueSignals<T extends { id: string; name?: string | null; balance?: number | null; nextDueDate: Date }>(debts: T[], now = new Date()) {
  return debts.flatMap((debt) => {
    const due = getDebtDueState({ balance: Number(debt.balance || 0), dueDate: debt.nextDueDate, now });
    if (!due.isOverdue) return [];
    return [{
      id: `overdue-debt-${debt.id}`,
      debtId: debt.id,
      severity: "critical" as const,
      title: `${debt.name || "Debt payment"} is overdue`,
      detail: getDebtDueDetail(due),
      href: "/dashboard/money/debts",
      channels: ["today", "notifications", "money-coach", "daily-briefing", "financial-health", "future-push"] as const,
      pushStatus: "architecture-only" as const,
    }];
  });
}
