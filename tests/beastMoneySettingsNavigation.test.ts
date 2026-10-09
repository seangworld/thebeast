import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { beastMoneyCoreNavigation, isBeastMoneyNavigationActive } from "../src/lib/moneyNavigation";
import { beastMoneyNavigation } from "../src/lib/moduleNavigation";

test("BeastMoney exposes Settings as a top-level navigation item", () => {
  const item = beastMoneyCoreNavigation.find((entry) => entry.label === "Settings");
  assert.deepEqual(item, { label: "Settings", href: "/dashboard/money/settings" });
  assert.equal(item?.parent, undefined);
  assert.ok(beastMoneyNavigation.children?.some((entry) => entry.href === "/dashboard/money/settings"));
  assert.equal(isBeastMoneyNavigationActive(item!, "/dashboard/money/settings"), true);
});

test("Money Settings retains saved cash and debt controls in standard Money surfaces", () => {
  const source = readFileSync("src/app/dashboard/money/settings/page.tsx", "utf8");
  for (const expected of [
    "BeastMoneyShell", "money-page-stack", "money-section-card",
    "money-section-header", "money-field-grid", "money-section-title",
    "money-checking-buffer", "money-starting-balance", "money-lookahead",
    "money-assignment-horizon", "money-debt-strategy", "money-extra-attack",
    'from("cash_settings")', 'from("debt_settings")', "Save All Settings",
  ]) assert.ok(source.includes(expected), `Missing ${expected}`);
  assert.match(source, /separate from your HELOC reserve/);
  assert.match(source, /role="status" aria-live="polite"/);
});
