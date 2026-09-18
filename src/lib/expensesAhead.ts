import { buildMonthlyPaymentChecklist } from "./monthlyPaymentChecklist";
import { isPaymentConfigurationComplete, type PaymentConfigurationRecord } from "./paymentConfiguration";

type ChecklistInput = Parameters<typeof buildMonthlyPaymentChecklist>[0];
type ExpenseRecord = ChecklistInput["bills"][number] & PaymentConfigurationRecord;
/** Date-only occurrences shared by Cashflow's table, totals and due-soon alerts. */
export function buildExpensesAhead(input: Omit<ChecklistInput, "bills" | "debts"> & {
  bills: ExpenseRecord[]; debts: ExpenseRecord[]; days: number;
}) {
  const end = new Date(`${input.today}T12:00:00`);
  end.setDate(end.getDate() + input.days);
  const endKey = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  const months = [input.today];
  const cursor = new Date(`${input.today.slice(0, 7)}-01T12:00:00`);
  while (true) {
    cursor.setMonth(cursor.getMonth() + 1);
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-01`;
    if (key > endKey) break;
    months.push(key);
  }
  const records = new Map<string, ExpenseRecord>([
    ...input.bills.map(record => [`bill:${record.id}`, record] as const),
    ...input.debts.map(record => [`debt:${record.id}`, record] as const),
  ]);
  const occurrences = new Map(months.flatMap(today => buildMonthlyPaymentChecklist({ ...input, today }))
    .filter(item => item.dueDate >= input.today && item.dueDate <= endKey && item.remaining > 0 && item.status !== "Review")
    .map(item => [item.id, item]));
  const expenses = Array.from(occurrences.values()).map(item => {
    const record = records.get(item.id.slice(0, item.id.lastIndexOf(":")))!;
    return { ...record, id: item.id, kind: item.kind, name: item.name,
      frequency: item.kind === "debt" ? "monthly" : record.frequency || "monthly",
      remaining: item.remaining, dueDate: item.dueDate,
      nextDueDateDisplay: new Date(`${item.dueDate}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      assigned_income_date: item.paycheckDate,
      status: item.status === "Upcoming" && item.dueDate === input.today ? "Due today" : item.status,
    };
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return { expenses, total: Math.round(expenses.reduce((sum, item) => sum + item.remaining, 0) * 100) / 100,
    unassignedIncomePots: expenses.filter(item => !item.assigned_income_date).length,
    unassignedFundingSources: expenses.filter(item => !isPaymentConfigurationComplete(item)).length };
}
