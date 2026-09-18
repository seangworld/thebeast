import assert from "node:assert/strict";
import test from "node:test";
import { projectPaycheckDraft, type PaycheckMove } from "../src/lib/paycheckDraft";
const bill = { id: "b", name: "Bill", remaining: 100, assigned_income_date: "2026-10-01" };
const debt = { id: "d", name: "Debt", minimum_payment: 50, assigned_income_date: "2026-10-02" };
const buckets = [
  { date: "2026-10-01", amount: 1000, assignedBills: [bill], assignedDebts: [], availableToAssign: 900, safeAfterBuffer: 400 },
  { date: "2026-10-02", amount: 500, assignedBills: [], assignedDebts: [debt], availableToAssign: 450, safeAfterBuffer: -50 },
];
test("three undos reverse three movements, restoring both pots without modifying saved records", () => {
  const moves: PaycheckMove[] = [{ kind: "bill", id: "b", date: "2026-10-02" }, { kind: "debt", id: "d", date: "2026-10-01" }, { kind: "bill", id: "b", date: "" }];
  const project = (n: number) => projectPaycheckDraft(buckets, [], [], moves.slice(0, n), []);
  assert.deepEqual(project(3).buckets.map(b => b.assignedTotal), [50, 0]);
  assert.deepEqual(project(2).buckets.map(b => b.assignedTotal), [50, 100]);
  assert.deepEqual(project(1).buckets.map(b => b.assignedTotal), [0, 150]);
  assert.deepEqual(project(0).buckets.map(b => b.assignedTotal), [100, 50]);
  assert.deepEqual(project(0).buckets.map(b => b.safeAfterBuffer), [400, -50]);
  assert.equal(bill.assigned_income_date, "2026-10-01");
  assert.equal(project(3).changes.length, 2);
});
test("paid zero remaining stays zero instead of reverting to the original amount", () => {
  const p = projectPaycheckDraft([], [{ id: "zero", remaining: 0, amount: 100 }], [], [], []);
  assert.equal(p.unassignedTotal, 0);
});
test("credit-funded expenses move rows without consuming a paycheck balance", () => {
  const creditBill = { ...bill, funding_account_id: "credit", funding_account_type: "account" };
  const base = [{ ...buckets[0], assignedBills: [creditBill], availableToAssign: 1000, safeAfterBuffer: 500 }, { ...buckets[1], assignedDebts: [], availableToAssign: 500, safeAfterBuffer: 0 }];
  const result = projectPaycheckDraft(base, [], [], [{ kind: "bill", id: "b", date: "2026-10-02" }], [{ id: "credit", type: "credit_card" }]);
  assert.deepEqual(result.buckets.map(b => b.assignedTotal), [0, 0]);
  assert.deepEqual(result.buckets.map(b => b.safeAfterBuffer), [500, 0]);
  assert.equal(result.buckets[1].assignedBills.length, 1);
});
