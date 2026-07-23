import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { defaultAgentActionTools } from "../src/lib/platform/agents/tools";
import { beastMoneyCoreNavigation } from "../src/lib/moneyNavigation";
import { buildFinancialMissionControl } from "../src/lib/financialMissionControl";

const source = readFileSync("src/app/dashboard/money/income/IncomeWorkspace.tsx", "utf8");

test("BM-307 exposes a dedicated Income workspace and primary navigation", () => {
  assert.ok(beastMoneyCoreNavigation.some((item) => item.label === "Income" && item.href === "/dashboard/money/income"));
  assert.match(source, /data-income-workspace="true"/);
  for (const label of ["Income Sources", "Income Pots", "Paycheck Schedule", "Funding Rules", "Transfers", "Archived Income"]) {
    assert.match(source, new RegExp(label));
  }
});

test("BM-307 supports the complete owner-scoped income lifecycle", () => {
  assert.match(source, /\.eq\("user_id", ownerId\)/);
  for (const action of ["Add income", "Edit", "Delete", "Archive", "Enable", "Disable", "Preview", "Restore"]) {
    assert.match(source, new RegExp(action));
  }
  assert.match(source, /window\.confirm/);
  assert.match(source, /is_active/);
  assert.match(source, /is_archived/);
});

test("BM-307 registers structured Money Coach income tools", () => {
  const open = defaultAgentActionTools.find((tool) => tool.id === "open-income");
  const add = defaultAgentActionTools.find((tool) => tool.id === "add-income");
  const pots = defaultAgentActionTools.find((tool) => tool.id === "open-income-pots");
  assert.equal(open?.target, "/dashboard/money/income");
  assert.equal(add?.target, "/dashboard/money/income#income-sources");
  assert.equal(pots?.target, "/dashboard/money/income#income-pots");
});

test("BM-307 dashboard income summaries open the Income workspace", () => {
  const model = buildFinancialMissionControl({
    ownerId: "owner-1",
    asOf: "2026-07-23T12:00:00.000Z",
    financialHealthScore: 75,
    healthBand: "Good",
    healthSummary: "Stable",
    projectedSurplus: 1000,
    monthlyIncome: 5000,
    monthlyOutflow: 4000,
    startingCash: 6000,
    cashBuffer: 2000,
    totalDebt: 10000,
    debtProgressPercent: 20,
    monthlyDebtReduction: 500,
    debtFreedomCountdown: "20 months",
    retirementDataAvailable: false,
    monthlyBills: 2500,
    debtMinimums: 500,
    cashEfficiency: 20,
    upcomingObligations: [],
    observations: [],
    recommendedFocus: { title: "Review income", action: "Confirm timing", why: "Current data", href: "/dashboard/money/income" },
    scenarios: [],
    benchmarks: [],
  });
  assert.equal(model.heroCards.find((card) => card.id === "monthly-surplus")?.href, "/dashboard/money/income");
});
