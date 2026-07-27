import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminPlannedWorkspaces,
  beastAdminPlannedWorkspaceStatuses,
  getBeastAdminPlannedWorkspace,
} from "../src/lib/beastAdminPlannedWorkspaces";

test("BA-126 registers every intentionally deferred workspace and status", () => {
  assert.deepEqual(beastAdminPlannedWorkspaceStatuses, [
    "deferred",
    "planning",
    "research",
    "future",
  ]);
  assert.deepEqual(
    beastAdminPlannedWorkspaces.map(({ id, status }) => ({ id, status })),
    [
      { id: "ads", status: "deferred" },
      { id: "crm", status: "research" },
      { id: "billing", status: "planning" },
      { id: "marketplace", status: "future" },
    ]
  );
});

test("BA-126 registry documents purpose boundaries without inventing milestones", () => {
  for (const workspace of beastAdminPlannedWorkspaces) {
    assert.ok(workspace.purpose.length > 0, workspace.id);
    assert.ok(workspace.reason.length > 0, workspace.id);
    assert.ok(workspace.dependencies.length > 0, workspace.id);
    assert.match(workspace.targetMilestone, /Not scheduled/);
    assert.match(workspace.targetMilestone, /owner-approved roadmap item/);
  }

  assert.match(
    getBeastAdminPlannedWorkspace("crm")?.reason || "",
    /member identity records must not be repurposed/
  );
});

test("BA-126 replaces the Ads placeholder with a read-only roadmap registry", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/ads/page.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  [
    "Planned Workspaces",
    "Planned workspace registry",
    "Current status",
    "Purpose",
    "Reason",
    "Dependencies",
    "Target milestone",
  ].forEach((copy) => assert.match(page, new RegExp(copy)));

  assert.doesNotMatch(page, /placeholder/i);
  assert.doesNotMatch(page, /createClient|fetch\(|\.rpc\(|<form|<button/);
  assert.match(navigation, /Planned Workspaces.*\/dashboard\/admin\/ads/);
});
