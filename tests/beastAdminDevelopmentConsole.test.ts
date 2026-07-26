import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBeastAdminDevelopmentConsoleSnapshot,
  normalizeBeastAdminDevelopmentConsoleSnapshot,
} from "../src/lib/beastAdminDevelopmentConsole";
import type { BeastAdminRoadmapItem } from "../src/lib/beastAdminRoadmap";
import type { BeastAdminReleaseRecord } from "../src/lib/beastAdminReleaseCenter";

function roadmapItem(
  id: string,
  status: BeastAdminRoadmapItem["status"],
  updatedAt: string
): BeastAdminRoadmapItem {
  return {
    id,
    userId: "owner-1",
    productId: "beastos",
    title: `${id} title`,
    summary: `${id} summary`,
    status,
    ownerNotes: "Private implementation notes.",
    createdAt: "2026-07-20T12:00:00.000Z",
    updatedAt,
  };
}

function release(
  id: string,
  releaseDate: string,
  deploymentReference = ""
): BeastAdminReleaseRecord {
  return {
    id,
    product: "admin",
    version: id === "release-2" ? "2.0.0" : "1.0.0",
    releaseDate,
    title: `${id} title`,
    summary: `${id} summary`,
    modulesIncluded: ["admin"],
    bugFixes: [],
    features: ["Development visibility"],
    databaseMigrations: [],
    validationStatus: "passed",
    validationChecks: ["TypeScript", "Full suite"],
    validationNotes: "Validated locally.",
    validatedAt: `${releaseDate}T15:00:00.000Z`,
    deploymentStatus: "deployed",
    deploymentReference,
    deploymentNotes: "Released to production.",
    deployedAt: `${releaseDate}T16:00:00.000Z`,
    createdAt: `${releaseDate}T12:00:00.000Z`,
    updatedAt: `${releaseDate}T16:00:00.000Z`,
  };
}

const roadmapItems = [
  roadmapItem("planned", "planned", "2026-07-26T10:00:00.000Z"),
  roadmapItem("active", "in_progress", "2026-07-26T12:00:00.000Z"),
  roadmapItem("testing", "testing", "2026-07-26T13:00:00.000Z"),
  roadmapItem("done", "released", "2026-07-25T12:00:00.000Z"),
  roadmapItem("archived", "archived", "2026-07-24T12:00:00.000Z"),
];

test("BA-111 derives sprint and prompt state from the canonical roadmap", () => {
  const snapshot = buildBeastAdminDevelopmentConsoleSnapshot({
    roadmapItems,
    releases: [],
    roadmapAvailable: true,
    releasesAvailable: true,
    generatedAt: "2026-07-26T15:00:00.000Z",
  });

  assert.deepEqual(
    snapshot.currentSprint.map((item) => item.id),
    ["testing", "active"]
  );
  assert.deepEqual(
    snapshot.openPrompts.map((item) => item.id),
    ["testing", "active", "planned"]
  );
  assert.deepEqual(
    snapshot.completedPrompts.map((item) => item.id),
    ["done"]
  );
  assert.deepEqual(
    snapshot.upcomingWork.map((item) => item.id),
    ["planned"]
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(snapshot.openPrompts[0], "ownerNotes"),
    false
  );
});

test("BA-111 derives releases, Git references, and versions from evidence", () => {
  const snapshot = buildBeastAdminDevelopmentConsoleSnapshot({
    roadmapItems: [],
    releases: [
      release("release-1", "2026-07-25", "94ba0ad"),
      release("release-2", "2026-07-26", "not-a-git-reference"),
    ],
    roadmapAvailable: true,
    releasesAvailable: true,
    gitEvidence: {
      commitSha: "d3c8debd2521bcd1032e660a93fe0155591023ab",
      branch: "main",
      repository: "seangworld/thebeast",
      commitMessage: "BA-108-110 BeastAdmin operations and metrics",
    },
    generatedAt: "2026-07-26T17:00:00.000Z",
  });

  assert.deepEqual(
    snapshot.recentlyReleased.map((item) => item.id),
    ["release-2", "release-1"]
  );
  assert.deepEqual(
    snapshot.versionHistory.map((item) => item.version),
    ["2.0.0", "1.0.0"]
  );
  assert.deepEqual(
    snapshot.gitReferences.map((item) => item.reference),
    ["d3c8debd2521bcd1032e660a93fe0155591023ab", "94ba0ad"]
  );
  assert.equal(snapshot.gitReferences[0].branch, "main");
  assert.equal(snapshot.currentVersions.length > 0, true);
  assert.equal(
    snapshot.currentVersions.every(
      (version) => version.source === "version_manifest"
    ),
    true
  );
});

test("BA-111 reports unavailable sources instead of empty development claims", () => {
  const snapshot = buildBeastAdminDevelopmentConsoleSnapshot({
    roadmapItems: [],
    releases: [],
    roadmapAvailable: false,
    releasesAvailable: false,
    generatedAt: "2026-07-26T15:00:00.000Z",
  });

  assert.deepEqual(snapshot.sources, {
    roadmap: "unavailable",
    releases: "unavailable",
    git: "unavailable",
  });
  assert.equal(snapshot.sourceGaps.length, 3);
  assert.match(snapshot.sourceGaps[0], /BA-102/);
  assert.match(snapshot.sourceGaps[1], /BA-108/);
  assert.match(snapshot.sourceGaps[2], /Git SHA or ref/);
  assert.deepEqual(snapshot.gitReferences, []);
  assert.equal(snapshot.currentVersions.length > 0, true);
});

test("BA-111 validates the complete development console response", () => {
  const snapshot = buildBeastAdminDevelopmentConsoleSnapshot({
    roadmapItems,
    releases: [release("release-1", "2026-07-25", "94ba0ad")],
    roadmapAvailable: true,
    releasesAvailable: true,
    generatedAt: "2026-07-26T15:00:00.000Z",
  });

  assert.deepEqual(
    normalizeBeastAdminDevelopmentConsoleSnapshot(snapshot),
    snapshot
  );
  assert.equal(
    normalizeBeastAdminDevelopmentConsoleSnapshot({
      ...snapshot,
      currentSprint: [{ ...snapshot.currentSprint[0], status: "invented" }],
    }),
    null
  );
  assert.equal(
    normalizeBeastAdminDevelopmentConsoleSnapshot({
      ...snapshot,
      gitReferences: [
        {
          reference: "not-git",
          shortReference: "not-git",
          branch: "",
          repository: "",
          source: "release_center",
          title: "Invented reference",
          recordedAt: null,
        },
      ],
    }),
    null
  );
});

test("BA-111 API is owner-authorized, partial-source safe, and read-only", () => {
  const route = readFileSync(
    "src/app/api/admin/development-console/route.ts",
    "utf8"
  );

  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /\.from\("profiles"\)/);
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /\.from\("beast_admin_roadmap_items"\)/);
  assert.match(route, /\.eq\("user_id", user\.id\)/);
  assert.match(route, /\.rpc\(\s*"get_beast_admin_release_records"/);
  assert.match(route, /roadmapAvailable = false/);
  assert.match(route, /releasesAvailable = false/);
  assert.match(route, /VERCEL_GIT_COMMIT_SHA/);
  assert.match(route, /VERCEL_GIT_COMMIT_REF/);
  assert.match(route, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(route, /\.insert\(|\.update\(|\.delete\(/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("BA-111 presents the complete owner development workflow", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/development/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/development/BeastAdminDevelopmentConsoleWorkspace.tsx",
    "utf8"
  );
  const dashboard = readFileSync(
    "src/app/dashboard/admin/BeastAdminCEOModeWorkspace.tsx",
    "utf8"
  );
  const shell = readFileSync(
    "src/app/dashboard/admin/BeastAdminShell.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  for (const label of [
    "Current sprint",
    "Open prompts",
    "Completed prompts",
    "Upcoming work",
    "Recently released",
    "Git references",
    "Version history",
  ]) {
    assert.match(workspace, new RegExp(label, "i"));
  }

  assert.match(page, /Development Console/);
  assert.match(page, /BeastAdminDevelopmentConsoleWorkspace/);
  assert.match(workspace, /\/api\/admin\/development-console/);
  assert.match(workspace, /\/dashboard\/admin\/roadmap/);
  assert.match(workspace, /\/dashboard\/admin\/releases/);
  assert.match(workspace, /\/dashboard\/admin\/prompts/);
  assert.match(workspace, /does not execute Git/);
  assert.match(workspace, /roadmap work items/);
  assert.doesNotMatch(workspace, /localStorage/);
  assert.doesNotMatch(workspace, /git push|git commit|child_process/);
  assert.match(dashboard, /\/dashboard\/admin\/development/);
  assert.match(shell, /Development Console/);
  assert.match(navigation, /Development Console/);
});
