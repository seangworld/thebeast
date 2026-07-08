import assert from "node:assert/strict";
import test from "node:test";
import { buildCashIntelligence } from "../src/lib/cashIntelligence";
import { buildFinancialDecision } from "../src/lib/financialDecisionEngine";
import { compareFinancialScenarios } from "../src/lib/financialScenarios";

const debts = [
  { id: "card-a", name: "Card A", balance: 3000, minimum_payment: 100, interest_rate: 24 },
  { id: "card-b", name: "Card B", balance: 1200, minimum_payment: 60, interest_rate: 12 },
];

test("compareFinancialScenarios returns required strategy scenarios", () => {
  const cashIntelligence = buildCashIntelligence({
    asOfDate: new Date("2026-07-01T00:00:00"),
    income: [{ amount: 4000, frequency: "monthly" }],
    bills: [{ amount: 1400, frequency: "monthly" }],
    debtMinimums: debts,
    settings: { currentCash: 1500, cashBuffer: 500 },
  });
  const financialDecision = buildFinancialDecision({
    cashIntelligence,
    debts,
    income: [{ amount: 4000 }],
    bills: [{ amount: 1400 }],
    strategy: "avalanche",
  });
  const comparison = compareFinancialScenarios({
    asOfDate: new Date("2026-07-01T00:00:00"),
    debts,
    cashIntelligence,
    financialDecision,
    customDebtOrder: ["card-b", "card-a"],
  });

  assert.deepEqual(
    comparison.scenarios.map((scenario) => scenario.kind),
    [
      "minimum",
      "snowball",
      "avalanche",
      "velocity",
      "custom",
      "extra_payment",
      "payoff_by_date",
      "cash_assumption",
    ]
  );
  assert.equal(comparison.bestByInterest.interestSaved >= 0, true);
  assert.equal(comparison.bestBySpeed.timeSavedMonths >= 0, true);
  assert.equal(comparison.scenarios.every((scenario) => scenario.riskLevel), true);
});

test("extra payment and cash assumption scenarios increase monthly cash strain", () => {
  const cashIntelligence = buildCashIntelligence({
    income: [{ amount: 4000, frequency: "monthly" }],
    bills: [{ amount: 1400, frequency: "monthly" }],
    debtMinimums: debts,
    settings: { currentCash: 1500, cashBuffer: 500 },
  });
  const financialDecision = buildFinancialDecision({
    cashIntelligence,
    debts,
    income: [{ amount: 4000 }],
    bills: [{ amount: 1400 }],
    strategy: "avalanche",
  });
  const comparison = compareFinancialScenarios({
    debts,
    cashIntelligence,
    financialDecision,
  });
  const minimum = comparison.scenarios.find((scenario) => scenario.kind === "minimum");
  const extra = comparison.scenarios.find((scenario) => scenario.kind === "extra_payment");
  const cashAssumption = comparison.scenarios.find((scenario) => scenario.kind === "cash_assumption");

  assert.equal(Boolean(minimum && extra && cashAssumption), true);
  assert.equal(Number(extra?.monthlyCashStrain) > Number(minimum?.monthlyCashStrain), true);
  assert.equal(Number(cashAssumption?.recommendedExtraPayment) > financialDecision.suggestedExtraPayment, true);
});
