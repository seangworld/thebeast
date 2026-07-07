import assert from "node:assert/strict";
import test from "node:test";
import { buildCashIntelligence } from "../src/lib/cashIntelligence";
import { buildFinancialDecision } from "../src/lib/financialDecisionEngine";
import { buildFinancialForecast } from "../src/lib/financialForecasting";

const debts = [
  {
    id: "card-a",
    name: "Card A",
    balance: 2400,
    minimum_payment: 120,
    interest_rate: 18,
  },
];

test("buildFinancialForecast produces 30 day, 90 day, and 1 year projections", () => {
  const cashIntelligence = buildCashIntelligence({
    asOfDate: new Date("2026-07-01T00:00:00"),
    income: [{ amount: 3000, frequency: "monthly", next_date: "2026-07-03" }],
    bills: [{ amount: 1000, frequency: "monthly", due_date: 5 }],
    debtMinimums: debts,
    settings: {
      currentCash: 1000,
      cashBuffer: 500,
      lookaheadDays: 30,
    },
  });
  const financialDecision = buildFinancialDecision({
    cashIntelligence,
    debts,
    income: [{ amount: 3000 }],
    bills: [{ amount: 1000 }],
    strategy: "avalanche",
  });
  const forecast = buildFinancialForecast({
    asOfDate: new Date("2026-07-01T00:00:00"),
    cashIntelligence,
    financialDecision,
    debts,
    income: [{ amount: 3000, frequency: "monthly", next_date: "2026-07-03" }],
    bills: [{ amount: 1000, frequency: "monthly", due_date: 5 }],
    strategy: "avalanche",
    currentCash: 1000,
    cashBuffer: 500,
  });

  assert.deepEqual(
    forecast.periods.map((period) => period.key),
    ["30d", "90d", "1y"]
  );
  assert.equal(forecast.periods[0].cash > 0, true);
  assert.equal(forecast.periods[0].debt < 2400, true);
  assert.equal(forecast.periods[2].interest > forecast.periods[0].interest, true);
  assert.equal(typeof forecast.periods[0].netWorth, "number");
  assert.notEqual(forecast.debtFreeDate, "Not projected");
});

test("buildFinancialForecast reports cash shortages and upcoming risks", () => {
  const cashIntelligence = buildCashIntelligence({
    asOfDate: new Date("2026-07-01T00:00:00"),
    income: [],
    bills: [{ amount: 900, frequency: "monthly", due_date: 2 }],
    debtMinimums: debts,
    settings: {
      currentCash: 500,
      cashBuffer: 500,
      lookaheadDays: 30,
    },
  });
  const financialDecision = buildFinancialDecision({
    cashIntelligence,
    debts,
    bills: [{ amount: 900 }],
    strategy: "avalanche",
  });
  const forecast = buildFinancialForecast({
    asOfDate: new Date("2026-07-01T00:00:00"),
    cashIntelligence,
    financialDecision,
    debts,
    bills: [{ amount: 900, frequency: "monthly", due_date: 2 }],
    currentCash: 500,
    cashBuffer: 500,
  });

  assert.equal(forecast.periods[0].cashShortages > 0, true);
  assert.equal(
    forecast.upcomingRisks.some((risk) => risk.includes("reserve guardrail")),
    true
  );
});
