import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBeastAdminCEOModeSnapshot,
  normalizeBeastAdminCEOSourceSnapshot,
  type BeastAdminCEOSourceSnapshot,
} from "../src/lib/beastAdminCEOMode";
import { buildBeastAdminDevelopmentConsoleSnapshot } from "../src/lib/beastAdminDevelopmentConsole";
import type { BeastAdminPlatformHealthSnapshot } from "../src/lib/beastAdminPlatformHealth";

const generatedAt = "2026-07-26T11:00:00.000Z";

function sourceFixture(): BeastAdminCEOSourceSnapshot {
  return {
    generatedAt,
    development: buildBeastAdminDevelopmentConsoleSnapshot({
      roadmapItems: [
        {
          id: "roadmap-testing",
          userId: "owner",
          productId: "beastos",
          title: "Verify CEO Mode",
          summary: "Finish the owner daily operating console.",
          status: "testing",
          ownerNotes: "",
          createdAt: "2026-07-24T14:00:00.000Z",
          updatedAt: "2026-07-25T23:00:00.000Z",
        },
      ],
      releases: [],
      roadmapAvailable: true,
      releasesAvailable: true,
      generatedAt,
    }),
    feedback: [
      {
        id: "feedback-one",
        userId: "member-one",
        memberName: "Beta Member",
        memberEmail: null,
        category: "General",
        message: "The owner view should make the next step clearer.",
        context: "",
        status: "New",
        roadmapItem: null,
        ownerResponse: "",
        submittedAt: "2026-07-25T15:00:00.000Z",
        updatedAt: "2026-07-25T15:00:00.000Z",
        releasedAt: null,
        memberNotifiedAt: null,
      },
    ],
    members: [
      {
        id: "member-one",
        displayName: "Beta Member",
        email: null,
        emailVerificationStatus: "not_provided",
        accountStatus: "active",
        accountKind: "member",
        role: "beta",
        householdRole: null,
        enabledModules: [
          { id: "beastos", label: "BeastOS" },
          { id: "money", label: "BeastMoney" },
          { id: "learning", label: "BeastEducation" },
        ],
        moduleAccessOverrides: [],
        betaAssignments: [],
        createdAt: "2026-07-25T14:00:00.000Z",
        profileCreatedAt: "2026-07-25T14:00:00.000Z",
        lastSignInAt: "2026-07-26T09:30:00.000Z",
        registeredAt: "2026-07-25T14:00:00.000Z",
        lastActivityAt: "2026-07-26T10:30:00.000Z",
        eventCount: 4,
      },
    ],
    aiAnalytics: {
      windowDays: 7,
      generatedAt,
      conversationCount: 8,
      engagedMemberCount: 1,
      messageCount: 24,
      archivedCount: 0,
      abandonedCount: 1,
      averageSessionSeconds: 300,
      completionRate: 0.875,
      helpfulResponseRate: null,
      professionalUsage: [],
      commonTopics: [],
      dailyActivity: [{ date: "2026-07-25", conversationCount: 3 }],
    },
    featureFlags: [
      {
        id: "flag-one",
        key: "ceo_mode",
        name: "CEO Mode",
        description: "Owner operating console",
        createdAt: "2026-07-24T12:00:00.000Z",
        updatedAt: "2026-07-26T09:30:00.000Z",
        assignments: [
          {
            id: "assignment-one",
            scopeType: "role",
            stage: "internal_testing",
            moduleId: null,
            roleName: "admin",
            memberId: null,
            memberName: null,
            memberEmail: null,
            createdAt: "2026-07-24T12:00:00.000Z",
            updatedAt: "2026-07-26T09:30:00.000Z",
          },
        ],
      },
    ],
    aiRecommendations: {
      state: "unavailable",
      detail:
        "No persisted, owner-reviewed cross-platform AI recommendation feed is connected.",
      items: [],
    },
    sources: {
      roadmap: "available",
      releases: "available",
      feedback: "available",
      members: "available",
      betaTesting: "available",
      aiActivity: "available",
      aiRecommendations: "unavailable",
    },
  };
}

const platformHealth: BeastAdminPlatformHealthSnapshot = {
  overallStatus: "warning",
  generatedAt,
  services: [
    {
      id: "email",
      status: "unknown",
      summary: "Email delivery monitoring is not connected.",
      evidence:
        "No read-only delivery or bounce feed is available to this health check.",
      source: "not_connected",
      checkedAt: generatedAt,
      latencyMs: null,
    },
  ],
  errors: [],
  warnings: [
    {
      serviceId: "email",
      serviceLabel: "Email",
      severity: "warning",
      message: "Email delivery monitoring is not connected.",
    },
  ],
};

test("BA-114 separates yesterday from the overnight operating window", () => {
  const snapshot = buildBeastAdminCEOModeSnapshot({
    source: sourceFixture(),
    platformHealth,
    platformHealthAvailable: true,
    now: new Date(generatedAt),
  });

  assert.equal(snapshot.greeting, "Good morning");
  assert.match(snapshot.dateLabel, /Sunday, July 26, 2026/);
  assert.deepEqual(
    snapshot.happenedYesterday.map((item) => item.id),
    [
      "roadmap-roadmap-testing",
      "feedback-feedback-one",
      "member-registered-member-one",
      "ai-activity-2026-07-25",
    ]
  );
  assert.deepEqual(
    snapshot.changedOvernight.map((item) => item.id),
    [
      "member-activity-member-one",
      "beta-assignment-one",
      "roadmap-roadmap-testing",
    ]
  );
});

test("BA-114 prioritizes attention and next work from verified evidence", () => {
  const snapshot = buildBeastAdminCEOModeSnapshot({
    source: sourceFixture(),
    platformHealth,
    platformHealthAvailable: true,
    now: new Date(generatedAt),
  });

  assert.deepEqual(
    snapshot.needsAttention.map((item) => item.id),
    ["new-feedback", "abandoned-conversations"]
  );
  assert.deepEqual(
    snapshot.configurationItems.map((item) => item.id),
    ["source-aiRecommendations", "health-configuration-email"]
  );
  assert.deepEqual(snapshot.operationalErrors, []);
  assert.deepEqual(
    snapshot.workNext.map((item) => item.id),
    ["next-feedback", "next-testing-roadmap-testing"]
  );
  assert.match(snapshot.workNext[0].why, /feedback loop/);
});

test("BA-115 separates missing configuration from verified operational errors", () => {
  const source = sourceFixture();
  const operationalHealth: BeastAdminPlatformHealthSnapshot = {
    overallStatus: "warning",
    generatedAt,
    services: [
      {
        id: "api",
        status: "warning",
        summary: "The API request sample is degraded.",
        evidence: "A live request exceeded the warning threshold.",
        source: "request_sample",
        checkedAt: generatedAt,
        latencyMs: 1800,
      },
      ...platformHealth.services,
    ],
    errors: [],
    warnings: [
      {
        serviceId: "api",
        serviceLabel: "API",
        severity: "warning",
        message: "The API request sample is degraded.",
      },
      ...platformHealth.warnings,
    ],
  };

  const snapshot = buildBeastAdminCEOModeSnapshot({
    source,
    platformHealth: operationalHealth,
    platformHealthAvailable: true,
    now: new Date(generatedAt),
  });

  assert.deepEqual(
    snapshot.operationalErrors.map((item) => item.id),
    ["health-warning-api"]
  );
  assert.deepEqual(
    snapshot.configurationItems.map((item) => item.id),
    ["source-aiRecommendations", "health-configuration-email"]
  );
  assert.equal(snapshot.summaries.errors.status, "warning");
  assert.equal(snapshot.summaries.errors.errors, 0);
  assert.equal(snapshot.summaries.errors.warnings, 1);
  assert.equal(snapshot.summaries.errors.configurationItems, 2);
});

test("BA-114 preserves unavailable sources instead of reporting false zeroes", () => {
  const source = sourceFixture();
  source.development = buildBeastAdminDevelopmentConsoleSnapshot({
    roadmapItems: [],
    releases: [],
    roadmapAvailable: false,
    releasesAvailable: false,
    generatedAt,
  });
  source.feedback = [];
  source.members = [];
  source.aiAnalytics = null;
  source.featureFlags = [];
  source.sources = {
    roadmap: "unavailable",
    releases: "unavailable",
    feedback: "unavailable",
    members: "unavailable",
    betaTesting: "unavailable",
    aiActivity: "unavailable",
    aiRecommendations: "unavailable",
  };

  const snapshot = buildBeastAdminCEOModeSnapshot({
    source,
    platformHealth: null,
    platformHealthAvailable: false,
    now: new Date(generatedAt),
  });

  assert.equal(snapshot.summaries.development.openPrompts, null);
  assert.equal(snapshot.summaries.feedback.total, null);
  assert.equal(snapshot.summaries.members.total, null);
  assert.equal(snapshot.summaries.releases.total, null);
  assert.equal(snapshot.summaries.roadmap.planned, null);
  assert.equal(snapshot.summaries.aiActivity.conversations, null);
  assert.equal(snapshot.summaries.errors.errors, null);
  assert.ok(snapshot.configurationItems.length > 0);
  assert.equal(snapshot.summaries.aiRecommendations.state, "unavailable");
  assert.deepEqual(snapshot.summaries.aiRecommendations.items, []);
});

test("BA-115 reports only repository evidence available to the hosted runtime", () => {
  const source = sourceFixture();
  source.development = buildBeastAdminDevelopmentConsoleSnapshot({
    roadmapItems: [],
    releases: [],
    roadmapAvailable: true,
    releasesAvailable: true,
    gitEvidence: {
      commitSha: "abcdef1234567890",
      branch: "main",
      repository: "seangworld/thebeast",
      commitMessage: "BA-115 CEO Mode polish",
    },
    generatedAt,
  });

  const snapshot = buildBeastAdminCEOModeSnapshot({
    source,
    platformHealth,
    platformHealthAvailable: true,
    now: new Date(generatedAt),
  });

  assert.deepEqual(snapshot.repositories[0], {
    repository: "Beast",
    branch: "main",
    worktree: "unavailable",
    ahead: null,
    behind: null,
    latestCommit: "abcdef123456",
    detail:
      "The hosted deployment reports its branch and commit. Working-tree and remote-divergence state are not exposed by this runtime.",
  });
  assert.equal(snapshot.repositories[1].repository, "BeastFusion");
  assert.equal(snapshot.repositories[1].worktree, "unavailable");
  assert.equal(snapshot.repositories[2].repository, "SEANGWORLD");
  assert.equal(snapshot.repositories[3].worktree, "planning");
  assert.match(snapshot.repositories[3].detail, /no product repository/i);
});

test("BA-114 validates the owner briefing contract before rendering it", () => {
  const source = sourceFixture();

  assert.deepEqual(normalizeBeastAdminCEOSourceSnapshot(source), source);
  assert.equal(
    normalizeBeastAdminCEOSourceSnapshot({
      ...source,
      aiRecommendations: {
        state: "unavailable",
        detail: "No source.",
        items: [
          {
            id: "invented",
            professionalName: "Money Coach",
            recommendation: "Invented recommendation",
            whySurfaced: "Invented reason",
            createdAt: generatedAt,
          },
        ],
      },
    }),
    null
  );
});

test("BA-114 exposes an owner-only read-only aggregation route", () => {
  const route = readFileSync("src/app/api/admin/ceo-mode/route.ts", "utf8");

  assert.match(route, /supabase\.auth\.getUser/);
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /Promise\.all/);
  assert.match(route, /get_beast_admin_beta_feedback/);
  assert.match(route, /get_beast_admin_member_directory/);
  assert.match(route, /get_beast_admin_ai_analytics/);
  assert.match(route, /get_beast_admin_feature_flags/);
  assert.match(route, /get_beast_admin_release_records/);
  assert.match(
    route,
    /This area will surface owner-reviewed recommendations from Beast professionals after connected sources become available/
  );
  assert.match(route, /Cache-Control": "no-store"/);
  assert.doesNotMatch(route, /\.(insert|update|upsert|delete)\(/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("BA-115 presents an executive snapshot with explained empty states", () => {
  const page = readFileSync("src/app/dashboard/admin/page.tsx", "utf8");
  const workspace = readFileSync(
    "src/app/dashboard/admin/BeastAdminCEOModeWorkspace.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  assert.match(page, /title="CEO Mode"/);
  assert.match(page, /owner-only daily operating headquarters/);
  for (const question of [
    "What happened yesterday?",
    "What changed overnight?",
    "What needs attention?",
    "What should I work on next?",
  ]) {
    assert.match(workspace, new RegExp(question.replace("?", "\\?")));
  }
  for (const summary of [
    "Development",
    "Feedback",
    "Operational errors",
    "Members",
    "Beta testing",
    "Releases",
    "Roadmap progress",
    "AI recommendations",
  ]) {
    assert.match(workspace, new RegExp(summary));
  }
  assert.match(workspace, /aria-busy="true"/);
  assert.match(workspace, /Refresh briefing/);
  assert.match(workspace, /Sprint snapshot/);
  assert.match(workspace, /Repository Status/);
  assert.match(workspace, /Current branch/);
  assert.match(workspace, /Ahead \/ Behind/);
  assert.match(workspace, /Latest commit/);
  assert.match(workspace, /No roadmap has been connected yet/);
  assert.match(workspace, /No release history has been synchronized/);
  assert.match(
    workspace,
    /This area will surface owner-reviewed recommendations from\s+Beast professionals after connected sources become available/
  );
  for (const professional of [
    "Money Coach",
    "Guidance Counselor",
    "Health Advisor",
    "Goals Coach",
    "Future professionals",
  ]) {
    assert.match(workspace, new RegExp(professional));
  }
  assert.match(workspace, /value === 0 \? "None"/);
  assert.match(workspace, /No connected source recorded/);
  assert.match(workspace, /absence is never reported as zero/);
  assert.match(
    navigation,
    /label:\s*"CEO Mode"[\s\S]*?href:\s*"\/dashboard\/admin"/
  );
});
