import { numberValue } from "./financialMetrics";

export type MobileMoneyBill = {
  id: string;
  name?: string | null;
  amount?: number | null;
  due_date?: number | null;
  next_due_date_after_payment?: string | null;
  is_archived?: boolean | null;
};

export type MobileMoneyDebt = {
  id: string;
  name?: string | null;
  balance?: number | null;
  minimum_payment?: number | null;
  interest_rate?: number | null;
  due_date?: number | null;
  is_archived?: boolean | null;
};

export type MobileMoneyPayment = {
  id: string;
  bill_id?: string | null;
  debt_id?: string | null;
  amount?: number | null;
  amount_paid?: number | null;
  payment_date?: string | null;
  created_at?: string | null;
};

export type MobileMoneyTransaction = {
  id: string;
  label: string;
  amount: number;
  date: string;
  source: "bill" | "debt";
};

export type MobileMoneyBillCard = {
  id: string;
  name: string;
  amountDue: number;
  dueDate: Date;
  status: "Overdue" | "Due Today" | "Due Soon" | "Upcoming";
  actionHref: string;
};

export type MobileMoneyDebtCard = {
  id: string;
  name: string;
  balance: number;
  minimumPayment: number;
  interestRate: number;
  dueDate: Date;
  actionHref: string;
};

export function getMobileMoneyDueDate(
  dueDay?: number | null,
  asOfDate = new Date(),
  nextDueDate?: string | null
) {
  if (nextDueDate) return new Date(nextDueDate);

  const asOfDay = new Date(
    asOfDate.getFullYear(),
    asOfDate.getMonth(),
    asOfDate.getDate()
  );
  const safeDay = Math.min(Math.max(Number(dueDay || 1), 1), 28);
  const candidate = new Date(
    asOfDate.getFullYear(),
    asOfDate.getMonth(),
    safeDay
  );

  if (candidate < asOfDay) {
    return new Date(asOfDate.getFullYear(), asOfDate.getMonth() + 1, safeDay);
  }

  return candidate;
}

export function getMobileMoneyBillStatus(
  dueDate: Date,
  asOfDate = new Date()
): MobileMoneyBillCard["status"] {
  const daysAway = Math.ceil(
    (dueDate.getTime() - asOfDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysAway < 0) return "Overdue";
  if (daysAway === 0) return "Due Today";
  if (daysAway <= 7) return "Due Soon";
  return "Upcoming";
}

export function buildMobileMoneyBillCards({
  bills,
  asOfDate = new Date(),
}: {
  bills: MobileMoneyBill[];
  asOfDate?: Date;
}): MobileMoneyBillCard[] {
  return bills
    .filter((bill) => !bill.is_archived)
    .map((bill) => {
      const dueDate = getMobileMoneyDueDate(
        bill.due_date,
        asOfDate,
        bill.next_due_date_after_payment
      );

      return {
        id: bill.id,
        name: bill.name || "Bill",
        amountDue: numberValue(bill.amount),
        dueDate,
        status: getMobileMoneyBillStatus(dueDate, asOfDate),
        actionHref: "/dashboard/money/cashflow#bills",
      };
    })
    .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());
}

export function buildMobileMoneyDebtCards({
  debts,
  asOfDate = new Date(),
}: {
  debts: MobileMoneyDebt[];
  asOfDate?: Date;
}): MobileMoneyDebtCard[] {
  return debts
    .filter((debt) => !debt.is_archived && numberValue(debt.balance) > 0)
    .map((debt) => ({
      id: debt.id,
      name: debt.name || "Debt",
      balance: numberValue(debt.balance),
      minimumPayment: numberValue(debt.minimum_payment),
      interestRate: numberValue(debt.interest_rate),
      dueDate: getMobileMoneyDueDate(debt.due_date, asOfDate),
      actionHref: "/dashboard/money/debts",
    }))
    .sort((left, right) => left.dueDate.getTime() - right.dueDate.getTime());
}

export function buildRecentMoneyTransactions({
  billPayments,
  debtPayments,
  limit = 5,
}: {
  billPayments: MobileMoneyPayment[];
  debtPayments: MobileMoneyPayment[];
  limit?: number;
}): MobileMoneyTransaction[] {
  const billTransactions = billPayments.map((payment) => ({
    id: `bill-payment-${payment.id}`,
    label: "Bill payment",
    amount: numberValue(payment.amount_paid ?? payment.amount),
    date: payment.payment_date || payment.created_at || "",
    source: "bill" as const,
  }));
  const debtTransactions = debtPayments.map((payment) => ({
    id: `debt-payment-${payment.id}`,
    label: "Debt payment",
    amount: numberValue(payment.amount ?? payment.amount_paid),
    date: payment.payment_date || payment.created_at || "",
    source: "debt" as const,
  }));

  return [...billTransactions, ...debtTransactions]
    .filter((transaction) => transaction.date)
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, limit);
}
