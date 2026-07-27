import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import { beastAdminNavigation } from "../src/lib/moduleNavigation";
import {
  auditBeastRoadmapIdentities,
  validateFutureRoadmapIdentifier,
} from "../src/lib/beastRoadmapIdentity";

const expectedAdminDestinations = [
  ["CEO Mode", "/dashboard/admin"],
  ["Development Console", "/dashboard/admin/development"],
  ["Platform Health", "/dashboard/admin/health"],
  ["Migration Status", "/dashboard/admin/migrations"],
  ["SQL Explorer", "/dashboard/admin/migrations/explorer"],
  ["Release Center", "/dashboard/admin/releases"],
  ["Roadmap", "/dashboard/admin/roadmap"],
  ["Executive Metrics", "/dashboard/admin/metrics"],
  ["AI Analytics", "/dashboard/admin/analytics"],
  ["Knowledge Inspector", "/dashboard/admin/knowledge"],
  ["Ecosystem Map", "/dashboard/admin/ecosystem"],
  ["Members", "/dashboard/admin/members"],
  ["Member Messages", "/dashboard/admin/messages"],
  ["Beta Feedback", "/dashboard/admin/feedback"],
  ["Modules", "/dashboard/admin/modules"],
  ["Feature Flags", "/dashboard/admin/flags"],
  ["Prompt Library", "/dashboard/admin/prompts"],
  ["Planned Workspaces", "/dashboard/admin/ads"],
  ["Settings", "/dashboard/admin/settings"],
] as const;

test("BA-NAV-101 makes the left rail the single BeastAdmin page navigation", () => {
  const shell = readFileSync(
    "src/app/dashboard/admin/BeastAdminShell.tsx",
    "utf8"
  );

  assert.doesNotMatch(shell, /adminNavItems/);
  assert.doesNotMatch(shell, /aria-label="BeastAdmin sections"/);
  assert.doesNotMatch(shell, /import Link from "next\/link"/);
  assert.doesNotMatch(shell, /href="\/dashboard\/admin/);
  assert.match(shell, /<ModuleBadge module="admin" label="Owner Only"/);
  assert.match(shell, /<h1 className="beast-title">\{title\}<\/h1>/);
  assert.match(shell, /\{children\}/);
  assert.match(shell, /canAccessBeastAdmin/);
});

test("BA-NAV-101 preserves every BeastAdmin destination in the left rail", () => {
  assert.deepEqual(
    beastAdminNavigation.children?.map((item) => [item.label, item.href]),
    expectedAdminDestinations
  );

  for (const [, href] of expectedAdminDestinations) {
    const relativeRoute = href.replace("/dashboard/admin", "");
    const pagePath = relativeRoute
      ? `src/app/dashboard/admin${relativeRoute}/page.tsx`
      : "src/app/dashboard/admin/page.tsx";
    assert.equal(existsSync(pagePath), true, pagePath);
  }
});

test("BA-NAV-101 preserves the supplied BA-131 label only as collision provenance", () => {
  const audit = auditBeastRoadmapIdentities();
  const collision = audit.historicalCollisions.find(
    (entry) => entry.identifier === "BA-131"
  );

  assert.ok(collision);
  assert.deepEqual(collision.roadmapIds, ["BA-ID-101", "BA-NAV-101"]);
  assert.equal(validateFutureRoadmapIdentifier("BA-131").available, false);
  assert.equal(validateFutureRoadmapIdentifier("BA-NAV-101").available, false);
});
