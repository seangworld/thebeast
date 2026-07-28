import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const shell = readFileSync(
  "src/app/dashboard/admin/BeastAdminShell.tsx",
  "utf8"
);
const loading = readFileSync(
  "src/app/dashboard/admin/loading.tsx",
  "utf8"
);
const errorBoundary = readFileSync(
  "src/app/dashboard/admin/error.tsx",
  "utf8"
);

test("every BeastAdmin workspace inherits owner guidance and explicit access states", () => {
  assert.match(shell, /Owner guidance/);
  assert.match(shell, /Owner access required/);
  assert.match(shell, /Owner access could not be verified/);
  assert.match(shell, /profileError/);
  assert.match(shell, /canAccessBeastAdmin/);
  assert.match(shell, /missing or stale source is not a confirmed zero/i);
  assert.match(shell, /title="Visible only after/);
});

test("BeastAdmin has accessible route loading and error recovery states", () => {
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /role="status"/);
  assert.match(errorBoundary, /This owner workspace could not be displayed/);
  assert.match(errorBoundary, /Try again/);
  assert.match(errorBoundary, /Return to CEO Mode/);
  assert.match(errorBoundary, /focus-visible:outline/);
});

test("freshness guidance distinguishes stale and unknown snapshots", () => {
  assert.match(shell, /BeastAdminDataFreshness/);
  assert.match(shell, /Data may be stale/);
  assert.match(shell, /Freshness unavailable/);
  assert.match(shell, /verify the source before acting/i);
});

test("wide BeastAdmin data regions are keyboard-focusable and labeled", () => {
  for (const path of [
    "src/app/dashboard/admin/development/BeastAdminDevelopmentConsoleWorkspace.tsx",
    "src/app/dashboard/admin/analytics/BeastAdminAIAnalyticsWorkspace.tsx",
    "src/app/dashboard/admin/metrics/BeastAdminExecutiveMetricsWorkspace.tsx",
    "src/app/dashboard/admin/members/BeastAdminMemberManagementTable.tsx",
    "src/app/dashboard/admin/migrations/BeastAdminMigrationStatusWorkspace.tsx",
    "src/app/dashboard/admin/intelligence/SeangworldIntelligenceWorkspace.tsx",
  ]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /overflow-x-auto/);
    assert.match(source, /tabIndex=\{0\}/);
    assert.match(source, /horizontally scrollable/);
  }
});

test("UX review preserves Architecture Explorer and introduces no favorites", () => {
  const explorer = readFileSync(
    "src/app/dashboard/admin/ecosystem/BeastAdminEcosystemVisualizationWorkspace.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");
  assert.match(explorer, /data-architecture-scroll-container/);
  assert.match(explorer, /Architecture Explorer map/);
  assert.doesNotMatch(`${shell}\n${navigation}`, /favorites?/i);
});
