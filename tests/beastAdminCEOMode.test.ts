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
        role: "beta",
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
  services: [],
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
    [
      "new-feedback",
      "health-warning-email",
      "abandoned-conversations",
      "source-aiRecommendations",
    ]
  );
  assert.deepEqual(
    snapshot.workNext.map((item) => item.id),
    ["next-feedback", "next-testing-roadmap-testing"]
  );
  assert.match(snapshot.workNext[0].why, /feedback loop/);
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
  assert.equal(snapshot.summaries.aiRecommendations.state, "unavailable");
  assert.deepEqual(snapshot.summaries.aiRecommendations.items, []);
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
  assert.match(route, /Cache-Control": "no-store"/);
  assert.doesNotMatch(route, /\.(insert|update|upsert|delete)\(/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("BA-114 presents all four morning questions and eight operating summaries", () => {
  const page = readFileSync("src/app/dashboard/admin/page.tsx", "utf8");
  const workspace = readFileSync(
    "src/app/dashboard/admin/BeastAdminCEOModeWorkspace.tsx",
    "utf8"
  );
  const shell = readFileSync(
    "src/app/dashboard/admin/BeastAdminShell.tsx",
    "utf8"
  );

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
    "Errors",
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
  assert.match(workspace, /No connected source recorded/);
  assert.match(workspace, /absence is never reported as zero/);
  assert.match(shell, /\{ label: "CEO Mode", href: "\/dashboard\/admin" \}/);
});
