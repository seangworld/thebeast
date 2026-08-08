import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getDebtLifecycleLabel, getDebtLifecycleStatus, resolveDebtLifecycle } from "../src/lib/debtLifecycle";
import { applyBillPartialPayment } from "../src/lib/financialPayments";

const date = "2026-08-08";

test("installment, mortgage, outside, scheduled, and manual zero balances close canonically", () => {
  for (const source of ["beast_payment", "outside_payment", "scheduled_payment", "manual_correction", "reconciliation"] as const) {
    const result = resolveDebtLifecycle({ balance: 0, paymentBehavior: "fixed", source, effectiveDate: date, reconciliationComplete: true, reminderEnabled: true });
    assert.equal(result.status, "paid_off_closed");
    assert.equal(result.update.is_archived, true);
    assert.equal(result.update.paid_off_at, date);
    assert.equal(result.update.next_due_date_after_payment, null);
    assert.equal(result.update.reminder_enabled, false);
  }
});

test("an open credit card remains open at zero and a closed card can be archived", () => {
  const open = resolveDebtLifecycle({ balance: 0, paymentBehavior: "revolving", source: "outside_payment", effectiveDate: date });
  assert.equal(open.status, "open_zero_balance");
  assert.equal(open.update.is_archived, false);
  assert.equal(getDebtLifecycleLabel(open.status), "Open — Zero Balance");

  const closed = resolveDebtLifecycle({ balance: 0, paymentBehavior: "revolving", currentStatus: "open_zero_balance", source: "manual_archive", effectiveDate: date });
  assert.equal(closed.status, "archived");
  assert.equal(closed.update.is_archived, true);
});

test("pending, unknown, and incomplete reconciliation balances never auto-archive", () => {
  assert.equal(resolveDebtLifecycle({ balance: 0, paymentBehavior: "fixed", source: "beast_payment", effectiveDate: date, paymentPending: true }).changed, false);
  assert.equal(resolveDebtLifecycle({ balance: null, paymentBehavior: "fixed", source: "manual_correction", effectiveDate: date }).changed, false);
  assert.equal(resolveDebtLifecycle({ balance: 0, paymentBehavior: "fixed", source: "reconciliation", effectiveDate: date, reconciliationComplete: false }).changed, false);
});

test("final payment reversal restores active status and the prior reminder preference", () => {
  const result = resolveDebtLifecycle({ balance: 125, paymentBehavior: "fixed", isArchived: true, currentStatus: "paid_off_closed", source: "payment_reversal", effectiveDate: date, lifecycleAutoArchived: true, reminderEnabledBeforePayoff: false });
  assert.equal(result.status, "active_balance");
  assert.equal(result.update.is_archived, false);
  assert.equal(result.update.paid_off_at, null);
  assert.equal(result.update.reminder_enabled, false);
});

test("archived debts remain classifiable and recurring bills advance without account archival", () => {
  assert.equal(getDebtLifecycleStatus({ balance: 100, is_archived: true }), "archived");
  const bill = applyBillPartialPayment({ amountDue: 100, paymentAmount: 100, currentCycleDueDate: new Date(2026, 7, 8), frequency: "monthly" });
  assert.equal(bill.paidInFull, true);
  assert.equal("isArchived" in bill, false);
});

test("BM-40/41 migration preserves owner-scoped lifecycle and reversal history", () => {
  const migration = readFileSync("supabase/migrations/20260808000100_add_debt_lifecycle.sql", "utf8");
  assert.match(migration, /create table if not exists public\.debt_lifecycle_events/);
  assert.match(migration, /auth\.uid\(\) = user_id/g);
  assert.match(migration, /reversed_at timestamptz/);
  assert.match(migration, /payment_id uuid null references public\.debt_payments/);
  const page = readFileSync("src/app/dashboard/money/debts/page.tsx", "utf8");
  assert.match(page, /update\(\{ reversed_at: reversedAt/);
  assert.doesNotMatch(page, /from\("debt_payments"\)\.delete/);
});

test("Velocity Banking is first-class and Money Coach uses its canonical route and boundaries", () => {
  const navigation = readFileSync("src/lib/moneyNavigation.ts", "utf8");
  const workspace = readFileSync("src/app/dashboard/money/velocity/page.tsx", "utf8");
  const coach = readFileSync("src/lib/moneyCoachExperience.ts", "utf8");
  assert.match(navigation, /Velocity Banking.*\/dashboard\/money\/velocity/);
  for (const heading of ["What is Velocity Banking?", "How Beast models it", "What could go wrong?", "Safety criteria", "Alternatives"]) assert.match(workspace, new RegExp(heading.replace("?", "\\?")));
  assert.match(coach, /open-velocity/);
  assert.match(coach, /Holding cash is the correct result|I would not use Velocity/);
  assert.match(coach, /Open — Zero Balance/);
});
