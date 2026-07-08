import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const moneyPageSource = readFileSync(
  "src/app/dashboard/money/page.tsx",
  "utf8"
);

test("Money cockpit consumes shared v2.1 engine surfaces", () => {
  [
    "buildCashIntelligence",
    "buildFinancialDecision",
    "buildFinancialForecast",
    "buildFinancialInsights",
    "compareFinancialScenarios",
    "buildFinancialSimulationState",
    "buildFinancialCoach",
    "buildFinancialReports",
  ].forEach((engineName) => {
    assert.equal(
      moneyPageSource.includes(engineName),
      true,
      `Money cockpit should consume ${engineName}`
    );
  });
});

test("Money cockpit exposes printable reports without freezing the current date", () => {
  assert.equal(moneyPageSource.includes("window.print()"), true);
  assert.equal(moneyPageSource.includes("Print BeastMoney reports"), true);
  assert.equal(moneyPageSource.includes("2026-07-04"), false);
  assert.equal(moneyPageSource.includes("Date.now()"), false);
});
