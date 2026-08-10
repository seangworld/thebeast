import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildDebtOverdueSignals, calculateDebtPaymentAmount, getDebtDueState, getDebtPaymentWarning, getNextDebtCycleDate } from "../src/lib/debtManagement";

test("debt payment modes resolve against the current balance", () => {
  assert.equal(calculateDebtPaymentAmount({ balance: 500, minimumPayment: 75, mode: "minimum" }), 75);
  assert.equal(calculateDebtPaymentAmount({ balance: 100, minimumPayment: 75, mode: "minimum_plus_extra", extraPayment: 50 }), 100);
  assert.equal(calculateDebtPaymentAmount({ balance: 500, minimumPayment: 75, mode: "minimum_plus_extra", extraPayment: 25 }), 100);
  assert.equal(calculateDebtPaymentAmount({ balance: 500, minimumPayment: 75, mode: "custom", customAmount: 125 }), 125);
});

test("debt payment entry preserves custom reality and explains below-minimum amounts", () => {
  assert.equal(calculateDebtPaymentAmount({ balance: 500, minimumPayment: 75, mode: "custom", customAmount: 25 }), 25);
  assert.match(getDebtPaymentWarning({ balance: 500, minimumPayment: 75, amount: 25 }) || "", /below the configured minimum/);
  assert.match(getDebtPaymentWarning({ balance: 50, minimumPayment: 75, amount: 75 }) || "", /capped at the balance/);
  assert.equal(getDebtPaymentWarning({ balance: 500, minimumPayment: 75, amount: 75 }), null);
});

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

test("Debt Management exposes direct canonical payment actions and lifecycle workflow", () => {
  const source = readFileSync("src/app/dashboard/money/debts/DebtManagementActions.tsx", "utf8");
  for (const label of ["Pay Minimum", "Confirm Payment", "Pay Full Balance", "Custom Payment", "Total amount paid", "Skip Payment", "Undo Last Payment", "Reset Due Date", "Move to next recurring cycle", "Select custom next due date", "Payment Date", "Funding Source", "Optional Notes", "History"]) assert.match(source, new RegExp(label));
  assert.doesNotMatch(source, />Mark Paid Outside Beast</);
  assert.doesNotMatch(source, /Minimum \\+ Extra/);
  assert.doesNotMatch(source, /Custom Total/);
  assert.match(source, /record\(isMinimum \? "minimum" : "full_balance", paymentAmount\)/);
  assert.match(source, /record\("custom", customAmount\)/);
  assert.match(source, /stored minimum of/);
  assert.match(source, /if \(!result\.ok\) return/);
  assert.match(source, /getDebtPaymentWarning/);
  assert.match(source, /getDebtDueState/);
});

test("Debt List consolidates row controls into one confirmed Actions menu", () => {
  const page = readFileSync("src/app/dashboard/money/debts/page.tsx", "utf8");

  assert.match(page, /function DebtActionsMenu/);
  assert.match(page, /label="Actions"/);
  assert.match(page, /ariaLabel=\{`\$\{debt\.name\} actions`\}/);
  assert.match(page, /<DebtManagementActions \{\.\.\.management\} \/>/);
  assert.match(page, /applyDebtPaymentToCycle/);
  assert.match(page, /action_type: actionType/);
  assert.match(page, /resolveDebtLifecycle/);
  for (const label of ["Edit", "Archive", "Delete"]) assert.match(page, new RegExp(label));
  assert.match(page, /text-red-300/);
  assert.match(page, /data-action-menu-list="debt"/);
  assert.doesNotMatch(page, /Make Payment/);
  assert.match(page, /width=\{560\}/);
  assert.match(page, /panelRole="dialog"/);
  assert.match(page, /actions and payment automation/);
  assert.doesNotMatch(page, /data-debt-management-panel="true"/);
  assert.doesNotMatch(page, /data-debt-management-row="true"/);
  assert.doesNotMatch(page, /managedDebtId/);
  assert.match(page, /className="grid min-w-0 gap-3 p-3 lg:hidden"/);
  assert.doesNotMatch(page, /<summary[^>]*>Pay \/ Manage<\/summary>/);
});

test("Bills and Debts keep payment workflows in the shared Actions overlay", () => {
  const bills = readFileSync(
    "src/app/dashboard/money/cashflow/components/BillsSection.tsx",
    "utf8"
  );
  const debts = readFileSync("src/app/dashboard/money/debts/page.tsx", "utf8");

  assert.match(bills, /<OverlayPopover label="Actions"/);
  assert.match(bills, /<BillPaymentControls/);
  assert.match(debts, /<OverlayPopover/);
  assert.match(debts, /<DebtManagementActions \{\.\.\.management\} \/>/);
});

test("shared Actions overlay supports focus, arrow keys, Escape, and a mobile sheet", () => {
  const overlay = readFileSync(
    "src/app/dashboard/money/cashflow/components/OverlayPopover.tsx",
    "utf8"
  );

  for (const key of ["ArrowDown", "ArrowUp", "Home", "End", "Escape"]) {
    assert.match(overlay, new RegExp(`event\\.key === "${key}"`));
  }
  assert.match(overlay, /querySelector<HTMLElement>\('\[role="menuitem"\]/);
  assert.match(overlay, /buttonRef\.current\?\.focus/);
  assert.match(overlay, /aria-label=\{ariaLabel\}/);
  assert.match(overlay, /aria-haspopup=\{panelRole\}/);
  assert.match(overlay, /onOpenChange\?\.\(nextOpen\)/);
  assert.match(overlay, /window\.innerWidth <= 640/);
  assert.match(overlay, /bottom: gutter/);
});
