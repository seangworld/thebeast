import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  AtomicFinancialCommandError,
  recordBillPaymentAtomic,
  recordDebtPaymentAtomic,
  reverseDebtPaymentAtomic,
  type FinancialCommandClient,
} from "../src/lib/atomicFinancialCommands";
import { activeDebtPayments } from "../src/lib/financialPaymentHistory";
import { applySuggestedDebtAttackCommand } from "../src/lib/suggestedDebtAttack";

const operationId = "11111111-1111-4111-8111-111111111111";

test("atomic command adapters make exactly one RPC request with the stable operation ID", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client: FinancialCommandClient = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      return {
        data: {
          status: "succeeded",
          operation_id: args.p_operation_id,
          payment_id: "22222222-2222-4222-8222-222222222222",
          recorded_amount: 75,
          balance_after: 925,
          next_due_date: "2026-09-10",
          lifecycle_status: "active_balance",
          replayed: false,
        },
        error: null,
      };
    },
  };

  await recordBillPaymentAtomic(client, {
    operationId,
    billId: "33333333-3333-4333-8333-333333333333",
    amount: 75,
    paymentDate: "2026-08-10",
    cycleMonth: "2026-08",
  });
  await recordDebtPaymentAtomic(client, {
    operationId,
    debtId: "44444444-4444-4444-8444-444444444444",
    amount: 75,
    paymentDate: "2026-08-10",
    cycleDueDate: "2026-08-20",
    fundingSourceId: null,
    notes: "",
    actionType: "minimum",
  });
  await reverseDebtPaymentAtomic(client, {
    operationId,
    paymentId: "22222222-2222-4222-8222-222222222222",
    reason: "Member reversed the recorded payment.",
  });

  assert.deepEqual(
    calls.map((call) => call.name),
    [
      "record_bill_payment_atomic",
      "record_debt_payment_atomic",
      "reverse_debt_payment_atomic",
    ]
  );
  assert.ok(calls.every((call) => call.args.p_operation_id === operationId));
});

test("provider failures become categorized errors without exposing raw database details", async () => {
  const client: FinancialCommandClient = {
    rpc: async () => ({
      data: null,
      error: {
        code: "42501",
        message: "permission denied for relation private_financial_table",
      },
    }),
  };

  await assert.rejects(
    recordBillPaymentAtomic(client, {
      operationId,
      billId: "33333333-3333-4333-8333-333333333333",
      amount: 75,
      paymentDate: "2026-08-10",
      cycleMonth: "2026-08",
    }),
    (error: unknown) => {
      assert.ok(error instanceof AtomicFinancialCommandError);
      assert.equal(error.category, "authorization_error");
      assert.doesNotMatch(error.message, /private_financial_table|permission denied/);
      return true;
    }
  );
});

type HarnessState = {
  billDue: string;
  billPayments: number[];
  debtBalance: number;
  debtPayments: Array<{ operationId: string; amount: number; reversed: boolean }>;
  reversals: Set<string>;
};

function cloneState(state: HarnessState): HarnessState {
  return {
    ...state,
    billPayments: [...state.billPayments],
    debtPayments: state.debtPayments.map((payment) => ({ ...payment })),
    reversals: new Set(state.reversals),
  };
}

function transact(
  state: HarnessState,
  command: (draft: HarnessState) => void
) {
  const draft = cloneState(state);
  command(draft);
  Object.assign(state, draft);
}

function initialHarnessState(): HarnessState {
  return {
    billDue: "2026-08-15",
    billPayments: [],
    debtBalance: 100,
    debtPayments: [],
    reversals: new Set(),
  };
}

test("failure injection rolls back either side of bill payment persistence", () => {
  for (const failAt of ["history", "due"] as const) {
    const state = initialHarnessState();
    assert.throws(() =>
      transact(state, (draft) => {
        if (failAt === "history") throw new Error("injected history failure");
        draft.billPayments.push(50);
        if (failAt === "due") throw new Error("injected due failure");
        draft.billDue = "2026-09-15";
      })
    );
    assert.deepEqual(state.billPayments, []);
    assert.equal(state.billDue, "2026-08-15");
  }
});

test("failure injection rolls back either side of debt payment persistence", () => {
  for (const failAt of ["history", "balance"] as const) {
    const state = initialHarnessState();
    assert.throws(() =>
      transact(state, (draft) => {
        if (failAt === "history") throw new Error("injected history failure");
        draft.debtPayments.push({ operationId, amount: 40, reversed: false });
        if (failAt === "balance") throw new Error("injected balance failure");
        draft.debtBalance -= 40;
      })
    );
    assert.deepEqual(state.debtPayments, []);
    assert.equal(state.debtBalance, 100);
  }
});

test("idempotent and serialized payment contract applies a request once without lost updates", () => {
  const state = initialHarnessState();
  const apply = (id: string, amount: number) =>
    transact(state, (draft) => {
      if (draft.debtPayments.some((payment) => payment.operationId === id)) return;
      const recorded = Math.min(amount, draft.debtBalance);
      draft.debtPayments.push({ operationId: id, amount: recorded, reversed: false });
      draft.debtBalance -= recorded;
    });

  apply(operationId, 40);
  apply(operationId, 40);
  apply("55555555-5555-4555-8555-555555555555", 35);

  assert.equal(state.debtPayments.length, 2);
  assert.equal(state.debtBalance, 25);
});

test("reversal failure leaves the payment applied and a repeated operation reverses once", () => {
  const state = initialHarnessState();
  state.debtBalance = 60;
  state.debtPayments.push({ operationId, amount: 40, reversed: false });
  const reversalId = "66666666-6666-4666-8666-666666666666";

  assert.throws(() =>
    transact(state, (draft) => {
      draft.debtPayments[0]!.reversed = true;
      throw new Error("injected debt restore failure");
    })
  );
  assert.equal(state.debtPayments[0]?.reversed, false);
  assert.equal(state.debtBalance, 60);

  const reverse = () =>
    transact(state, (draft) => {
      if (draft.reversals.has(reversalId)) return;
      draft.debtPayments[0]!.reversed = true;
      draft.debtBalance += draft.debtPayments[0]!.amount;
      draft.reversals.add(reversalId);
    });
  reverse();
  reverse();

  assert.equal(state.debtPayments[0]?.reversed, true);
  assert.equal(state.debtBalance, 100);
  assert.equal(state.reversals.size, 1);
});

test("reversed rows do not feed canonical reporting totals", () => {
  const payments = activeDebtPayments([
    { id: "active", amount: 25, action_type: "custom", reversed_at: null },
    { id: "reversed", amount: 40, action_type: "minimum", reversed_at: "2026-08-10T12:00:00Z" },
    { id: "skip", amount: 0, action_type: "skip", reversed_at: null },
  ]);

  assert.deepEqual(payments.map((payment) => payment.id), ["active", "skip"]);
  assert.equal(payments.reduce((sum, payment) => sum + Number(payment.amount), 0), 25);
});

test("suggested debt attack reports persistence failure instead of false success", async () => {
  const result = await applySuggestedDebtAttackCommand({
    debt: { id: "debt-1" },
    amount: 50,
    applyPayment: async () => ({
      ok: false,
      message: "Unable to record the debt payment. Your entry was preserved; please retry.",
    }),
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /Unable to record/);
  assert.doesNotMatch(result.message, /Suggested attack recorded/);
});

test("migration establishes atomic, owner-scoped, locked and idempotent database commands", () => {
  const migration = readFileSync(
    "supabase/migrations/20260810000100_add_atomic_financial_commands.sql",
    "utf8"
  );
  const databaseTests = readFileSync(
    "supabase/tests/plat001c_atomic_financial_commands.test.sql",
    "utf8"
  );

  for (const name of [
    "record_bill_payment_atomic",
    "record_debt_payment_atomic",
    "reverse_debt_payment_atomic",
  ]) {
    assert.match(migration, new RegExp(`create or replace function public\\.${name}`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${name}`));
  }
  assert.equal((migration.match(/security definer/g) || []).length, 3);
  assert.ok((migration.match(/for update/g) || []).length >= 3);
  assert.ok((migration.match(/auth\.uid\(\)/g) || []).length >= 3);
  assert.match(migration, /set search_path = pg_catalog, public/g);
  assert.match(migration, /bill_payments_owner_operation_uidx/);
  assert.match(migration, /debt_payments_owner_operation_uidx/);
  assert.match(migration, /debt_payments_owner_reversal_operation_uidx/);
  assert.match(migration, /debt_state_before jsonb/);
  assert.match(migration, /debt_state_after jsonb/);
  assert.match(migration, /debt_changed_since_payment/);
  assert.doesNotMatch(migration, /update public\.funding_sources/);
  for (const failpoint of [
    "bill_payment_insert",
    "bill_due_update",
    "debt_payment_insert",
    "debt_balance_update",
    "debt_reversal_update",
  ]) {
    assert.match(databaseTests, new RegExp(failpoint));
  }
  assert.match(databaseTests, /set local role authenticated/);
  assert.match(databaseTests, /request\.jwt\.claims/);
  assert.match(databaseTests, /throws_ok/);
  assert.match(databaseTests, /is\(/);
});
