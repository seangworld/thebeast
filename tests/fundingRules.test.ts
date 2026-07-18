import assert from "node:assert/strict";
import test from "node:test";
import { classifyFundingSource, eligibleBorrowingCapacity, mayFundDebtPayment } from "../src/lib/fundingRules";

test("BM-33 blocks revolving spending from debt payments", () => {
  const card = { type: "credit card", credit_limit: 10000, current_balance: 1000, interest_rate: 12 };
  assert.equal(classifyFundingSource(card), "revolving_spending");
  assert.equal(mayFundDebtPayment(card), false);
  assert.equal(eligibleBorrowingCapacity(card, 24), 0);
});

test("BM-33 permits lower-rate HELOC capacity within utilization", () => {
  const heloc = { type: "HELOC", credit_limit: 10000, current_balance: 2000, interest_rate: 8, max_utilization_percent: 70 };
  assert.equal(mayFundDebtPayment(heloc), true);
  assert.equal(eligibleBorrowingCapacity(heloc, 24), 5000);
  assert.equal(eligibleBorrowingCapacity(heloc, 7), 0);
});
