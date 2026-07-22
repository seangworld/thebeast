import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { assertAutomationChangeConfirmed, buildPaymentAutomationContext, normalizePaymentAutomation } from "../src/lib/paymentAutomation";

test("existing payment records receive safe independent defaults", () => {
  assert.deepEqual(normalizePaymentAutomation({ id: "1", name: "Mortgage" }), { autoPayEnabled: false, reminderEnabled: true });
  assert.deepEqual(normalizePaymentAutomation({ id: "1", name: "Mortgage", auto_pay_enabled: true, reminder_enabled: false }), { autoPayEnabled: true, reminderEnabled: false });
  assert.deepEqual(normalizePaymentAutomation({ id: "1", name: "Mortgage", auto_pay_enabled: true, reminder_enabled: true }), { autoPayEnabled: true, reminderEnabled: true });
});

test("Auto Pay is context only and never implies payment completion", () => {
  const context = buildPaymentAutomationContext([
    { id: "auto", name: "Mortgage", auto_pay_enabled: true, reminder_enabled: true },
    { id: "manual", name: "Card", auto_pay_enabled: false, reminder_enabled: false },
  ]);
  assert.equal(context.items[0].paymentConfirmed, false);
  assert.equal(context.items[0].reminderEnabled, true);
  assert.equal(context.autoPayCount, 1);
  assert.equal(context.manualPaymentCount, 1);
  assert.equal(context.needsAttentionCount, 1);
});

test("agents require explicit confirmation before changing automation", () => {
  assert.throws(() => assertAutomationChangeConfirmed(false), /Explicit user confirmation/);
  assert.doesNotThrow(() => assertAutomationChangeConfirmed(true));
});

test("migration and responsive controls preserve owner-scoped RLS tables", () => {
  const migration = readFileSync("supabase/migrations/20260721000100_add_payment_automation_preferences.sql", "utf8");
  const controls = readFileSync("src/app/dashboard/money/components/PaymentAutomationControls.tsx", "utf8");
  const bills = readFileSync("src/app/dashboard/money/cashflow/components/BillsSection.tsx", "utf8");
  const debts = readFileSync("src/app/dashboard/money/cashflow/components/DebtsSection.tsx", "utf8");
  for (const table of ["bill_events", "debts"]) assert.match(migration, new RegExp(`alter table public\\.${table}`));
  assert.match(migration, /auto_pay_enabled boolean not null default false/g);
  assert.match(migration, /reminder_enabled boolean not null default true/g);
  assert.match(controls, /type="checkbox"/);
  assert.match(controls, /min-h-11/);
  assert.match(controls, /aria-live="polite"/);
  assert.match(controls, /previous settings restored/);
  for (const source of [bills, debts]) {
    assert.match(source, /lg:hidden/);
    assert.match(source, /hidden lg:block/);
    assert.doesNotMatch(source, /min-w-\[900px\]/);
    assert.match(source, /PaymentAutomationControls/);
  }
});
