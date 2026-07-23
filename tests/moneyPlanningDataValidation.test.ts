import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildMoneyCoachObservations } from "../src/lib/moneyCoachObservations";

const now = "2026-07-23T16:00:00.000Z";

function observationsFor(
  debts: Array<{
    id: string;
    name: string;
    balance: number;
    minimumPayment: number;
    interestRate: number;
    minimumPaymentKnown?: boolean;
    interestRateKnown?: boolean;
  }>
) {
  return buildMoneyCoachObservations(
    {
      current: {
        capturedAt: now,
        monthlyIncome: 5000,
        monthlyOutflow: 3000,
        projectedSurplus: 2000,
        currentCash: 5000,
        cashBuffer: 2000,
        totalDebt: debts.reduce((total, debt) => total + debt.balance, 0),
        debts,
      },
      history: [],
    },
    "owner-1",
    now
  );
}

test("BM-316 treats Home Depot 0% APR and Lowe's $0 minimum as valid planning data", () => {
  const observations = observationsFor([
    {
      id: "home-depot",
      name: "Home Depot",
      balance: 1200,
      minimumPayment: 50,
      interestRate: 0,
    },
    {
      id: "lowes",
      name: "Lowe's",
      balance: 800,
      minimumPayment: 0,
      interestRate: 28.99,
    },
  ]);

  assert.equal(
    observations.some(
      (observation) =>
        observation.provenance.ruleId ===
        "money.debts.missing-planning-fields"
    ),
    false
  );
});

test("BM-316 reports only truly unknown planning values with field-specific impact", () => {
  const observations = observationsFor([
    {
      id: "unknown-rate",
      name: "Store account",
      balance: 500,
      minimumPayment: 0,
      interestRate: 0,
      minimumPaymentKnown: true,
      interestRateKnown: false,
    },
  ]);
  const missing = observations.find(
    (observation) =>
      observation.provenance.ruleId ===
      "money.debts.missing-planning-fields"
  );

  assert.ok(missing);
  assert.match(missing.presentation.title, /needs interest rate/i);
  assert.match(missing.presentation.detail, /interest cost/i);
  assert.match(missing.presentation.whyNoticed, /null, undefined, or blank/i);
  assert.doesNotMatch(missing.presentation.title, /missing planning data/i);
});

test("BM-316 preserves zero values in debt and cash-flow edit forms", () => {
  const debtPage = readFileSync(
    "src/app/dashboard/money/debts/page.tsx",
    "utf8"
  );
  const cashFlow = readFileSync(
    "src/app/dashboard/money/cashflow/useCashFlow.ts",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/money/components/MoneyWorkspacePage.tsx",
    "utf8"
  );

  assert.match(debtPage, /String\(debt\.minimum_payment \?\? ""\)/);
  assert.match(debtPage, /String\(debt\.interest_rate \?\? ""\)/);
  assert.match(cashFlow, /String\(debt\.minimum_payment \?\? ""\)/);
  assert.match(cashFlow, /String\(debt\.interest_rate \?\? ""\)/);
  assert.match(workspace, /minimumPaymentKnown: isKnownNumericInput/);
  assert.match(workspace, /interestRateKnown: isKnownNumericInput/);
});

test("BM-316 renders one greeting and one non-greeting Daily Briefing heading", () => {
  const panel = readFileSync(
    "src/app/dashboard/money/components/MorningFinancialBriefing.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/money/components/MoneyCoachExperience.tsx",
    "utf8"
  );
  const builder = readFileSync("src/lib/moneyMorningBriefing.ts", "utf8");

  assert.match(panel, /Daily Briefing/);
  assert.match(panel, /Since your last review/);
  assert.doesNotMatch(panel, /briefing\.greeting/);
  assert.doesNotMatch(builder, /timeGreeting/);
  assert.equal(
    (workspace.match(/<AgentGreeting/g) || []).length,
    1
  );
  assert.doesNotMatch(workspace, /reviewIntroduction/);
});
