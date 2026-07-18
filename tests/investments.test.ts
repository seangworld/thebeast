import assert from "node:assert/strict";
import test from "node:test";
import {
  INVESTMENT_ACCOUNT_TYPES,
  INVESTMENT_ASSET_CLASSES,
  INVESTMENT_MODEL_BOUNDARY,
  buildInvestmentPortfolio,
  validateInvestmentPortfolio,
} from "../src/lib/investments";

const accounts = [
  { id: "brokerage", name: "Brokerage", type: "brokerage" as const, taxTreatment: "taxable" as const },
  { id: "retirement", name: "Retirement", type: "retirement" as const, taxTreatment: "tax_deferred" as const },
];

test("BM-31 defines canonical investment accounts holdings contributions and allocations", () => {
  const portfolio = buildInvestmentPortfolio({
    accounts,
    holdings: [
      { id: "bond-fund", accountId: "retirement", name: "Bond fund", assetClass: "bond", valuedOn: "2026-07-18", marketValue: 30_000 },
      { id: "stock-fund", accountId: "brokerage", name: "Stock fund", assetClass: "fund", valuedOn: "2026-07-18", marketValue: 70_000 },
    ],
    contributions: [
      { id: "deposit", accountId: "brokerage", occurredOn: "2026-06-01", amount: 5_000, direction: "contribution" },
      { id: "withdrawal", accountId: "brokerage", occurredOn: "2026-07-01", amount: 500, direction: "withdrawal" },
    ],
  });

  assert.deepEqual(INVESTMENT_ACCOUNT_TYPES, ["brokerage", "retirement", "education", "health_savings", "other"]);
  assert.deepEqual(INVESTMENT_ASSET_CLASSES, ["cash", "stock", "bond", "fund", "real_estate", "other"]);
  assert.equal(portfolio.marketValue, 100_000);
  assert.equal(portfolio.netContributions, 4_500);
  assert.deepEqual(portfolio.allocation, [
    { assetClass: "bond", marketValue: 30_000, percentage: 30 },
    { assetClass: "fund", marketValue: 70_000, percentage: 70 },
  ]);
  assert.deepEqual(portfolio.accounts.map(({ account, marketValue }) => ({ id: account.id, marketValue })), [
    { id: "brokerage", marketValue: 70_000 },
    { id: "retirement", marketValue: 30_000 },
  ]);
});

test("BM-31 produces deterministic ordering and honest zero allocation", () => {
  const portfolio = buildInvestmentPortfolio({
    accounts: [accounts[1], accounts[0]],
    holdings: [],
    contributions: [],
  });
  assert.deepEqual(portfolio.accounts.map(({ account }) => account.id), ["brokerage", "retirement"]);
  assert.deepEqual(portfolio.allocation, []);
  assert.equal(portfolio.marketValue, 0);
  assert.equal(portfolio.netContributions, 0);
});

test("BM-31 rejects duplicates orphan records invalid dates and invalid amounts", () => {
  const errors = validateInvestmentPortfolio({
    accounts: [accounts[0], accounts[0]],
    holdings: [{ id: "orphan", accountId: "missing", name: "Unknown", assetClass: "other", valuedOn: "July", marketValue: -1 }],
    contributions: [{ id: "orphan", accountId: "missing", occurredOn: "bad", amount: 0, direction: "contribution" }],
  });
  for (const expected of ["Duplicate investment account", "missing account", "invalid valuation date", "non-negative finite market value", "invalid date", "positive finite amount"]) {
    assert.equal(errors.some((error) => error.includes(expected)), true);
  }
});

test("BM-31 preserves a non-advisory and provider-neutral boundary", () => {
  assert.match(INVESTMENT_MODEL_BOUNDARY, /does not provide investment, tax, legal, or financial advice/);
  assert.match(INVESTMENT_MODEL_BOUNDARY, /recommend securities or allocations/);
  assert.match(INVESTMENT_MODEL_BOUNDARY, /connect to institutions/);
  assert.match(INVESTMENT_MODEL_BOUNDARY, /calculate performance/);
});
