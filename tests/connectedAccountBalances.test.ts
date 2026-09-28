import test from "node:test";
import assert from "node:assert/strict";
import { compareConnectedBalance } from "../src/lib/moneyIntelligence/types";

test("connected balance comparison flags a material difference for review", () => {
  const result = compareConnectedBalance({ accountId: "acct-1", canonicalBalance: 1000, reportedBalance: 925.25, reportedAt: "2026-09-28T10:00:00Z" });
  assert.equal(result.difference, -74.75);
  assert.equal(result.requiresReview, true);
});

test("connected balance comparison does not flag matching balances", () => {
  const result = compareConnectedBalance({ accountId: "acct-1", canonicalBalance: 1000, reportedBalance: 1000, reportedAt: "2026-09-28T10:00:00Z" });
  assert.equal(result.difference, 0);
  assert.equal(result.requiresReview, false);
});

test("connected balance comparison does not invent a canonical balance", () => {
  const result = compareConnectedBalance({ accountId: "acct-1", reportedBalance: 1000, reportedAt: "2026-09-28T10:00:00Z" });
  assert.equal(result.canonicalBalance, undefined);
  assert.equal(result.difference, undefined);
  assert.equal(result.requiresReview, false);
});
