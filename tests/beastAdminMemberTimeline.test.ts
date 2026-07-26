import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminMemberTimelineCategories,
  buildBeastAdminMemberTimelineCounts,
  filterBeastAdminMemberTimelineEvents,
  normalizeBeastAdminMemberDirectory,
  normalizeBeastAdminMemberTimeline,
} from "../src/lib/beastAdminMemberTimeline";

const directory = [
  {
    id: "member-one",
    displayName: "Sean",
    email: "sean@example.com",
    role: "admin",
    registeredAt: "2026-07-01T12:00:00.000Z",
    lastActivityAt: "2026-07-26T12:00:00.000Z",
    eventCount: 8,
  },
  {
    id: "member-two",
    displayName: "Member",
    email: null,
    role: "user",
    registeredAt: "2026-07-10T12:00:00.000Z",
    lastActivityAt: "2026-07-10T12:00:00.000Z",
    eventCount: 1,
  },
];

const timeline = {
  member: {
    id: "member-one",
    displayName: "Sean",
    email: "sean@example.com",
    role: "admin",
    registeredAt: "2026-07-01T12:00:00.000Z",
  },
  eventCount: 4,
  hasMore: false,
  events: [
    {
      id: "conversation-1",
      occurredAt: "2026-07-26T12:00:00.000Z",
      category: "conversation",
      moduleId: "money",
      title: "Money Coach conversation started",
      detail: "4 persisted messages",
    },
    {
      id: "goal-1",
      occurredAt: "2026-07-25T12:00:00.000Z",
      category: "goals",
      moduleId: "goals",
      title: "Goal completed",
      detail: "Build a financial plan",
    },
    {
      id: "module-activation-money",
      occurredAt: "2026-07-20T12:00:00.000Z",
      category: "module",
      moduleId: "money",
      title: "Money activity began",
      detail: "First persisted activity in this Beast application.",
    },
    {
      id: "registration-member-one",
      occurredAt: "2026-07-01T12:00:00.000Z",
      category: "registration",
      moduleId: "beastos",
      title: "Member registered",
      detail: "Beast account and owner-scoped profile created.",
    },
  ],
  coverage: beastAdminMemberTimelineCategories.map((category) => ({
    category,
    state:
      category === "module"
        ? "derived"
        : category === "health" || category === "money"
          ? "partial"
          : "available",
    detail: `${category} source boundary`,
  })),
};

test("BA-104 normalizes the live owner member directory and preserves confirmed zeroes", () => {
  assert.deepEqual(normalizeBeastAdminMemberDirectory(directory), directory);
  assert.deepEqual(normalizeBeastAdminMemberDirectory([]), []);
  assert.equal(
    normalizeBeastAdminMemberDirectory([
      { ...directory[0], eventCount: -1 },
    ]),
    null
  );
  assert.equal(
    normalizeBeastAdminMemberDirectory([
      { ...directory[0], registeredAt: "not-a-date" },
    ]),
    null
  );
});

test("BA-104 normalizes, filters, and counts every requested journey category", () => {
  const snapshot = normalizeBeastAdminMemberTimeline(timeline);
  assert.ok(snapshot);
  assert.deepEqual(beastAdminMemberTimelineCategories, [
    "registration",
    "module",
    "conversation",
    "goals",
    "learning",
    "money",
    "health",
    "documents",
  ]);
  assert.deepEqual(
    filterBeastAdminMemberTimelineEvents(snapshot.events, "conversation").map(
      (event) => event.id
    ),
    ["conversation-1"]
  );
  assert.deepEqual(buildBeastAdminMemberTimelineCounts(snapshot.events), {
    registration: 1,
    module: 1,
    conversation: 1,
    goals: 1,
    learning: 0,
    money: 0,
    health: 0,
    documents: 0,
  });
});

test("BA-104 rejects unsupported event categories and incomplete coverage", () => {
  assert.equal(
    normalizeBeastAdminMemberTimeline({
      ...timeline,
      events: [
        {
          ...timeline.events[0],
          category: "invented",
        },
      ],
    }),
    null
  );
  assert.equal(
    normalizeBeastAdminMemberTimeline({
      ...timeline,
      coverage: [{ category: "health", state: "unknown", detail: "Unknown" }],
    }),
    null
  );
});

test("BA-104 aggregates every supported source behind an owner-only privacy boundary", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726000200_add_beast_admin_member_timeline.sql",
    "utf8"
  );

  assert.match(migration, /security definer/g);
  assert.match(migration, /public\.is_profile_admin\(\)/g);
  assert.match(migration, /errcode = '42501'/g);
  assert.match(migration, /auth\.users/);
  assert.match(migration, /agent_conversations/);
  assert.match(migration, /beast_goal_lifecycle_events/);
  assert.match(migration, /learning_sessions/);
  assert.match(migration, /learning_achievements/);
  assert.match(migration, /learning_certificates/);
  assert.match(migration, /debt_payments/);
  assert.match(migration, /bill_payments/);
  assert.match(migration, /retirement_timeline_runs/);
  assert.match(migration, /beast_documents/);
  assert.match(migration, /document\.category = 'Health'/);
  assert.match(migration, /module_activation_events/);
  assert.match(migration, /First persisted activity/);
  assert.match(migration, /no clinical activity source connected/i);
  assert.doesNotMatch(migration, /message\.content/);
  assert.doesNotMatch(migration, /payment\.amount/);
  assert.doesNotMatch(migration, /document\.storage_path/);
  assert.match(
    migration,
    /revoke all on function public\.get_beast_admin_member_directory/
  );
  assert.match(
    migration,
    /revoke all on function public\.get_beast_admin_member_timeline/
  );
});

test("BA-104 presents owner-only member selection, chronology, coverage, and empty states", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/members/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberTimelineWorkspace.tsx",
    "utf8"
  );
  const model = readFileSync(
    "src/lib/beastAdminMemberTimeline.ts",
    "utf8"
  );
  const shell = readFileSync(
    "src/app/dashboard/admin/BeastAdminShell.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  for (const label of [
    "Registration",
    "Module activations",
    "Conversations",
    "Goals",
    "Learning",
    "Money",
    "Health",
    "Documents",
  ]) {
    assert.match(`${workspace}\n${model}`, new RegExp(label));
  }

  assert.match(page, /Member Timeline/);
  assert.match(page, /BeastAdminMemberTimelineWorkspace/);
  assert.match(workspace, /\.rpc\(\s*"get_beast_admin_member_directory"/);
  assert.match(workspace, /\.rpc\(\s*"get_beast_admin_member_timeline"/);
  assert.match(workspace, /Search members/);
  assert.match(workspace, /No members are registered/);
  assert.match(workspace, /No .* events/);
  assert.match(workspace, /Permission and Source Coverage/);
  assert.match(workspace, /raw conversation content/);
  assert.match(workspace, /clinical details/);
  assert.match(workspace, /document contents/);
  assert.doesNotMatch(workspace, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workspace, /localStorage/);
  assert.match(shell, /Member Timeline/);
  assert.match(navigation, /Member Timeline/);
});
