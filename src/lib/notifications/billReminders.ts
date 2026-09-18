import { buildMonthlyPaymentChecklist } from "../monthlyPaymentChecklist";
export type BillInputs = Parameters<typeof buildMonthlyPaymentChecklist>[0];
export type ReminderBill = BillInputs["bills"][number] & {
  reminder_enabled?: boolean | null;
};
export function zonedDay(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (key: string) =>
    parts.find((part) => part.type === key)?.value || "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}
export function nextDay(day: string) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
export function dueBillReminders(input: {
  today: string;
  bills: ReminderBill[];
  payments: BillInputs["billPayments"];
  debts?: (BillInputs["debts"][number] & { reminder_enabled?: boolean | null })[];
  debtPayments?: BillInputs["debtPayments"];
  dueToday: boolean;
  dueTomorrow: boolean;
}) {
  const tomorrow = nextDay(input.today);
  const bills = input.bills.filter(
    (bill) => !bill.is_archived && bill.reminder_enabled !== false,
  );
  const months = Array.from(
    new Set([
      input.today,
      ...(tomorrow.slice(0, 7) !== input.today.slice(0, 7) ? [tomorrow] : []),
    ]),
  );
  const items = months
    .flatMap((today) =>
      buildMonthlyPaymentChecklist({
        today,
        bills,
        debts: (input.debts || []).filter(debt => debt.reminder_enabled !== false),
        billPayments: input.payments,
        debtPayments: input.debtPayments || [],
      }),
    )
    .filter(
      (item) =>
        item.remaining > 0 &&
        item.status !== "Paid" &&
        item.status !== "Review" &&
        ((input.dueToday && item.dueDate === input.today) ||
          (input.dueTomorrow && item.dueDate === tomorrow)),
    );
  return Array.from(new Map(items.map(item => [item.id, item])).values())
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.name.localeCompare(b.name));
}
export function billPushMessage(
  items: ReturnType<typeof dueBillReminders>,
  today: string,
  details: boolean,
) {
  return {
    title: "BeastMoney reminder",
    body: details
      ? items
          .slice(0, 3)
          .map(
            (item) =>
              `${item.name}: $${item.remaining.toFixed(2)} due ${item.dueDate === today ? "today" : "tomorrow"}`,
          )
          .join(" · ") + (items.length > 3 ? ` · ${items.length - 3} more` : "")
      : "You have expenses due today or tomorrow. Open BeastMoney to review them.",
    url: "/dashboard/money/cashflow",
    tag: `beast-bills-${today}`,
  };
}
