import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { beastMoneyCoreNavigation, isBeastMoneyNavigationActive } from "../src/lib/moneyNavigation";
import { beastMoneyNavigation } from "../src/lib/moduleNavigation";
import { buildMobileNavigation } from "../src/lib/mobileFoundation";

const source = (path: string) => readFileSync(path, "utf8");

test("BP-230 makes Dashboard the default while keeping Money Coach distinct", () => {
  const landingRoute = source("src/app/dashboard/money/page.tsx");
  const coachRoute = source("src/app/dashboard/money/coach/page.tsx");
  const workspace = source("src/app/dashboard/money/components/MoneyWorkspacePage.tsx");
  const dashboardRoute = source("src/app/dashboard/money/dashboard/page.tsx");
  assert.match(landingRoute, /redirect\("\/dashboard\/money\/dashboard"\)/);
  assert.match(landingRoute, /\/dashboard\/money\/coach\?starter=/);
  assert.match(coachRoute, /MoneyWorkspacePage view="coach"/);
  assert.match(dashboardRoute, /MoneyWorkspacePage view="dashboard"/);
  assert.match(workspace, /view === "coach" \? <div[^>]*><DebtImmediateAttention[^>]*surface="Money Coach"[^>]*\/><MoneyCoachExperience/);
  assert.match(workspace, /Financial mission control/);
  assert.doesNotMatch(workspace, /window\.location\.hash|hashchange|showDashboard/);
  assert.notEqual(beastMoneyCoreNavigation[0].href, beastMoneyCoreNavigation[1].href);
  assert.deepEqual(beastMoneyCoreNavigation.slice(0, 2), [
    { label: "Dashboard", href: "/dashboard/money/dashboard" },
    { label: "Money Coach", href: "/dashboard/money/coach" },
  ]);
});

test("BP-230 navigation follows the approved workspace hierarchy", () => {
  assert.deepEqual(beastMoneyCoreNavigation.map((item) => item.label), [
    "Dashboard",
    "Money Coach",
    "Cash Flow",
    "Income",
    "Expenses",
    "Bills",
    "Debts",
    "Payoff Plan",
    "Strategies",
    "Timeline",
    "Velocity Banking",
    "Retirement",
    "Financial Goals",
    "Financial Documents",
    "Reports",
  ]);
  assert.deepEqual(
    beastMoneyCoreNavigation
      .filter((item) => item.parent === "Cash Flow")
      .map((item) => item.label),
    ["Income", "Expenses"]
  );
  assert.deepEqual(
    beastMoneyCoreNavigation
      .filter((item) => item.parent === "Expenses")
      .map((item) => item.label),
    ["Bills", "Debts"]
  );
  assert.deepEqual(
    beastMoneyCoreNavigation
      .filter((item) => item.parent === "Payoff Plan")
      .map((item) => item.label),
    ["Strategies", "Timeline"]
  );
  assert.deepEqual(beastMoneyNavigation.children, [...beastMoneyCoreNavigation]);
  assert.equal(beastMoneyCoreNavigation.some((item) => item.label === "Observation Center"), false);
  assert.equal(beastMoneyCoreNavigation.some((item) => item.label === "Velocity Banking" && item.href === "/dashboard/money/velocity"), true);
});

test("BM-303 active state follows direct links refresh and history location changes", () => {
  const activeLabel = (pathname: string, hash = "") => beastMoneyCoreNavigation.find((item) => isBeastMoneyNavigationActive(item, pathname, hash))?.label;
  const history = [
    ["/dashboard/money/dashboard", "", "Dashboard"],
    ["/dashboard/money/coach", "", "Money Coach"],
    ["/dashboard/money/cashflow", "", "Cash Flow"],
    ["/dashboard/money/income", "", "Income"],
    ["/dashboard/money/expenses", "", "Expenses"],
    ["/dashboard/money/bills", "", "Bills"],
    ["/dashboard/money/debts", "", "Debts"],
    ["/dashboard/money/payoff-plan", "", "Payoff Plan"],
    ["/dashboard/money/payoff-plan", "#strategy-comparison", "Strategies"],
    ["/dashboard/money/payoff-plan", "#payoff-plan", "Timeline"],
    ["/dashboard/money/velocity", "", "Velocity Banking"],
    ["/dashboard/money/reports", "", "Reports"],
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
  assert.equal(buildMobileNavigation({ isOwner: false }).primary.find((item) => item.label === "Money")?.href, "/dashboard/money/dashboard");
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
