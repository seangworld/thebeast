import {
  getDebtDueDetail,
  getDebtDueState,
  toDebtDateInput,
  type DebtDueState,
  type DebtPaymentAction,
} from "./debtManagement";

export type DebtAwarenessDebt = {
  id: string;
  name?: string | null;
  balance?: number | null;
  minimum_payment?: number | null;
  interest_rate?: number | null;
  previous_interest_rate?: number | null;
  interest_rate_updated_at?: string | null;
  due_date?: number | null;
  next_due_date_after_payment?: string | null;
  is_archived?: boolean | null;
};

export type DebtAwarenessPayment = {
  id: string;
  debt_id?: string | null;
  amount?: number | null;
  payment_date?: string | null;
  cycle_due_date?: string | null;
  action_type?: DebtPaymentAction | null;
  created_at?: string | null;
};

export type DebtAwarenessItem = {
  id: string;
  name: string;
  balance: number;
  minimumDue: number;
  interestRate: number;
  dueDate: string;
  due: DebtDueState;
  dueDetail: string;
  missedPayment: boolean;
  paymentCount: number;
  totalRecordedPayments: number;
  lastPayment: { amount: number; date: string; action: DebtPaymentAction } | null;
  payoffProgressPercent: number;
  interestChange: {
    previousRate: number;
    currentRate: number;
    percentagePointChange: number;
    changedAt?: string;
  } | null;
  whyItMatters: string;
  options: readonly string[];
  payoffImpact: string;
  financialHealthImpact: string;
  velocityImpact: string;
};

export type DebtAwarenessSummary = {
  items: readonly DebtAwarenessItem[];
  immediateAttention: readonly DebtAwarenessItem[];
  overdueCount: number;
  missedPaymentCount: number;
  dueTodayCount: number;
  dueSoonCount: number;
  upcomingCount: number;
  paymentCount: number;
  interestChangeCount: number;
};

function amount(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
}

function dateValue(value: string | null | undefined) {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

export function resolveDebtAwarenessDueDate(
  debt: Pick<DebtAwarenessDebt, "next_due_date_after_payment" | "due_date">,
  now: Date
) {
  if (debt.next_due_date_after_payment) {
    const parsed = new Date(`${debt.next_due_date_after_payment.slice(0, 10)}T00:00:00`);
    if (!Number.isNaN(parsed.valueOf())) return parsed;
  }
  const day = Math.min(Math.max(Number(debt.due_date || 1), 1), 28);
  return new Date(now.getFullYear(), now.getMonth(), day);
}

export function buildMoneyDebtAwareness({
  debts,
  payments,
  now = new Date(),
}: {
  debts: readonly DebtAwarenessDebt[];
  payments: readonly DebtAwarenessPayment[];
  now?: Date;
}): DebtAwarenessSummary {
  const items = debts
    .filter((debt) => !debt.is_archived && amount(debt.balance) > 0)
    .map((debt): DebtAwarenessItem => {
      const dueDate = resolveDebtAwarenessDueDate(debt, now);
      const due = getDebtDueState({ balance: amount(debt.balance), dueDate, now });
      const debtPayments = payments
        .filter((payment) => payment.debt_id === debt.id)
        .sort(
          (left, right) =>
            dateValue(right.payment_date || right.created_at) -
            dateValue(left.payment_date || left.created_at)
        );
      const cycleDueDate = toDebtDateInput(dueDate);
      const cyclePayments = debtPayments.filter(
        (payment) => payment.cycle_due_date?.slice(0, 10) === cycleDueDate
      );
      const cycleWasPaid = cyclePayments.some(
        (payment) =>
          amount(payment.amount) > 0 && payment.action_type !== "skip"
      );
      const cycleWasSkipped = cyclePayments.some(
        (payment) => payment.action_type === "skip"
      );
      const missedPayment =
        cycleWasSkipped || (due.isOverdue && !cycleWasPaid);
      const totalRecordedPayments = debtPayments.reduce(
        (sum, payment) => sum + amount(payment.amount),
        0
      );
      const balance = amount(debt.balance);
      const trackedStartingBalance = balance + totalRecordedPayments;
      const payoffProgressPercent = trackedStartingBalance > 0
        ? Math.min(100, Math.round((totalRecordedPayments / trackedStartingBalance) * 100))
        : 100;
      const currentRate = amount(debt.interest_rate);
      const previousRate = debt.previous_interest_rate;
      const interestChange =
        previousRate !== null &&
        previousRate !== undefined &&
        Number.isFinite(Number(previousRate)) &&
        Number(previousRate) !== currentRate
          ? {
              previousRate: Number(previousRate),
              currentRate,
              percentagePointChange:
                Math.round((currentRate - Number(previousRate)) * 100) / 100,
              changedAt: debt.interest_rate_updated_at || undefined,
            }
          : null;
      const late = due.isOverdue || missedPayment;
      return {
        id: debt.id,
        name: debt.name || "Debt payment",
        balance,
        minimumDue: Math.min(amount(debt.minimum_payment), balance),
        interestRate: currentRate,
        dueDate: cycleDueDate,
        due,
        dueDetail: getDebtDueDetail(due),
        missedPayment,
        paymentCount: debtPayments.length,
        totalRecordedPayments,
        lastPayment: debtPayments[0]
          ? {
              amount: amount(debtPayments[0].amount),
              date:
                debtPayments[0].payment_date ||
                debtPayments[0].created_at ||
                "Date unavailable",
              action: debtPayments[0].action_type || "custom",
            }
          : null,
        payoffProgressPercent,
        interestChange,
        whyItMatters: late
          ? "A late required payment can disrupt cash timing and the modeled payoff sequence. Beast does not infer lender fees or credit reporting."
          : "The required payment and due date reserve part of the current cash plan.",
        options: [
          "Record the minimum, statement, full-balance, or custom payment if it is affordable.",
          "Record a payment made outside Beast so history stays current.",
          "If payment is not currently safe, review cash flow and the funding source before changing the plan.",
        ],
        payoffImpact: late
          ? "Leaving the required payment unresolved can delay the modeled payoff date and increase modeled interest; the projection recalculates after records change."
          : "An on-time required payment keeps the current payoff projection aligned with its payment assumptions.",
        financialHealthImpact: late
          ? "Late and missed debt payments reduce the Debt component of the Financial Health Score under the documented timeliness penalty."
          : "No debt-timeliness penalty applies while this payment is not late or missed.",
        velocityImpact: late
          ? "Velocity Banking should resolve overdue required payments and protect near-term cash before modeling another credit-line chunk."
          : "Velocity Banking treats this minimum and due date as a near-term cash obligation before sizing a chunk.",
      };
    })
    .sort((left, right) => {
      const rank = { Overdue: 0, "Due Today": 1, "Due Soon": 2, Upcoming: 3, Paid: 4 };
      return rank[left.due.status] - rank[right.due.status] || left.dueDate.localeCompare(right.dueDate);
    });

  return {
    items,
    immediateAttention: items.filter((item) =>
      ["Overdue", "Due Today", "Due Soon"].includes(item.due.status)
    ),
    overdueCount: items.filter((item) => item.due.isOverdue).length,
    missedPaymentCount: items.filter((item) => item.missedPayment).length,
    dueTodayCount: items.filter((item) => item.due.status === "Due Today").length,
    dueSoonCount: items.filter((item) => item.due.status === "Due Soon").length,
    upcomingCount: items.filter((item) => item.due.status === "Upcoming").length,
    paymentCount: items.reduce((sum, item) => sum + item.paymentCount, 0),
    interestChangeCount: items.filter((item) => item.interestChange).length,
  };
}
