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

function createObservedClient() {
  const records: QueryRecord[] = [];
  let activeQueries = 0;
  let maxActiveQueries = 0;

  const client = {
    from(table: string) {
      const record: QueryRecord = { table };
      records.push(record);

      const query = {
        select() { return query; },
        eq() { return query; },
        is() { return query; },
        order() { return query; },
        maybeSingle() { return query; },
        limit(value: number) {
          record.limit = value;
          return query;
        },
        then(resolve: (value: { data: Array<{ table: string }> }) => void) {
          activeQueries += 1;
          maxActiveQueries = Math.max(maxActiveQueries, activeQueries);
          setTimeout(() => {
            activeQueries -= 1;
            resolve({ data: [{ table }] });
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
  assert.equal(
    observed.records.find(({ table }) => table === "bill_payments")?.limit,
    BILL_PAYMENT_HISTORY_LIMIT
  );
  assert.equal(
    observed.records.find(({ table }) => table === "debt_payments")?.limit,
    DEBT_PAYMENT_HISTORY_LIMIT
  );
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
