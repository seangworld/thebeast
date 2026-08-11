import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BEASTMONEY_PAYMENT_MAINTENANCE_MESSAGE,
  normalizeBeastMoneyPaymentWriteStatus,
} from "../src/lib/beastMoneyPaymentWriteGate";
import { classifyClientDiagnosticError } from "../src/lib/clientDiagnostics";

test("payment write status defaults to unavailable unless the database positively allows writes", () => {
  assert.deepEqual(normalizeBeastMoneyPaymentWriteStatus(null), {
    restricted: true,
    paymentsAvailable: false,
    acceptanceException: false,
  });
  assert.deepEqual(
    normalizeBeastMoneyPaymentWriteStatus({
      restricted: false,
      payments_available: true,
      acceptance_exception: false,
    }),
    {
      restricted: false,
      paymentsAvailable: true,
      acceptanceException: false,
    }
  );
  assert.equal(
    BEASTMONEY_PAYMENT_MAINTENANCE_MESSAGE,
    "Payments are temporarily unavailable while BeastMoney is being updated."
  );
});

test("the stable database gate error is sanitized as maintenance", () => {
  assert.equal(
    classifyClientDiagnosticError({
      code: "55000",
      message: "beastmoney_payment_writes_temporarily_unavailable",
    }),
    "maintenance_error"
  );
});

test("migration enforces a private default-off gate at both payment ledgers", () => {
  const migration = readFileSync(
    "supabase/migrations/20260811000100_add_beastmoney_payment_write_gate.sql",
    "utf8"
  );
  const databaseTests = readFileSync(
    "supabase/tests/plat001c_payment_write_gate.test.sql",
    "utf8"
  );

  assert.match(migration, /restricted boolean not null default false/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table public\.beastmoney_payment_write_control/);
  assert.match(migration, /public\.is_profile_admin\(\)/);
  assert.match(migration, /acceptance_admin_id = case[\s\S]*v_user_id/);
  assert.match(migration, /before insert or update or delete on public\.bill_payments/);
  assert.match(migration, /before insert or update or delete on public\.debt_payments/);
  assert.match(migration, /beastmoney_payment_writes_temporarily_unavailable/);
  assert.doesNotMatch(migration, /grant .* to anon/);

  for (const behavior of [
    "restriction defaults off",
    "bill atomic command is blocked",
    "debt atomic command is blocked",
    "reversal command is blocked",
    "direct bill payment insert is blocked",
    "direct debt payment insert is blocked",
    "unrelated bill updates remain available",
    "acceptance admin can make a controlled payment",
  ]) {
    assert.match(databaseTests, new RegExp(behavior));
  }
});
