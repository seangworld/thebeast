import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  billPaymentOccurrenceKey,
  buildBillPaymentOccurrenceTotals,
} from "../src/lib/billPaymentOccurrences";

test("bill payments aggregate by due occurrence instead of calendar month", () => {
  const totals = buildBillPaymentOccurrenceTotals([
    {
      bill_id: "petlab",
      cycle_due_date: "2026-08-12",
      amount_paid: 40,
    },
    {
      bill_id: "petlab",
      cycle_due_date: "2026-08-26",
      amount_paid: 15,
    },
    {
      bill_id: "petlab",
      cycle_due_date: "2026-08-26",
      amount_paid: 10,
    },
  ]);

  assert.equal(totals[billPaymentOccurrenceKey("petlab", "2026-08-12")], 40);
  assert.equal(totals[billPaymentOccurrenceKey("petlab", "2026-08-26")], 25);
});

test("invalid legacy rows cannot leak into a current occurrence total", () => {
  const totals = buildBillPaymentOccurrenceTotals([
    { bill_id: "petlab", cycle_due_date: null, amount_paid: 40 },
    { bill_id: "petlab", cycle_due_date: "2026-08-26", amount_paid: 10 },
  ]);

  assert.deepEqual(totals, { "petlab||2026-08-26": 10 });
});

test("BM-43 migration preserves authorization, write gates, and operation idempotency", () => {
  const migration = readFileSync(
    "supabase/migrations/20260827231649_add_bill_payment_occurrence_identity.sql",
    "utf8"
  );
  const writeGate = readFileSync(
    "supabase/migrations/20260811000100_add_beastmoney_payment_write_gate.sql",
    "utf8"
  );
  const paymentActions = readFileSync(
    "src/app/dashboard/money/cashflow/hooks/useCashFlowPaymentActions.ts",
    "utf8"
  );

  assert.match(migration, /cycle_due_date date/);
  assert.match(migration, /bill_payments_owner_bill_occurrence_idx/);
  assert.match(migration, /and cycle_due_date = v_current_due/);
  assert.match(migration, /bill_occurrence_already_paid/);
  assert.match(migration, /v_legacy_fingerprint/);
  assert.match(migration, /for update/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = pg_catalog, public/);
  assert.match(migration, /revoke all on function public\.record_bill_payment_atomic/);
  assert.match(migration, /grant execute on function public\.record_bill_payment_atomic/);
  assert.match(writeGate, /before insert or update or delete on public\.bill_payments/);
  assert.match(paymentActions, /This bill occurrence is already paid or has changed/);
});
