import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { beastMoneyCoreNavigation, isBeastMoneyNavigationActive } from "../src/lib/moneyNavigation";

test("Funding Sources has a discoverable navigation destination", () => {
  const item = beastMoneyCoreNavigation.find((entry) => entry.label === "Funding Sources");
  assert.deepEqual(item, {
    label: "Funding Sources",
    href: "/dashboard/money/cashflow#funding-sources",
    parent: "Cash Flow",
  });
  assert.ok(isBeastMoneyNavigationActive(item!, "/dashboard/money/cashflow", "#funding-sources"));
  const component = readFileSync("src/app/dashboard/money/cashflow/components/FundingSourcesSection.tsx", "utf8");
  assert.match(component, /id="funding-sources"/);
  assert.match(component, /Payment &amp; Funding Accounts/);
});
test("Settings links to existing funding accounts and Velocity emergency reserve controls", () => {
  const settings = readFileSync("src/app/dashboard/money/settings/page.tsx", "utf8");
  const velocity = readFileSync("src/app/dashboard/money/velocity/page.tsx", "utf8");
  assert.match(settings, /href="\/dashboard\/money\/cashflow#funding-sources"/);
  assert.match(settings, /href="\/dashboard\/money\/velocity#velocity-guardrails"/);
  assert.match(velocity, /id="velocity-guardrails"/);
  assert.match(velocity, /velocitySettings\.emergency_reserve_amount/);
  assert.match(settings, /not a separate HELOC-specific buffer/);
  assert.match(settings, /checking_buffer: Number\(buffer\)/);
});
