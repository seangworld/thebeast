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
  const educationVersion = snapshot.currentVersions.find(
    (version) => version.product === "BeastEducation"
  );
  assert.ok(educationVersion);
  assert.match(educationVersion.buildId, /^beasteducation-/);
  assert.doesNotMatch(educationVersion.buildId, /beastlearning/);
});

test("BA-116 derives repository and milestone summaries only from verified evidence", () => {
  const snapshot = buildBeastAdminDevelopmentConsoleSnapshot({
    roadmapItems: [
      {
        ...roadmapItem(
          "education-current",
          "in_progress",
          "2026-07-26T14:00:00.000Z"
        ),
        productId: "education",
        title: "Generation 3 Guidance Counselor",
      },
      {
        ...roadmapItem(
          "education-next",
          "planned",
          "2026-07-26T13:00:00.000Z"
        ),
        productId: "education",
        title: "Education outcome reporting",
      },
    ],
    releases: [
      {
        ...release("fusion-release", "2026-07-25", "bf113abc"),
        product: "fusion",
      },
      {
        ...release("sw-release", "2026-07-24", "5ea9c11"),
        product: "seangworld",
      },
    ],
    roadmapAvailable: true,
    releasesAvailable: true,
    gitEvidence: {
      commitSha: "33c5ec3eb86d598eafac699294fb5fe15b3baad4",
      branch: "main",
      repository: "seangworld/thebeast",
      commitMessage: "BA-115 Polish CEO Mode operational clarity",
    },
    generatedAt: "2026-07-26T17:00:00.000Z",
  });

  assert.deepEqual(snapshot.milestone, {
    currentGeneration: "Generation 3",
    currentProduct: "Education",
    currentMilestone: "Generation 3 Guidance Counselor",
    nextPlannedMilestone: "Education outcome reporting",
  });
  assert.deepEqual(
    snapshot.repositories.map((repository) => ({
      repository: repository.repository,
      branch: repository.branch,
      worktree: repository.worktree,
      latestCommit: repository.latestCommit,
    })),
    [
      {
        repository: "Beast",
        branch: "main",
        worktree: "unavailable",
        latestCommit: "33c5ec3eb86d",
      },
      {
        repository: "SEANGWORLD",
        branch: null,
        worktree: "unavailable",
        latestCommit: "5ea9c11",
      },
      {
        repository: "BeastFusion",
        branch: null,
        worktree: "unavailable",
        latestCommit: "bf113abc",
      },
      {
        repository: "CW",
        branch: null,
        worktree: "unavailable",
        latestCommit: null,
      },
    ]
  );
  assert.equal(
    snapshot.repositories.some(
      (repository) =>
        ["clean", "dirty"].includes(repository.worktree) &&
        !repository.latestCommit
    ),
    false
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
  assert.match(
    snapshot.sourceGaps[0],
    /BA-RDM-101 using 20260726000000_add_beast_admin_product_roadmap\.sql/
  );
  assert.match(
    snapshot.sourceGaps[1],
    /BA-REL-101 using 20260726000600_add_beast_admin_release_center\.sql/
  );
  assert.match(snapshot.sourceGaps[2], /Git SHA or ref/);
  assert.deepEqual(snapshot.gitReferences, []);
  assert.equal(snapshot.currentVersions.length > 0, true);
  assert.deepEqual(snapshot.milestone, {
    currentGeneration: null,
    currentProduct: null,
    currentMilestone: null,
    nextPlannedMilestone: null,
  });
  assert.equal(snapshot.repositories[0].worktree, "unavailable");
  assert.equal(snapshot.repositories[3].worktree, "unavailable");
  assert.match(snapshot.repositories[3].detail, /v0\.6\.0 Production/);
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
  assert.equal(
    normalizeBeastAdminDevelopmentConsoleSnapshot({
      ...snapshot,
      repositories: [
        { ...snapshot.repositories[0], worktree: "invented" },
      ],
    }),
    null
  );
  assert.equal(
    normalizeBeastAdminDevelopmentConsoleSnapshot({
      ...snapshot,
      milestone: { ...snapshot.milestone, currentProduct: 12 },
    }),
    null
  );
});

test("BA-CMD-001E Development Console API is owner-authorized, canonical-only, and read-only", () => {
  const route = readFileSync(
    "src/app/api/admin/development-console/route.ts",
    "utf8"
  );

  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /\.from\("profiles"\)/);
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /loadBeastFusionCanonicalReadModel/);
  assert.match(route, /legacy roadmap and release records were not used as a fallback/);
  assert.match(route, /private, no-cache, no-store, must-revalidate/);
  assert.doesNotMatch(route, /beast_admin_roadmap_items/);
  assert.doesNotMatch(route, /get_beast_admin_release_records/);
  assert.doesNotMatch(route, /VERCEL_GIT_COMMIT_SHA/);
  assert.doesNotMatch(route, /\.insert\(|\.update\(|\.delete\(/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("BA-CMD-001E presents the canonical owner development command center", () => {
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
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  for (const label of [
    "Current governed development state",
    "Projection identity and freshness",
    "Package progress",
    "Blocked work",
    "Waiting work",
    "Canonical next five",
    "Package and roadmap dependency view",
    "Development History",
    "Registry, BeastShield, and agent policy",
    "Validation health",
    "Canonical record drill-down",
  ]) {
    assert.match(workspace, new RegExp(label, "i"));
  }

  assert.match(page, /Development Console/);
  assert.match(page, /BeastAdminDevelopmentConsoleWorkspace/);
  assert.match(workspace, /useBeastAdminCommandCenter/);
  assert.match(workspace, /\/dashboard\/admin\/roadmap/);
  assert.match(workspace, /does not execute Git/);
  assert.match(workspace, /Legacy roadmap rows and operational/);
  assert.match(workspace, /Digital Professional Execution History remains a separate/);
  assert.match(workspace, /Arbitrary repository paths are not accepted/);
  assert.match(workspace, /sm:grid-cols-2 xl:grid-cols-4/);
  assert.match(workspace, /min-w-0/);
  assert.match(workspace, /overflow-x-auto/);
  assert.match(workspace, /tabIndex=\{0\}/);
  assert.doesNotMatch(workspace, /overflow-x-hidden|w-screen/);
  assert.doesNotMatch(workspace, /localStorage/);
  assert.doesNotMatch(workspace, /git push|git commit|child_process/);
  assert.match(dashboard, /\/dashboard\/admin\/development/);
  assert.match(navigation, /Development Console/);
});
