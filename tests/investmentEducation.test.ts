import assert from "node:assert/strict";
import test from "node:test";
import {
  INVESTMENT_EDUCATION_BOUNDARY,
  INVESTMENT_EDUCATION_TOPIC_IDS,
  listInvestmentEducationTopics,
  organizeDividendRecords,
  summarizeObservedPerformance,
  summarizeRiskReflection,
  validateDividendRecords,
} from "../src/lib/investmentEducation";

const accounts = [
  { id: "retirement", name: "Retirement", type: "retirement" as const, taxTreatment: "tax_deferred" as const },
];
const holdings = [
  { id: "broad-fund", accountId: "retirement", name: "Broad fund", assetClass: "fund" as const, valuedOn: "2026-07-18", marketValue: 10_000 },
];

test("BM-32 provides TSP dividend performance and risk-profile education from official sources", () => {
  const topics = listInvestmentEducationTopics();
  assert.deepEqual(INVESTMENT_EDUCATION_TOPIC_IDS, ["tsp", "dividends", "performance", "risk_profile"]);
  assert.deepEqual(topics.map(({ id }) => id), INVESTMENT_EDUCATION_TOPIC_IDS);
  for (const topic of topics) {
    assert.equal(topic.keyPoints.length >= 3, true);
    assert.equal(topic.reflectionPrompts.length >= 3, true);
    assert.equal(topic.officialSources.every(({ url }) => /^https:\/\/(www\.)?(tsp\.gov|investor\.gov)\//.test(url)), true);
  }
});

test("BM-32 organizes owner-entered dividend records without forecasting payments", () => {
  const dividends = organizeDividendRecords({
    accounts,
    holdings,
    dividends: [
      { id: "older", accountId: "retirement", holdingId: "broad-fund", paidOn: "2026-05-01", grossAmount: 12, disposition: "cash", source: "owner_entered" },
      { id: "newer", accountId: "retirement", holdingId: "broad-fund", paidOn: "2026-06-01", grossAmount: 15, disposition: "reinvested", source: "owner_entered" },
    ],
  });
  assert.deepEqual(dividends.map(({ id }) => id), ["newer", "older"]);
  assert.deepEqual(dividends.map(({ disposition }) => disposition), ["reinvested", "cash"]);
  assert.equal("forecast" in dividends[0], false);
});

test("BM-32 rejects duplicate orphan mismatched and invalid dividend records", () => {
  const errors = validateDividendRecords({
    accounts,
    holdings,
    dividends: [
      { id: "bad", accountId: "missing", holdingId: "broad-fund", paidOn: "July", grossAmount: 0, disposition: "unknown", source: "owner_entered" },
      { id: "bad", accountId: "retirement", holdingId: "missing", paidOn: "2026-07-18", grossAmount: 1, disposition: "cash", source: "owner_entered" },
    ],
  });
  for (const expected of ["Duplicate dividend", "missing account", "does not belong", "missing holding", "invalid payment date", "positive finite gross amount"]) {
    assert.equal(errors.some((error) => error.includes(expected)), true);
  }
});

test("BM-32 explains simple observed performance with transparent limitations", () => {
  const summary = summarizeObservedPerformance({
    periodStart: "2026-01-01",
    periodEnd: "2026-06-30",
    beginningValue: 10_000,
    endingValue: 11_400,
    contributions: 1_000,
    withdrawals: 200,
    reportedFees: 25,
  });
  assert.equal(summary.method, "simple_period_change");
  assert.equal(summary.netExternalFlows, 800);
  assert.equal(summary.observedChangeExcludingExternalFlows, 600);
  assert.equal(summary.simpleChangePercent, 6);
  assert.equal(summary.reportedFees, 25);
  assert.equal(summary.caveats.some((item) => /does not predict future/.test(item)), true);
  assert.equal(summarizeObservedPerformance({ periodStart: "2026-01-01", periodEnd: "2026-01-01", beginningValue: 0, endingValue: 0, contributions: 0, withdrawals: 0 }).simpleChangePercent, null);
});

test("BM-32 preserves risk factors without producing a score profile or allocation", () => {
  const reflection = summarizeRiskReflection({
    timeHorizon: "long",
    lossWillingness: "medium",
    lossCapacity: "low",
    liquidityNeed: "high",
  });
  assert.deepEqual(reflection.factors.map(({ id }) => id), ["timeHorizon", "lossWillingness", "lossCapacity", "liquidityNeed"]);
  assert.equal(reflection.profileLabel, null);
  assert.equal(reflection.score, null);
  assert.equal(reflection.allocationRecommendation, null);
  assert.match(reflection.boundary, /does not assess suitability/);
  assert.match(INVESTMENT_EDUCATION_BOUNDARY, /does not evaluate, recommend, rank, monetize, or integrate financial providers/);
  assert.match(INVESTMENT_EDUCATION_BOUNDARY, /forecast returns or dividends/);
});
