import assert from "node:assert/strict";
import test from "node:test";
import { completeCashFlowPaymentHistory, earliestCashFlowCycle } from "../src/lib/cashFlowPaymentHistory";
type Client = Parameters<typeof completeCashFlowPaymentHistory>[0]["client"];
const row = (index: number) => ({ id: String(index).padStart(6, "0"), cycle_due_date: "2026-09-10", amount: 1 });
const initial = { data: Array.from({ length: 250 }, (_, i) => row(i)) };
function fixture(pages: ({ data: Record<string, unknown>[] | null; error?: unknown } | Error)[]) {
  const calls: { table: string; filters: unknown[][]; order?: string; limit?: number }[] = [];
  const client = { from(table: string) {
    const call = { table, filters: [] as unknown[][], order: "", limit: 0 }; calls.push(call);
    const query = {
      select() { return query; },
      eq(column: string, value: unknown) { call.filters.push(["eq", column, value]); return query; },
      gte(column: string, value: unknown) { call.filters.push(["gte", column, value]); return query; },
      gt(column: string, value: unknown) { call.filters.push(["gt", column, value]); return query; },
      is(column: string, value: unknown) { call.filters.push(["is", column, value]); return query; },
      order(column: string) { call.order = column; return query; },
      limit(value: number) { call.limit = value; return query; },
      then(resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
        const page = pages.shift();
        if (!page) throw new Error("Unexpected extra query");
        if (page instanceof Error) reject(page); else resolve(page);
      },
    }; return query;
  } } as unknown as Client;
  return { client, calls };
}
test("loads more than 250 relevant payments with stable cursors and ownership on every page", async () => {
  const rows = Array.from({ length: 503 }, (_, i) => row(i));
  const f = fixture([{ data: rows.slice(0, 250) }, { data: rows.slice(250, 500) }, { data: rows.slice(500) }]);
  const result = await completeCashFlowPaymentHistory({ client: f.client, userId: "owner", table: "debt_payments", initial, earliestCycle: "2026-09-01" });
  assert.equal(result.complete, true);
  assert.equal(result.data.length, 503);
  assert.equal(new Set(result.data.map(r => r.id)).size, 503);
  for (const call of f.calls) {
    assert.equal(call.order, "id");
    assert.equal(call.limit, 250);
    assert.ok(call.filters.some(f => JSON.stringify(f) === JSON.stringify(["eq", "user_id", "owner"])));
    assert.ok(call.filters.some(f => JSON.stringify(f) === JSON.stringify(["is", "reversed_at", null])));
    assert.ok(call.filters.some(f => JSON.stringify(f) === JSON.stringify(["gte", "cycle_due_date", "2026-09-01"])));
  }
  assert.deepEqual(f.calls[1].filters.at(-1), ["gt", "id", "000249"]);
  assert.deepEqual(f.calls[2].filters.at(-1), ["gt", "id", "000499"]);
});
test("fresh relevant history replaces stale initial payments, preserving only older context", async () => {
  const oldRow = { ...row(999), cycle_due_date: "2026-08-01" };
  const f = fixture([{ data: [row(251)] }]);
  const result = await completeCashFlowPaymentHistory({ client: f.client, userId: "owner", table: "bill_payments", initial: { data: [...initial.data, oldRow] }, earliestCycle: "2026-09-01" });
  assert.deepEqual(result.data, [oldRow, row(251)]);
  assert.equal(result.complete, true);
  assert.equal(f.calls[0].filters.some(f => f[0] === "is"), false);
});
test("query failures, thrown errors and nonadvancing cursors cannot claim complete history", async () => {
  for (const bad of [{ data: null, error: "network" }, new Error("network"), { data: [row(0)] }]) {
    const f = fixture([{ data: initial.data }, bad]);
    const result = await completeCashFlowPaymentHistory({ client: f.client, userId: "owner", table: "debt_payments", initial, earliestCycle: "2026-09-01" });
    assert.equal(result.complete, false);
  }
});
test("small histories make no extra calls; overdue anchors extend the relevant date range", async () => {
  const f = fixture([]);
  const result = await completeCashFlowPaymentHistory({ client: f.client, userId: "owner", table: "bill_payments", initial: { data: [row(1)] }, earliestCycle: "2026-09-01" });
  assert.equal(result.complete, true);
  assert.equal(f.calls.length, 0);
  assert.equal(earliestCashFlowCycle("2026-09", [{ next_due_date_after_payment: "2026-07-31" }, { next_due_date_after_payment: "2026-10-01" }]), "2026-07-31");
});
test("an exact full final page requires an empty follow-up page", async () => {
  const f = fixture([{ data: initial.data }, { data: [] }]);
  const result = await completeCashFlowPaymentHistory({ client: f.client, userId: "owner", table: "bill_payments", initial, earliestCycle: "2026-09-01" });
  assert.equal(result.complete, true);
  assert.equal(result.data.length, 250);
  assert.equal(f.calls.length, 2);
});
