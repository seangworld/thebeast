import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { beastMoneyCoreNavigation, isBeastMoneyNavigationActive } from "../src/lib/moneyNavigation";
import { beastMoneyNavigation } from "../src/lib/moduleNavigation";
import { buildMobileNavigation } from "../src/lib/mobileFoundation";

const source = (path: string) => readFileSync(path, "utf8");

test("BM-303 gives Money Coach and Dashboard explicit distinct routes", () => {
  const landingRoute = source("src/app/dashboard/money/page.tsx");
  const workspace = source("src/app/dashboard/money/components/MoneyWorkspacePage.tsx");
  const dashboardRoute = source("src/app/dashboard/money/dashboard/page.tsx");
  assert.match(landingRoute, /MoneyWorkspacePage view="coach"/);
  assert.match(dashboardRoute, /MoneyWorkspacePage view="dashboard"/);
  assert.match(workspace, /view === "coach" \? <MoneyCoachExperience/);
  assert.match(workspace, /Financial mission control/);
  assert.doesNotMatch(workspace, /window\.location\.hash|hashchange|showDashboard/);
  assert.notEqual(beastMoneyCoreNavigation[0].href, beastMoneyCoreNavigation[1].href);
  assert.deepEqual(beastMoneyCoreNavigation.slice(0, 2), [
    { label: "Money Coach", href: "/dashboard/money" },
    { label: "Dashboard", href: "/dashboard/money/dashboard" },
  ]);
});

test("BM-303 navigation has one ordered core destination list without add shortcuts", () => {
  assert.deepEqual(beastMoneyCoreNavigation.map((item) => item.label), [
    "Money Coach", "Dashboard", "Observation Center", "Cash Flow", "Income", "Bills", "Debts",
    "Payoff Plan", "Velocity", "Retirement", "Reports", "Settings",
  ]);
  assert.deepEqual(beastMoneyNavigation.children, [...beastMoneyCoreNavigation]);
  assert.equal(beastMoneyCoreNavigation.some((item) => item.label === "Add Bill"), false);
  assert.equal(beastMoneyCoreNavigation.some((item) => item.label === "Add Debt"), false);
});

test("BM-303 active state follows direct links refresh and history location changes", () => {
  const activeLabel = (pathname: string, hash = "") => beastMoneyCoreNavigation.find((item) => isBeastMoneyNavigationActive(item, pathname, hash))?.label;
  const history = [
    ["/dashboard/money", "", "Money Coach"],
    ["/dashboard/money/dashboard", "", "Dashboard"],
    ["/dashboard/money/observations", "", "Observation Center"],
    ["/dashboard/money/dashboard", "#reports", "Reports"],
    ["/dashboard/money/cashflow", "#bills", "Bills"],
    ["/dashboard/money/debts", "#payoff-plan", "Payoff Plan"],
    ["/dashboard/money/debts", "#add-debt", "Debts"],
  ] as const;
  history.forEach(([pathname, hash, expected]) => assert.equal(activeLabel(pathname, hash), expected));
  [...history].reverse().forEach(([pathname, hash, expected]) => assert.equal(activeLabel(pathname, hash), expected));
  assert.equal(activeLabel("/dashboard/money/dashboard", ""), "Dashboard");
});

test("BM-303 desktop and mobile navigation preserve active and history behavior", () => {
  const shell = source("src/app/dashboard/money/BeastMoneyShell.tsx");
  const layout = source("src/app/dashboard/layout.tsx");
  assert.doesNotMatch(shell, /beast-module-tabs|BeastMoney sections/);
  assert.doesNotMatch(shell, /usePathname|hashchange|popstate/);
  assert.match(layout, /isBeastMoneyNavigationActive\(item, pathname, locationHash\)/);
  assert.match(layout, /aria-current=\{active \? "page"/);
  assert.match(layout, /addEventListener\("hashchange"/);
  assert.match(layout, /addEventListener\("popstate"/);
  assert.equal(buildMobileNavigation({ isOwner: false }).primary.find((item) => item.label === "Money")?.href, "/dashboard/money");
});

test("BM-313 keeps the global left navigation as the single BeastMoney navigation source", () => {
  const shell = source("src/app/dashboard/money/BeastMoneyShell.tsx");
  const workspace = source("src/app/dashboard/money/components/MoneyWorkspacePage.tsx");
  const layout = source("src/app/dashboard/layout.tsx");

  assert.doesNotMatch(shell, /<nav|beast-module-tab|beastMoneyCoreNavigation/);
  assert.match(layout, /getBeastModuleNavigationForPersona/);
  assert.match(layout, /personaModuleNavigation/);
  assert.match(layout, /isBeastMoneyNavigationActive/);
  assert.match(workspace, /title="Dashboard"[\s\S]*showPageHeader=\{false\}/);
  assert.match(workspace, /title="Money Coach"[\s\S]*showPageHeader=\{false\}/);
  assert.match(shell, /\{children\}/);

  const dashboard = source("src/app/dashboard/money/components/FinancialMissionControl.tsx");
  assert.ok(
    dashboard.indexOf('id="financial-health"') <
      dashboard.indexOf("<MorningFinancialBriefingPanel"),
    "Dashboard should begin with the Financial Health Score summary"
  );
});

test("BM-303 keeps add controls inside Bills and Debts workspaces", () => {
  const bills = source("src/app/dashboard/money/cashflow/components/AddIncomeBillSection.tsx");
  const debts = source("src/app/dashboard/money/debts/page.tsx");
  assert.match(bills, /id="add-bill"[\s\S]*Add Bill/);
  assert.match(debts, /id="add-debt"[\s\S]*Add Debt/);
});
