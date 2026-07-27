import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  auditBeastRoadmapIdentities,
  validateFutureRoadmapIdentifier,
} from "../src/lib/beastRoadmapIdentity";

const beastAdminPages = [
  "src/app/dashboard/admin/page.tsx",
  "src/app/dashboard/admin/ads/page.tsx",
  "src/app/dashboard/admin/analytics/page.tsx",
  "src/app/dashboard/admin/development/page.tsx",
  "src/app/dashboard/admin/ecosystem/page.tsx",
  "src/app/dashboard/admin/feedback/page.tsx",
  "src/app/dashboard/admin/flags/page.tsx",
  "src/app/dashboard/admin/health/page.tsx",
  "src/app/dashboard/admin/knowledge/page.tsx",
  "src/app/dashboard/admin/members/page.tsx",
  "src/app/dashboard/admin/messages/page.tsx",
  "src/app/dashboard/admin/metrics/page.tsx",
  "src/app/dashboard/admin/migrations/page.tsx",
  "src/app/dashboard/admin/migrations/explorer/page.tsx",
  "src/app/dashboard/admin/modules/page.tsx",
  "src/app/dashboard/admin/prompts/page.tsx",
  "src/app/dashboard/admin/releases/page.tsx",
  "src/app/dashboard/admin/roadmap/page.tsx",
  "src/app/dashboard/admin/settings/page.tsx",
] as const;

test("BA-HDR-101 gives every BeastAdmin workspace a title and purpose", () => {
  for (const pagePath of beastAdminPages) {
    const page = readFileSync(pagePath, "utf8");
    const openingTag = page.match(/<BeastAdminShell[\s\S]*?>/)?.[0] || "";
    const title = openingTag.match(/title="([^"]+)"/)?.[1];
    const purpose = openingTag.match(/purpose="([^"]+)"/)?.[1];

    assert.ok(title, `${pagePath} must provide a workspace title`);
    assert.ok(purpose, `${pagePath} must provide a workspace purpose`);
    assert.match(purpose, /[.!?]$/, `${pagePath} purpose must be a sentence`);
    assert.doesNotMatch(
      openingTag,
      /description=/,
      `${pagePath} must use the contextual purpose contract`
    );
  }
});

test("BA-HDR-101 renders one consistent contextual header with optional actions", () => {
  const shell = readFileSync(
    "src/app/dashboard/admin/BeastAdminShell.tsx",
    "utf8"
  );
  const header = shell.slice(
    shell.indexOf("export function BeastAdminWorkspaceHeader"),
    shell.indexOf("export function AdminMetricGrid")
  );

  assert.match(shell, /<BeastAdminWorkspaceHeader/);
  assert.match(shell, /title=\{title\}/);
  assert.match(shell, /purpose=\{purpose\}/);
  assert.match(shell, /actions=\{actions\}/);
  assert.match(header, /<header className="beast-page-header"/);
  assert.match(header, /<ModuleBadge module="admin" label="Owner Only"/);
  assert.match(header, /<h1 className="beast-title">\{title\}<\/h1>/);
  assert.match(header, /<p className="beast-subtitle">\{purpose\}<\/p>/);
  assert.match(header, /actions\?: React\.ReactNode/);
  assert.match(header, /\{actions \? \(/);
  assert.match(header, /aria-label=\{`\$\{title\} actions`\}/);
  assert.doesNotMatch(header, /<nav|<Link|href=|router\./);
});

test("BA-HDR-101 keeps page navigation out of every route header", () => {
  for (const pagePath of beastAdminPages) {
    const page = readFileSync(pagePath, "utf8");

    assert.doesNotMatch(page, /beast-page-header/);
    assert.doesNotMatch(page, /aria-label="BeastAdmin sections"/);
  }
});

test("BA-HDR-101 preserves the supplied BA-132 label as collision provenance", () => {
  const audit = auditBeastRoadmapIdentities();
  const collision = audit.historicalCollisions.find(
    (entry) => entry.identifier === "BA-132"
  );

  assert.ok(collision);
  assert.deepEqual(collision.roadmapIds, ["BA-HDR-101", "BA-MSQL-101"]);
  assert.equal(validateFutureRoadmapIdentifier("BA-132").available, false);
  assert.equal(validateFutureRoadmapIdentifier("BA-HDR-101").available, false);
});
