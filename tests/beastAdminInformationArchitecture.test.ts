import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  auditBeastRoadmapIdentities,
  validateFutureRoadmapIdentifier,
} from "../src/lib/beastRoadmapIdentity";
import { beastAdminNavigation } from "../src/lib/moduleNavigation";

const expectedGroups = {
  Operations: ["CEO Mode", "Development Console", "Platform Health"],
  Delivery: ["Migration Status", "SQL Explorer", "Release Center", "Roadmap"],
  Insights: [
    "Executive Metrics",
    "AI Analytics",
    "Knowledge Inspector",
    "Ecosystem Map",
  ],
  Members: ["Members", "Member Messages", "Beta Feedback"],
  Governance: [
    "Modules",
    "Feature Flags",
    "Prompt Library",
    "Planned Workspaces",
    "Settings",
  ],
} as const;

test("BA-IA-101 defines one grouped persistent BeastAdmin workspace switcher", () => {
  const children = beastAdminNavigation.children || [];
  const groupedLabels = Object.fromEntries(
    Object.keys(expectedGroups).map((group) => [
      group,
      children.filter((child) => child.group === group).map((child) => child.label),
    ])
  );

  assert.equal(beastAdminNavigation.defaultExpanded, true);
  assert.deepEqual(groupedLabels, expectedGroups);
  assert.equal(children.length, 19);
  assert.equal(new Set(children.map((child) => child.href)).size, children.length);
  assert.equal(children.every((child) => Boolean(child.group)), true);
});

test("BA-IA-101 uses the same grouped registry in desktop and responsive navigation", () => {
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");

  assert.match(layout, /function ExpandableModuleNavItem/);
  assert.match(layout, /const groupedChildren/);
  assert.match(layout, /const childGroups/);
  assert.match(layout, /child\.group === group/);
  assert.match(layout, /<ChildLink/);
  assert.match(layout, /navigationOnly/);
  assert.match(layout, /overflow-y-auto/);
  assert.doesNotMatch(layout, /BeastAdminMobileNavigation|adminMobileNavigation/);
});

test("BA-IA-101 keeps headers contextual and workspace content task-oriented", () => {
  const shell = readFileSync(
    "src/app/dashboard/admin/BeastAdminShell.tsx",
    "utf8"
  );
  const header = shell.slice(
    shell.indexOf("export function BeastAdminWorkspaceHeader"),
    shell.indexOf("export function AdminMetricGrid")
  );
  const documentation = readFileSync(
    "docs/BA-133-BEASTADMIN-INFORMATION-ARCHITECTURE.md",
    "utf8"
  );

  assert.match(header, /title: string/);
  assert.match(header, /purpose: string/);
  assert.match(header, /actions\?: React\.ReactNode/);
  assert.doesNotMatch(header, /<nav|<Link|href=/);
  for (const contentType of [
    "cards",
    "tables",
    "dashboards",
    "reports",
    "management tools",
  ]) {
    assert.match(documentation, new RegExp(contentType, "i"));
  }
  assert.match(documentation, /advance the task in context/i);
  assert.match(documentation, /not a second navigation menu/i);
});

test("BA-IA-101 preserves the supplied BA-133 label as collision provenance", () => {
  const audit = auditBeastRoadmapIdentities();
  const collision = audit.historicalCollisions.find(
    (entry) => entry.identifier === "BA-133"
  );

  assert.ok(collision);
  assert.deepEqual(collision.roadmapIds, ["BA-IA-101", "BA-MIGAUD-101"]);
  assert.equal(validateFutureRoadmapIdentifier("BA-133").available, false);
  assert.equal(validateFutureRoadmapIdentifier("BA-IA-101").available, false);
});
