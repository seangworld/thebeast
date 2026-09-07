import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { calculateEmpireCostRecovery, empireCostCategories, empireProducts } from "../src/lib/beastAdminEmpire";

test("BA-EMPIRE-101 defines five products plus separate Hunter and Marketing navigation", () => {
  assert.deepEqual(empireProducts.map((product) => product.name), [
    "SEANGWORLD.com", "The Beast", "BeastFusion", "SEANGWORLDNEWS", "Change the World",
  ]);
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");
  assert.match(navigation, /group: "BeastHunter"/);
  assert.match(navigation, /group: "BeastMarketing"/);
  assert.match(navigation, /group: "SEANGWORLDNEWS"/);
});

test("BA-EMPIRE-101 refuses to fabricate a total before required cost evidence exists", () => {
  const incomplete = calculateEmpireCostRecovery({ costs: [], revenue: 0, support: 0 });
  assert.equal(incomplete.complete, false);
  assert.equal(incomplete.totalCost, null);

  const costs = empireCostCategories.filter((category) => category.id !== "other").map((category) => ({
    category: category.id,
    amount: 10,
    currency: "USD" as const,
    period: "monthly" as const,
    evidence: `${category.label} invoice`,
  }));
  const complete = calculateEmpireCostRecovery({ costs, revenue: 20, support: 10 });
  assert.equal(complete.complete, true);
  assert.equal(complete.totalCost, 60);
  assert.equal(complete.recovered, 30);
  assert.equal(complete.gap, 30);
  assert.equal(complete.recoveryRate, 0.5);
});

test("BA-EMPIRE-101 keeps cost recovery private and avoids public billing language", () => {
  const page = readFileSync("src/app/dashboard/admin/empire/page.tsx", "utf8");
  assert.match(page, /CEO only/);
  assert.match(page, /Not connected/);
  assert.doesNotMatch(page, /credit balance|billing issue|quota exhausted/i);
});
