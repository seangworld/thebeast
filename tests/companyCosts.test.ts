import assert from "node:assert/strict";
import test from "node:test";
import { parseCompanyCost, summarizeCompanyCosts, type CompanyCost } from "../src/lib/companyCosts";

const entry = (overrides: Partial<CompanyCost> = {}): CompanyCost => ({ id: "12345678-1234-4234-8234-123456789012", name: "Example", kind: "recurring", amount_cents: 1800, interval_months: 1, active: true, paid_on: null, notes: "", ...overrides });
test("company costs separate the monthly estimate from payments and prepaid funding", () => {
  const result = summarizeCompanyCosts([
    entry(), entry({ amount_cents: 5500, interval_months: 24 }), entry({ amount_cents: 10000 }),
    entry({ amount_cents: 2000, active: false }), entry({ amount_cents: null }),
    entry({ kind: "credit_funding", amount_cents: 3000, interval_months: null }),
    entry({ kind: "payment", amount_cents: 4000, interval_months: null }),
  ]);
  assert.deepEqual(result, { monthlyCents: 12029, unknownRecurring: 1, recordedPaymentsCents: 4000, recordedFundingCents: 3000 });
});
test("empty and unknown entries stay unavailable while explicit zero is measured", () => {
  assert.equal(summarizeCompanyCosts([]).monthlyCents, null);
  assert.equal(summarizeCompanyCosts([entry({ amount_cents: null })]).monthlyCents, null);
  assert.equal(summarizeCompanyCosts([entry({ amount_cents: 0 })]).monthlyCents, 0);
  assert.equal(summarizeCompanyCosts([]).recordedPaymentsCents, null);
});
test("cost validation rejects invalid amounts, intervals and impossible dates", () => {
  for (const amount_cents of [-1, NaN, Infinity, 1.5, 100000001, undefined, "100"])
    assert.throws(() => parseCompanyCost({ ...entry(), amount_cents }));
  for (const interval_months of [0, null, 1.5, 121])
    assert.throws(() => parseCompanyCost(entry({ interval_months })));
  assert.throws(() => parseCompanyCost(entry({ paid_on: "2026-09-09" })));
  assert.throws(() => parseCompanyCost(entry({ kind: "payment", interval_months: null, paid_on: "2026-02-30" })));
  assert.doesNotThrow(() => parseCompanyCost(entry({ kind: "payment", interval_months: null, paid_on: null })));
});
test("cost parser allowlists fields and keeps unknown history unknown", () => {
  const parsed = parseCompanyCost({ ...entry(), owner_id: "attacker", currency: "EUR", name: "  Hosting  " });
  assert.equal(parsed.name, "Hosting");
  assert.equal("owner_id" in parsed, false);
  assert.equal(parsed.paid_on, null);
});
