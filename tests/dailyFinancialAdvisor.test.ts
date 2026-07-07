import assert from "node:assert/strict";
import test from "node:test";
import { buildCashIntelligence } from "../src/lib/cashIntelligence";
import { buildDailyFinancialAdvisor } from "../src/lib/dailyFinancialAdvisor";
import { buildFinancialDecision } from "../src/lib/financialDecisionEngine";
import { buildFinancialForecast } from "../src/lib/financialForecasting";
import { runVelocityBankingEngine } from "../src/lib/velocity";

const debts = [
  {
    id: "discover",
    name: "Discover",
    balance: 2400,
    minimum_payment: 120,
    interest_rate: 18,
  },
];

test("buildDailyFinancialAdvisor recommends paying the target debt today", () => {
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
  const financialForecast = buildFinancialForecast({
    asOfDate: new Date("2026-07-01T00:00:00"),
    cashIntelligence,
    financialDecision,
    debts,
    income: [{ amount: 3000, frequency: "monthly", next_date: "2026-07-03" }],
    bills: [{ amount: 1000, frequency: "monthly", due_date: 5 }],
    currentCash: 1000,
    cashBuffer: 500,
  });
  const advisor = buildDailyFinancialAdvisor({
    cashIntelligence,
    financialDecision,
    financialForecast,
    debts,
  });

  assert.equal(advisor.primaryRecommendation.kind, "pay_today");
  assert.equal(advisor.primaryRecommendation.title, "Pay Discover today");
  assert.equal(advisor.primaryRecommendation.interestSaved > 0, true);
  assert.equal(advisor.primaryRecommendation.risk, "low");
});

test("buildDailyFinancialAdvisor recommends waiting when guardrails fail", () => {
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
  const financialForecast = buildFinancialForecast({
    asOfDate: new Date("2026-07-01T00:00:00"),
    cashIntelligence,
    financialDecision,
    debts,
    bills: [{ amount: 900, frequency: "monthly", due_date: 2 }],
    currentCash: 500,
    cashBuffer: 500,
  });
  const advisor = buildDailyFinancialAdvisor({
    cashIntelligence,
    financialDecision,
    financialForecast,
    debts,
  });

  assert.equal(advisor.primaryRecommendation.kind, "wait_until_paycheck");
  assert.equal(advisor.primaryRecommendation.interestSaved, 0);
  assert.equal(advisor.primaryRecommendation.risk, "high");
});

test("buildDailyFinancialAdvisor prioritizes ready Velocity chunks", () => {
  const velocityBanking = runVelocityBankingEngine({
    velocityInputSnapshot: {
      as_of_date: "2026-07-01",
      accounts: [
        { id: "cash", name: "Checking", type: "checking", current_balance: 2000 },
        {
          id: "source",
          name: "HELOC",
          type: "heloc",
          current_balance: 1000,
          credit_limit: 10000,
          available_credit: 9000,
          interest_rate: 8,
        },
      ],
      incomes: [{ amount: 3200, frequency: "monthly", next_date: "2026-07-03" }],
      bills: [{ name: "Mortgage", amount: 1200, is_archived: false }],
      debts,
      settings: {
        cash_buffer: 500,
        max_recommended_payment: 500,
        max_source_utilization_percent: 90,
        minimum_cash_after_payment: 500,
        monthly_recovery_capacity: 250,
        recovery_months: 6,
        strategy: "aggressive",
      },
    },
  });
  const cashIntelligence = buildCashIntelligence({
    income: [{ amount: 3200, frequency: "monthly", next_date: "2026-07-03" }],
    bills: [{ amount: 1200 }],
    debtMinimums: debts,
    settings: { currentCash: 2000, cashBuffer: 500 },
  });
  const financialDecision = buildFinancialDecision({
    cashIntelligence,
    debts,
    income: [{ amount: 3200 }],
    bills: [{ amount: 1200 }],
    strategy: "velocity",
  });
  const financialForecast = buildFinancialForecast({
    cashIntelligence,
    financialDecision,
    debts,
    income: [{ amount: 3200, frequency: "monthly", next_date: "2026-07-03" }],
    bills: [{ amount: 1200 }],
    currentCash: 2000,
    cashBuffer: 500,
  });
  const advisor = buildDailyFinancialAdvisor({
    cashIntelligence,
    financialDecision,
    financialForecast,
    debts,
    velocityBanking,
  });

  assert.equal(advisor.primaryRecommendation.kind, "execute_velocity_chunk");
  assert.equal(advisor.primaryRecommendation.interestSaved > 0, true);
});
