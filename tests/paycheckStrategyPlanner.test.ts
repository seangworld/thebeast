import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const planner = readFileSync(
  "src/app/dashboard/money/cashflow/components/IncomeDatePlanningSection.tsx",
  "utf8"
);
const cashFlow = readFileSync(
  "src/app/dashboard/money/cashflow/page.tsx",
  "utf8"
);
const paymentActions = readFileSync(
  "src/app/dashboard/money/cashflow/hooks/useCashFlowPaymentActions.ts",
  "utf8"
);

test("paycheck strategy planner supports the spreadsheet-style monthly workflow", () => {
  assert.match(planner, /data-paycheck-strategy-planner="true"/);
  assert.match(planner, /id="paycheck-strategy"/);
  assert.match(planner, />Paycheck Strategy</);
  assert.match(planner, /Plan the next month paycheck by paycheck/);
  assert.match(planner, /Choose the paycheck that should cover each obligation/);
  assert.match(planner, /Paycheck strategy planning window/);
  for (const days of [30, 60, 90, 180]) assert.match(planner, new RegExp(`<option value=\\{${days}\\}>${days} days`));
  assert.match(planner, /Cash Flow alert window stays unchanged/);
  assert.match(planner, /planningBuckets\.map/);
  assert.match(planner, /updateBillIncomeDate\(id, date\)/);
  assert.match(planner, /updateDebtIncomeDate\(id, date\)/);
  assert.match(planner, /value=\{item\.assigned_income_date \|\| ""\}/);
});

test("each paycheck shows assigned spending, remaining cash, and the suggested debt move", () => {
  for (const label of [
    "Paycheck",
    "Assigned",
    "Available",
    "Debt Minimums",
    "Suggested extra-debt move",
    "No safe extra payment is suggested from this paycheck.",
  ]) {
    assert.match(planner, new RegExp(label));
  }
  assert.match(planner, /bucket\.safeAfterBuffer/);
  assert.match(planner, /recommendedTargetDebt\.name/);
  assert.match(planner, /strategyLabel/);
  assert.match(cashFlow, /recommendedTargetDebt=\{recommendedTargetDebt\}/);
  assert.match(cashFlow, /strategyLabel=\{getDebtStrategyLabel\(strategy\)\}/);
  assert.match(cashFlow, /useState\(30\)/);
  assert.match(cashFlow, /planningWindowDays=\{paycheckPlanningDays\}/);
  assert.match(cashFlow, /setPlanningWindowDays=\{setPaycheckPlanningDays\}/);
  assert.match(cashFlow, /addDays\(start, paycheckPlanningDays\)/);
});

test("Income links directly to the operational paycheck board", () => {
  const income = readFileSync(
    "src/app/dashboard/money/income/IncomeWorkspace.tsx",
    "utf8"
  );
  assert.match(income, /href="\/dashboard\/money\/cashflow#paycheck-strategy"/);
  assert.match(income, /Open Paycheck Strategy/);
});

test("paycheck reassignment writes remain owner scoped", () => {
  assert.match(paymentActions, /updateBillIncomeDate[\s\S]*\.eq\("id", billId\)[\s\S]*\.eq\("user_id", userId\)/);
  assert.match(paymentActions, /updateDebtIncomeDate[\s\S]*\.eq\("id", debtId\)[\s\S]*\.eq\("user_id", userId\)/);
  assert.match(paymentActions, /Bill moved to the selected paycheck/);
  assert.match(paymentActions, /Debt minimum moved to the selected paycheck/);
});
