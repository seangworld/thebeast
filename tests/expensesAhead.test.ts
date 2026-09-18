import assert from "node:assert/strict";
import test from "node:test";
import { buildExpensesAhead } from "../src/lib/expensesAhead";
import { dueBillReminders } from "../src/lib/notifications/billReminders";
import { buildMemberSchedule } from "../src/lib/calendar/memberSchedule";
const bill = { id: "same", name: "Rent", amount: 100, due_date: 1, frequency: "monthly", next_due_date_after_payment: "2026-10-01" };
const debt = { id: "same", name: "Card", minimum_payment: 50, balance: 1000, due_date: 30, next_due_date_after_payment: "2026-09-30" };
test("expenses merge bill and debt occurrences by due date with partial minimums and distinct keys", () => {
  const result = buildExpensesAhead({ today: "2026-09-29", days: 7, bills: [bill], debts: [debt], billPayments: [], debtPayments: [{ debt_id: "same", cycle_due_date: "2026-09-30", amount: 20 }] });
  assert.deepEqual(result.expenses.map(item => [item.kind, item.dueDate, item.remaining]), [["debt", "2026-09-30", 30], ["bill", "2026-10-01", 100]]);
  assert.equal(result.total, 130);
  assert.equal(new Set(result.expenses.map(item => item.id)).size, 2);
});
test("expenses exclude archived, paid-off and paid cycles while counting recurring occurrences once", () => {
  const result = buildExpensesAhead({ today: "2026-09-29", days: 7,
    bills: [{ ...bill, frequency: "weekly", next_due_date_after_payment: "2026-09-29" }, { ...bill, id: "archived", is_archived: true }],
    debts: [{ ...debt, balance: 0 }, { ...debt, id: "archived", is_archived: true }],
    billPayments: [{ bill_id: "same", cycle_due_date: "2026-09-29", amount_paid: 100 }], debtPayments: [],
  });
  assert.deepEqual(result.expenses.map(item => item.dueDate), ["2026-10-06"]);
  assert.equal(result.total, 100);
});
test("debt reminders honor partial payments, reversals, opt-out and month boundaries", () => {
  const input = { today: "2026-09-30", bills: [bill], debts: [debt], payments: [], debtPayments: [{ debt_id: "same", cycle_due_date: "2026-09-30", amount: 20 }], dueToday: true, dueTomorrow: true };
  assert.deepEqual(dueBillReminders(input).map(item => item.remaining), [30, 100]);
  assert.equal(dueBillReminders({ ...input, debts: [{ ...debt, reminder_enabled: false }] }).length, 1);
  assert.equal(dueBillReminders({ ...input, debtPayments: [{ debt_id: "same", cycle_due_date: "2026-09-30", amount: 50 }] }).length, 1);
  assert.equal(dueBillReminders({ ...input, debtPayments: [{ debt_id: "same", cycle_due_date: "2026-09-30", amount: 50, reversed_at: "2026-09-30" }] })[0].remaining, 50);
});
test("calendar routes debt and bill occurrences to the appropriate workspace", () => {
  const items = buildMemberSchedule({ month: "2026-09", today: "2026-09-29", bills: [], debts: [debt], payments: [], debtPayments: [], goals: [], appointments: [] });
  assert.equal(items[0].href, "/dashboard/money/debts");
});
