import assert from "node:assert/strict";
import test from "node:test";
import {
  BILL_PAYMENT_HISTORY_LIMIT,
  DEBT_PAYMENT_HISTORY_LIMIT,
  loadCashFlowFinancialData,
  loadDebtWorkspaceFinancialData,
} from "../src/lib/financialDataLoaders";

type LoaderClient = Parameters<typeof loadCashFlowFinancialData>[0];

type QueryRecord = {
  table: string;
  limit?: number;
};

function createObservedClient(responses: Record<string, { data: unknown[] | null; error?: { message: string } } | undefined> = {}) {
  const records: QueryRecord[] = [];
  let activeQueries = 0;
  let maxActiveQueries = 0;

  const client = {
    from(table: string) {
      const record: QueryRecord = { table };
      let earliestCycle: string | null = null;
      let cursor: string | null = null;
      records.push(record);

      const query = {
        select() { return query; },
        eq() { return query; },
        is() { return query; },
        gte(_column: string, value: string) { earliestCycle = value; return query; },
        gt(_column: string, value: string) { cursor = value; return query; },
        order() { return query; },
        maybeSingle() { return query; },
        limit(value: number) {
          record.limit = value;
          return query;
        },
        then(resolve: (value: { data: unknown[] | null; error?: { message: string } }) => void) {
          activeQueries += 1;
          maxActiveQueries = Math.max(maxActiveQueries, activeQueries);
          setTimeout(() => {
            activeQueries -= 1;
            const response = responses[table] || { data: [{ table }] };
            let data = response.data;
            if (data && earliestCycle) data = data.filter(row => String((row as { cycle_due_date?: string }).cycle_due_date || "") >= earliestCycle!);
            if (data && cursor) data = data.filter(row => String((row as { id?: string }).id || "") > cursor!);
            if (data && record.limit) data = data.slice(0, record.limit);
            resolve({ ...response, data });
          }, 0);
        },
      };

      return query;
    },
  } as unknown as LoaderClient;

  return {
    client,
    records,
    getMaxActiveQueries: () => maxActiveQueries,
  };
}

test("cash-flow financial reads begin concurrently and bound payment history", async () => {
  const observed = createObservedClient();

  const result = await loadCashFlowFinancialData(
    observed.client,
    "user-1",
    "2026-08"
  );

  assert.equal(observed.records.length, 8);
  assert.equal(observed.getMaxActiveQueries(), 8);
  assert.deepEqual(result.incomeRows, [{ table: "income_events" }]);
  assert.equal(result.checklistDataComplete, true);
  assert.equal(
    observed.records.find(({ table }) => table === "bill_payments")?.limit,
    BILL_PAYMENT_HISTORY_LIMIT
  );
  assert.equal(
    observed.records.find(({ table }) => table === "debt_payments")?.limit,
    DEBT_PAYMENT_HISTORY_LIMIT
  );
});

test("checklist rejects failed bill and debt payment reads", async () => {
  for (const response of [
    { bill_payments: { data: null, error: { message: "Read failed" } } },
    { debt_payments: { data: null, error: { message: "Read failed" } } },
  ]) {
    const result = await loadCashFlowFinancialData(createObservedClient(response).client, "user-1", "2026-09");
    assert.equal(result.checklistDataComplete, false);
  }
});

test("cash-flow loader returns a complete large current-month history", async () => {
  const data = Array.from({ length: 503 }, (_, i) => ({ id: String(i).padStart(6, "0"), cycle_due_date: "2026-09-10", amount: 1 }));
  const observed = createObservedClient({ debt_payments: { data } });
  const result = await loadCashFlowFinancialData(observed.client, "user-1", "2026-09");
  assert.equal(result.checklistDataComplete, true);
  assert.equal(result.debtPaymentRows.length, 503);
  assert.equal(observed.records.filter(r => r.table === "debt_payments").length, 4);
});

test("debt-workspace financial reads begin concurrently and bound payment history", async () => {
  const observed = createObservedClient();

  const result = await loadDebtWorkspaceFinancialData(observed.client, "user-1");

  assert.equal(observed.records.length, 8);
  assert.equal(observed.getMaxActiveQueries(), 8);
  assert.deepEqual(result.debtRows, [{ table: "debts" }]);
  assert.equal(
    observed.records.find(({ table }) => table === "debt_payments")?.limit,
    DEBT_PAYMENT_HISTORY_LIMIT
  );
});
