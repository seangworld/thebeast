import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { beastMoneyCoreNavigation } from "../src/lib/moneyNavigation";
import { beastMoneyNavigation } from "../src/lib/moduleNavigation";

const source = (path: string) => readFileSync(path, "utf8");

test("BP-230 routes BeastMoney and mobile entry points to Dashboard", () => {
  const landing = source("src/app/dashboard/money/page.tsx");
  const mobile = source("src/lib/mobileFoundation.ts");

  assert.equal(beastMoneyNavigation.href, "/dashboard/money/dashboard");
  assert.match(landing, /redirect\("\/dashboard\/money\/dashboard"\)/);
  assert.match(landing, /\/dashboard\/money\/coach\?starter=/);
  assert.match(
    mobile,
    /label: "Money", href: "\/dashboard\/money\/dashboard"/
  );
});

test("BP-230 exposes only the approved workspace hierarchy", () => {
  assert.deepEqual(
    beastMoneyCoreNavigation.map(({ label, parent }) => ({
      label,
      parent: parent || null,
    })),
    [
      { label: "Dashboard", parent: null },
      { label: "Money Coach", parent: null },
      { label: "Cash Flow", parent: null },
      { label: "Income", parent: "Cash Flow" },
      { label: "Expenses", parent: "Cash Flow" },
      { label: "Bills", parent: "Expenses" },
      { label: "Debts", parent: "Expenses" },
      { label: "Payoff Plan", parent: null },
      { label: "Strategies", parent: "Payoff Plan" },
      { label: "Timeline", parent: "Payoff Plan" },
      { label: "Retirement", parent: null },
      { label: "Financial Goals", parent: null },
      { label: "Financial Documents", parent: null },
      { label: "Reports", parent: null },
    ]
  );
  assert.equal(
    beastMoneyCoreNavigation.some(
      ({ label }) => label === "Observation Center"
    ),
    false
  );
});

test("BP-230 gives expenses payoff and reports distinct workspace ownership", () => {
  const expenses = source("src/app/dashboard/money/expenses/page.tsx");
  const payoff = source("src/app/dashboard/money/debts/page.tsx");
  const reports = source("src/app/dashboard/money/reports/page.tsx");
  const workspace = source(
    "src/app/dashboard/money/components/MoneyWorkspacePage.tsx"
  );

  assert.match(expenses, /title="Expenses"/);
  assert.match(expenses, /Manage bills/);
  assert.match(expenses, /Manage debts/);
  assert.match(expenses, /payoff strategy[\s\S]*Payoff Plan/i);
  assert.match(payoff, /title=\{view === "debts" \? "Debts" : "Payoff Plan"\}/);
  assert.match(payoff, /id="strategy-comparison"/);
  assert.match(payoff, /id="payoff-plan"/);
  assert.match(reports, /view="reports"/);
  assert.match(workspace, /data-money-reports-workspace="true"/);
});

test("BP-401 keeps Cash Flow presentation separate from the Bills workspace", () => {
  const cashFlow = source("src/app/dashboard/money/cashflow/page.tsx");

  assert.doesNotMatch(cashFlow, /<DebtAttackRecommendation/);
  assert.doesNotMatch(cashFlow, /<StrategySnapshot/);
  assert.doesNotMatch(cashFlow, /<DebtsSection/);
  assert.doesNotMatch(cashFlow, /<IncomeSourcesSection/);
  assert.match(cashFlow, /if \(view === "bills"\)[\s\S]*includeIncome=\{false\}/);
  assert.ok(
    cashFlow.indexOf('if (view === "bills")') <
      cashFlow.indexOf('title="Cash Flow"')
  );
  assert.match(cashFlow, /availableCredit=\{creditAvailableTotal\}/);
});

test("BP-230 keeps the retired Observation Center route non-empty and useful", () => {
  const route = source("src/app/dashboard/money/observations/page.tsx");
  const dashboard = source(
    "src/app/dashboard/money/components/FinancialMissionControl.tsx"
  );

  assert.match(
    route,
    /redirect\("\/dashboard\/money\/dashboard#important-alerts"\)/
  );
  assert.match(dashboard, /id="important-alerts"/);
  assert.match(dashboard, /Discuss with Money Coach/);
});
