import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  auditBeastDesignSystem,
  beastComponentFamilies,
  beastDesignTokenGroups,
  beastModuleAccentContract,
  beastPlainLanguageQuestions,
} from "../src/lib/platform/designSystem";

test("BO-504 defines the complete BeastOS visual contract", () => {
  assert.deepEqual(beastDesignTokenGroups, [
    "color",
    "typography",
    "spacing",
    "radius",
    "shadow",
    "motion",
  ]);
  assert.ok(beastComponentFamilies.includes("professional-conversation"));
  assert.equal(beastModuleAccentContract.money, "green");
  assert.equal(beastModuleAccentContract.health, "red");
  assert.equal(beastPlainLanguageQuestions.length, 4);
});

test("the dashboard shell supplies one module-aware design context", () => {
  const shell = readFileSync("src/app/dashboard/layout.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");

  assert.match(shell, /data-beast-design-system="beastos"/);
  assert.match(shell, /data-beast-module=\{workspaceModule\}/);
  assert.match(css, /--beast-background:/);
  assert.match(css, /--beast-surface:/);
  assert.match(css, /--beast-accent:/);
  assert.match(css, /\[data-beast-module="money"\]/);
  assert.match(css, /\[data-beast-module="health"\]/);
});

test("shared page and state primitives replace module-only presentation", () => {
  const primitives = readFileSync(
    "src/app/components/design/DashboardPrimitives.tsx",
    "utf8"
  );
  const agents = readFileSync(
    "src/app/components/agents/AgentExperience.tsx",
    "utf8"
  );

  assert.match(primitives, /function PlatformPageHeader/);
  assert.match(primitives, /data-beast-component="page-header"/);
  assert.match(primitives, /data-beast-component="dashboard-card"/);
  assert.match(agents, /beast-loading-state/);
  assert.match(agents, /beast-empty-state/);
  assert.match(agents, /beast-error-state/);
  assert.match(agents, /data-beast-component="professional-experience"/);
});

test("design-system audits report missing platform standards", () => {
  assert.deepEqual(
    auditBeastDesignSystem({
      usesSemanticTokens: true,
      usesSharedComponents: true,
      moduleAccentIsSubtle: true,
      responsive: true,
      accessible: false,
      plainLanguage: true,
    }),
    { compliant: false, failed: ["accessible"] }
  );
});
