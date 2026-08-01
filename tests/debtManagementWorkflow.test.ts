import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDebtOverdueSignals, getDebtDueState, getNextDebtCycleDate } from "../src/lib/debtManagement";

test("debt due intelligence distinguishes upcoming, due soon, due today, overdue, and paid", () => {
  const now = new Date(2026, 7, 10);
  assert.equal(getDebtDueState({ balance: 100, dueDate: new Date(2026, 7, 20), now }).status, "Upcoming");
  assert.equal(getDebtDueState({ balance: 100, dueDate: new Date(2026, 7, 14), now }).status, "Due Soon");
  assert.equal(getDebtDueState({ balance: 100, dueDate: now, now }).status, "Due Today");
  assert.deepEqual(getDebtDueState({ balance: 100, dueDate: new Date(2026, 7, 7), now }), {
    status: "Overdue", daysUntilDue: null, daysLate: 3, isOverdue: true, badgeClassName: "bg-red-900/70 text-red-100",
  });
  assert.equal(getDebtDueState({ balance: 0, dueDate: now, now }).status, "Paid");
});

test("reset next cycle clamps month ends and overdue facts expose architecture-only channels", () => {
  assert.equal(getNextDebtCycleDate(new Date(2026, 0, 31)), "2026-02-28");
  const signals = buildDebtOverdueSignals([{ id: "d1", name: "Card", balance: 10, nextDueDate: new Date(2026, 7, 1) }], new Date(2026, 7, 3));
  assert.equal(signals[0]?.pushStatus, "architecture-only");
  assert.deepEqual(signals[0]?.channels, ["today", "notifications", "money-coach", "daily-briefing", "financial-health", "future-push"]);
});

test("Debt Management exposes the complete payment, reset, history, and status workflow", () => {
  const source = readFileSync("src/app/dashboard/money/debts/DebtManagementActions.tsx", "utf8");
  for (const label of ["Pay Minimum", "Pay Full Balance", "Custom Payment", "Statement Balance", "Skip Payment", "Mark Paid Outside Beast", "Undo Last Payment", "Reset Due Date", "Move to next recurring cycle", "Select custom next due date", "Payment Date", "Funding Source", "Optional Notes", "History"]) assert.match(source, new RegExp(label));
  assert.match(source, /getDebtDueState/);
});
