import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("SEANGWORLD HQ exposes a dedicated production front door", () => {
  assert.ok(existsSync("src/app/dashboard/operations/production/page.tsx"));
  const navigation = readFileSync("src/lib/operationsNavigation.ts", "utf8");
  const page = readFileSync("src/app/dashboard/operations/production/page.tsx", "utf8");
  const workspace = readFileSync("src/app/dashboard/operations/production/ProductionWorkspace.tsx", "utf8");

  assert.match(navigation, /Production[\s\S]*?\/dashboard\/operations\/production/);
  assert.match(page, /Start revenue-producing work in one place/);
  for (const start of ["Start with my idea", "Find something worth making", "Run a $99 Code Risk Scan"]) assert.ok(workspace.includes(start));
  for (const stage of ["Choose", "Set the run", "Agents produce", "You review", "Publish or deliver"]) assert.match(workspace, new RegExp(stage));
});

test("Production uses live factories honestly and preserves approved engine boundaries", () => {
  const workspace = readFileSync("src/app/dashboard/operations/production/ProductionWorkspace.tsx", "utf8");
  assert.match(workspace, /Kindle, paperback, and hardcover outputs/);
  assert.match(workspace, /FacelessReels/);
  assert.match(workspace, /does not pretend that background work has started/);
  assert.doesNotMatch(workspace, /Connection pending/);
  assert.match(workspace, /\/dashboard\/operations\/production\/code-audit/);
  assert.match(workspace, /\/dashboard\/operations\/production\/client-package/);
  assert.match(workspace, /without using AI credits/);
  assert.match(workspace, /Code Risk Scan", state: "\$99 flat"/);
  assert.match(workspace, /Package Other Client Work/);
  assert.match(workspace, /ClientWorkHistory/);
  assert.doesNotMatch(workspace, /Revision 7/);
});
