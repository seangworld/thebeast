import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastLearningNavigation,
  beastMoneyNavigation,
  beastOSNavigation,
  findActiveExpandableModule,
  toggleExpandedModule,
  type ModuleNavSection,
} from "../src/lib/moduleNavigation";

const navigation: ModuleNavSection[] = [
  beastOSNavigation,
  beastMoneyNavigation,
  beastLearningNavigation,
];

test("opening BeastMoney closes BeastOS", () => {
  const openModule = toggleExpandedModule("beastos", "money");

  assert.equal(openModule, "money");
});

test("opening BeastLearning closes BeastMoney", () => {
  const openModule = toggleExpandedModule("money", "learning");

  assert.equal(openModule, "learning");
});

test("direct BeastMoney routes expand only BeastMoney", () => {
  assert.equal(
    findActiveExpandableModule("/dashboard/money/debts", navigation),
    "money"
  );
});

test("direct BeastOS routes expand only BeastOS", () => {
  assert.equal(
    findActiveExpandableModule("/dashboard/notifications", navigation),
    "beastos"
  );
});

test("the dashboard root initializes with only BeastOS expanded", () => {
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");

  assert.match(
    layout,
    /getTopLevelModuleForWorkspace\(getWorkspaceModule\(pathname\)\)/
  );
  assert.match(
    layout,
    /\|\| getTopLevelModuleForWorkspace\(workspaceModule\)/
  );
});

test("the current group can be manually collapsed", () => {
  assert.equal(toggleExpandedModule("money", "money"), null);
});

test("route reconciliation replaces stale expansion after refresh", () => {
  const staleOpenModule = "beastos";
  const routeOpenModule = findActiveExpandableModule(
    "/dashboard/money",
    navigation
  );

  assert.notEqual(staleOpenModule, routeOpenModule);
  assert.equal(routeOpenModule, "money");
});

test("future expandable modules participate without accordion changes", () => {
  const futureNavigation: ModuleNavSection = {
    label: "BeastSecurity",
    href: "/dashboard/security",
    module: "projects",
    children: [
      { label: "Overview", href: "/dashboard/security" },
      { label: "Alerts", href: "/dashboard/security/alerts" },
    ],
  };

  assert.equal(
    findActiveExpandableModule("/dashboard/security/alerts", [
      ...navigation,
      futureNavigation,
    ]),
    "projects"
  );
});

test("desktop and mobile navigation share exclusive state and active-child logic", () => {
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");

  assert.match(
    layout,
    /const \[expandedModule, setExpandedModule\] = useState<ModuleKey \| null>/
  );
  assert.match(layout, /expandedModule === item\.module/);
  assert.match(layout, /active=\{active\}/);
  assert.match(layout, /isBeastMoneyNavigationActive\(item, pathname, locationHash\)/);
  assert.match(layout, /controlIdPrefix="mobile"/);
  assert.match(layout, /aria-expanded=\{expanded\}/);
  assert.match(layout, /aria-controls=\{navGroupId\}/);
  assert.doesNotMatch(layout, /expandedModules/);
});
