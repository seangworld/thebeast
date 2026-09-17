import assert from "node:assert/strict";
import test from "node:test";
import { buildMonthlyPaymentChecklist } from "../src/lib/monthlyPaymentChecklist";

const base = { today: "2026-09-17", bills: [], debts: [], billPayments: [], debtPayments: [] };
test("weekly occurrences match payments by due date, retaining paid and partial cycles", () => {
  const rows = buildMonthlyPaymentChecklist({ ...base,
    bills: [{ id: "b", name: "Childcare", amount: 100, frequency: "weekly", next_due_date_after_payment: "2026-09-08", assigned_income_date: "2026-09-07" }],
    billPayments: [{ bill_id: "b", cycle_due_date: "2026-09-01", amount_paid: 100, resulting_next_due_date: "2026-09-08" }, { bill_id: "b", cycle_due_date: "2026-09-08", amount_paid: 40 }],
  });
  assert.deepEqual(rows.map(r => [r.dueDate, r.status, r.remaining]), [["2026-09-01", "Paid", 0], ["2026-09-08", "Partial", 60], ["2026-09-15", "Overdue", 100], ["2026-09-22", "Upcoming", 100], ["2026-09-29", "Upcoming", 100]]);
  assert.equal(rows[1].paycheckDate, "2026-09-07");
  assert.equal(rows[2].paycheckDate, "");
});
test("reversed payments do not complete a cycle and skipped cycles require review", () => {
  const rows = buildMonthlyPaymentChecklist({ ...base,
    debts: [{ id: "d", balance: 2000, minimum_payment: 100, next_due_date_after_payment: "2026-10-10" }],
    debtPayments: [{ debt_id: "d", cycle_due_date: "2026-09-10", amount: 100, reversed_at: "2026-09-11", resulting_next_due_date: "2026-10-10" }, { debt_id: "d", cycle_due_date: "2026-09-10", amount: 0, action_type: "skip", resulting_next_due_date: "2026-10-10" }],
  });
  assert.equal(rows[0].status, "Review");
  assert.equal(rows[0].paid, 0);
});
test("paid off debts remain visible through history and keep the payment's paycheck", () => {
  const rows = buildMonthlyPaymentChecklist({ ...base,
    debts: [{ id: "d", balance: 0, minimum_payment: 100, is_archived: true }],
    debtPayments: [{ debt_id: "d", cycle_due_date: "2026-09-10", amount: 35, balance_after: 0, debt_state_before: { assigned_income_date: "2026-09-05" } }],
  });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, "Paid");
  assert.equal(rows[0].paycheckDate, "2026-09-05");
});
test("month-end, annual, archived and future schedules do not create spurious monthly bills", () => {
  const rows = buildMonthlyPaymentChecklist({ ...base, today: "2026-02-20", bills: [
    { id: "end", amount: 100, due_date: 31 },
    { id: "annual", amount: 100, frequency: "yearly", next_due_date_after_payment: "2026-08-01" },
    { id: "archived", amount: 100, is_archived: true },
  ] });
  assert.deepEqual(rows.map(r => r.dueDate), ["2026-02-28"]);
});
test("current overdue cycle is retained without inventing previous arrears", () => {
  const rows = buildMonthlyPaymentChecklist({ ...base, bills: [{ id: "b", amount: 100, next_due_date_after_payment: "2026-07-31" }] });
  assert.deepEqual(rows.map(r => r.dueDate), ["2026-07-31", "2026-09-30"]);
});
test("a paid prior month never completes this month and partial amounts sum accurately", () => {
  const rows = buildMonthlyPaymentChecklist({ ...base, bills: [{ id: "b", amount: 100, due_date: 10 }], billPayments: [
    { bill_id: "b", cycle_due_date: "2026-08-10", amount_paid: 100 },
    { bill_id: "b", cycle_due_date: "2026-09-10", amount_paid: 20.1 },
    { bill_id: "b", cycle_due_date: "2026-09-10", amount_paid: 30.2 },
  ] });
  assert.equal(rows[0].remaining, 49.7);
  assert.equal(rows[0].status, "Partial");
});
