import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { beastMoneyCoreNavigation } from "../src/lib/moneyNavigation";

const source = (path: string) => readFileSync(path, "utf8");

test("BM-401 keeps the Dashboard dense and delegates score explanation to its workspace", () => {
  const dashboard = source(
    "src/app/dashboard/money/components/FinancialMissionControl.tsx"
  );
  const scoreWorkspace = source(
    "src/app/dashboard/money/components/FinancialHealthScoreWorkspace.tsx"
  );
  const scoreRoute = source(
    "src/app/dashboard/money/financial-health/page.tsx"
  );

  assert.match(dashboard, /min-h-\[10\.5rem\]/);
  assert.match(dashboard, /2xl:grid-cols-6/);
  assert.doesNotMatch(dashboard, /id="financial-health-score"/);
  assert.doesNotMatch(dashboard, /How your Financial Health Score is calculated/);
  assert.match(scoreRoute, /view="financial-health"/);
  assert.match(scoreWorkspace, /Category breakdown/);
  assert.match(scoreWorkspace, /Current strength/);
  assert.match(scoreWorkspace, /Improvement opportunities/);
  assert.match(scoreWorkspace, /Score history/);
});

test("BM-401 creates a real new Money Coach conversation and restores the avatar", () => {
  const coach = source(
    "src/app/dashboard/money/components/MoneyCoachExperience.tsx"
  );
  const sharedWorkspace = source(
    "src/app/components/agents/ProfessionalConversationWorkspace.tsx"
  );

  const start = coach.indexOf("async function startConversation()");
  const clear = coach.indexOf('setActiveThreadId("");', start);
  const create = coach.indexOf("await repository.create", start);

  assert.ok(start >= 0);
  assert.ok(clear > start && clear < create);
  assert.match(coach, /setTurns\(\[\]\)/);
  assert.match(coach, /startConversation\(\)\.then\(\(\) =>[\s\S]*focusComposer/);
  assert.match(coach, /disabled=\{!repository\}/);
  assert.match(coach, /professionalAvatar=/);
  assert.match(coach, /initials="MC"/);
  assert.match(sharedWorkspace, /message\.role === "agent" && professionalAvatar/);
});

test("BM-401 nests expense workspaces and preserves Payoff Plan ownership", () => {
  const parentByLabel = Object.fromEntries(
    beastMoneyCoreNavigation.map((item) => [item.label, item.parent])
  );
  const layout = source("src/app/dashboard/layout.tsx");

  assert.equal(parentByLabel.Income, "Cash Flow");
  assert.equal(parentByLabel.Expenses, "Cash Flow");
  assert.equal(parentByLabel.Bills, "Expenses");
  assert.equal(parentByLabel.Debts, "Expenses");
  assert.equal(parentByLabel.Strategies, "Payoff Plan");
  assert.equal(parentByLabel.Timeline, "Payoff Plan");
  assert.match(layout, /function ChildBranch/);
  assert.match(layout, /candidate\.parent === child\.label/);
});

test("BM-401 labels current-period cash flow as Monthly Income without redundant copy", () => {
  const cashFlow = source(
    "src/app/dashboard/money/cashflow/components/CashFlowOverview.tsx"
  );

  assert.match(cashFlow, /Monthly Income/);
  assert.match(cashFlow, /\$\{incomeExpected\.toFixed\(2\)\}/);
  assert.doesNotMatch(cashFlow, /\$\{incomeExpected\.toFixed\(2\)\} in/);
});
