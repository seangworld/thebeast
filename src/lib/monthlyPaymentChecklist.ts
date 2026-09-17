import { isDebtPayoffEligible, type DebtLifecycleRecord } from "./debtLifecycle";

type Obligation = DebtLifecycleRecord & {
  id: string;
  name?: string;
  amount?: number | string | null;
  minimum_payment?: number | string | null;
  due_date?: number | string | null;
  frequency?: string | null;
  next_due_date_after_payment?: string | null;
  assigned_income_date?: string | null;
};
type Payment = {
  bill_id?: string;
  debt_id?: string;
  cycle_due_date?: string | null;
  amount_paid?: number | string | null;
  amount?: number | string | null;
  reversed_at?: string | null;
  action_type?: string | null;
  resulting_next_due_date?: string | null;
  balance_after?: number | string | null;
  funding_account_type?: string | null;
  funding_account_id?: string | null;
  debt_state_before?: { assigned_income_date?: string | null } | null;
};
export type MonthlyChecklistItem = {
  id: string;
  kind: "bill" | "debt";
  name: string;
  dueDate: string;
  paycheckDate: string;
  paid: number;
  remaining: number;
  status: "Paid" | "Partial" | "Overdue" | "Upcoming" | "Review";
};
const money = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value) * 100) / 100) : 0;
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && dateKey(date) === value;
}

/** Current-month due occurrences plus the current overdue cycle. No payment writes. */
export function buildMonthlyPaymentChecklist(input: {
  today: string; bills: Obligation[]; debts: Obligation[];
  billPayments: Payment[]; debtPayments: Payment[];
}): MonthlyChecklistItem[] {
  if (!validDate(input.today)) return [];
  const month = input.today.slice(0, 7);
  const start = `${month}-01`;
  const [year, monthNumber] = month.split("-").map(Number);
  const end = dateKey(new Date(year, monthNumber, 0, 12));
  const items: MonthlyChecklistItem[] = [];
  for (const kind of ["bill", "debt"] as const) {
    const records = kind === "bill" ? input.bills : input.debts;
    const payments = (kind === "bill" ? input.billPayments : input.debtPayments).filter(p => !p.reversed_at);
    for (const record of records) {
      const history = payments.filter(p => (kind === "bill" ? p.bill_id : p.debt_id) === record.id && validDate(p.cycle_due_date));
      const scheduled = money(kind === "bill" ? record.amount : record.minimum_payment);
      const active = kind === "bill" ? !record.is_archived : isDebtPayoffEligible(record);
      const dueDay = Math.min(31, Math.max(1, Number(record.due_date) || 1));
      const anchor = validDate(record.next_due_date_after_payment)
        ? record.next_due_date_after_payment
        : dateKey(new Date(year, monthNumber - 1, Math.min(dueDay, new Date(year, monthNumber, 0).getDate()), 12));
      const dates = new Set(history.filter(p => p.cycle_due_date! >= start && p.cycle_due_date! <= end).map(p => p.cycle_due_date!));
      if (active && scheduled > 0) {
        // Keep the current overdue occurrence visible, but do not invent intervening arrears.
        if (anchor <= end) dates.add(anchor);
        const frequency = kind === "debt" ? "monthly" : record.frequency || "monthly";
        const monthStep = ({ every_2_months: 2, every_3_months: 3, every_6_months: 6, yearly: 12 } as Record<string, number>)[frequency] || 1;
        const base = new Date(`${anchor}T12:00:00`);
        for (let index = 1; index <= 1200; index++) {
          const next = new Date(base);
          if (frequency === "weekly" || frequency === "biweekly") next.setDate(base.getDate() + index * (frequency === "weekly" ? 7 : 14));
          else {
            next.setDate(1);
            next.setMonth(base.getMonth() + index * monthStep);
            next.setDate(Math.min(base.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
          }
          const key = dateKey(next);
          if (key > end) break;
          if (key >= start) dates.add(key);
        }
      }
      for (const dueDate of Array.from(dates)) {
        const matching = history.filter(p => p.cycle_due_date === dueDate);
        const paid = money(matching.reduce((sum, p) => sum + money(kind === "bill" ? p.amount_paid : p.amount), 0));
        const completionRecorded = matching.some(p => p.action_type !== "skip" && (
          (validDate(p.resulting_next_due_date) && p.resulting_next_due_date > dueDate) ||
          (kind === "debt" && p.balance_after != null && Number(p.balance_after) === 0)));
        const paidInFull = completionRecorded || (scheduled > 0 && paid >= scheduled);
        const remaining = paidInFull ? 0 : money(scheduled - paid);
        // An old partial payment with an advanced/archived schedule needs review, not an invented balance.
        const review = !paidInFull && (dueDate < anchor || !active || scheduled === 0);
        const paymentAssignment = matching.map(p => p.debt_state_before?.assigned_income_date ||
          (p.funding_account_type === "income_pot" ? p.funding_account_id : null)).find(validDate);
        const assignment = paymentAssignment || (dueDate === anchor ? record.assigned_income_date : "");
        items.push({ id: `${kind}:${record.id}:${dueDate}`, kind, name: record.name || (kind === "bill" ? "Bill" : "Debt"),
          dueDate, paycheckDate: validDate(assignment) ? assignment : "", paid, remaining,
          status: paidInFull ? "Paid" : review ? "Review" : paid > 0 ? "Partial" : dueDate < input.today ? "Overdue" : "Upcoming" });
      }
    }
  }
  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name));
}
