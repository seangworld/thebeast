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

test("BA-126 keeps deferred work separate from the operational Revenue Center", () => {
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");
  const page = readFileSync(
    "src/app/dashboard/admin/planned-workspaces/page.tsx",
    "utf8"
  );

  assert.equal(getBeastAdminPlannedWorkspace("crm")?.name, "Future CRM");
  assert.doesNotMatch(
    beastAdminPlannedWorkspaces.map((workspace) => workspace.name).join(" "),
    /\bAds\b/
  );
  assert.match(page, /Planned workspace registry/);
  assert.match(navigation, /Revenue[\s\S]*?\/dashboard\/admin\/ads/);
  assert.match(
    navigation,
    /Planned Workspaces[\s\S]*?\/dashboard\/admin\/planned-workspaces/
  );
});
