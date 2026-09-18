import { buildMonthlyPaymentChecklist } from "../monthlyPaymentChecklist";
import type { BillInputs } from "../notifications/billReminders";
export type MemberCalendarEvent = {
  id: string;
  source: "money" | "goals" | "health";
  title: string;
  date: string;
  summary: string;
  href: string;
  done: boolean;
};
type DatedRecord = { id: string; title: string; status: string };
export function validCalendarMonth(month: string) {
  return (
    /^\d{4}-(0[1-9]|1[0-2])$/.test(month) &&
    Number(month.slice(0, 4)) >= 1900 &&
    Number(month.slice(0, 4)) <= 2200
  );
}
export function buildMemberSchedule(input: {
  month: string;
  today: string;
  bills: BillInputs["bills"];
  payments: BillInputs["billPayments"];
  debts?: BillInputs["debts"];
  debtPayments?: BillInputs["debtPayments"];
  goals: (DatedRecord & { target_date: string | null })[];
  appointments: (DatedRecord & { occurred_on: string | null })[];
}): MemberCalendarEvent[] {
  if (!validCalendarMonth(input.month)) return [];
  const events: MemberCalendarEvent[] = buildMonthlyPaymentChecklist({
    today: input.today.startsWith(input.month)
      ? input.today
      : `${input.month}-01`,
    bills: input.bills,
    debts: input.debts || [],
    billPayments: input.payments,
    debtPayments: input.debtPayments || [],
  })
    .filter((item) => item.dueDate.startsWith(input.month))
    .map((item) => ({
      id: item.id,
      source: "money",
      title: item.name,
      date: item.dueDate,
      summary:
        item.status === "Paid"
          ? "Paid"
          : item.status === "Review"
            ? "Review payment details"
            : `$${item.remaining.toFixed(2)} remaining${item.status === "Partial" ? " · Partly paid" : ""}`,
      href: item.kind === "debt" ? "/dashboard/money/debts" : "/dashboard/money/bills",
      done: item.status === "Paid",
    }));
  for (const goal of input.goals)
    if (
      goal.target_date?.startsWith(input.month) &&
      !["Archived", "Completed"].includes(goal.status)
    )
      events.push({
        id: `goal:${goal.id}`,
        source: "goals",
        title: goal.title,
        date: goal.target_date,
        summary: "Goal target date",
        href: "/dashboard/goals",
        done: false,
      });
  for (const appointment of input.appointments)
    if (
      appointment.occurred_on?.startsWith(input.month) &&
      !["archived", "cancelled", "canceled"].includes(appointment.status)
    )
      events.push({
        id: `health:${appointment.id}`,
        source: "health",
        title: appointment.title,
        date: appointment.occurred_on,
        summary: "Appointment · Open Health for details",
        href: "/dashboard/health/appointments",
        done: appointment.status === "completed",
      });
  return events.sort(
    (a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title),
  );
}
