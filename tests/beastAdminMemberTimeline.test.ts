import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminMemberTimelineCategories,
  buildBeastAdminMemberTimelineCounts,
  filterBeastAdminMemberDirectory,
  filterBeastAdminMemberTimelineEvents,
  normalizeBeastAdminMemberDirectory,
  normalizeBeastAdminMemberTimeline,
} from "../src/lib/beastAdminMemberTimeline";

const directory = [
  {
    id: "member-one",
    displayName: "Sean",
    email: "sean@example.com",
    emailVerificationStatus: "verified",
    accountStatus: "active",
    accountKind: "member",
    role: "admin",
    householdRole: null,
    moduleAccessOverrides: [],
    betaAssignments: [
      {
        id: "assignment-one",
        flagKey: "new_member_directory",
        name: "New member directory",
        stage: "beta",
        sourceScope: "member",
      },
    ],
    createdAt: "2026-07-01T11:00:00.000Z",
    profileCreatedAt: "2026-07-01T12:00:00.000Z",
    lastSignInAt: "2026-07-26T11:00:00.000Z",
    lastActivityAt: "2026-07-26T12:00:00.000Z",
    eventCount: 8,
  },
  {
    id: "member-two",
    displayName: null,
    email: null,
    emailVerificationStatus: "not_provided",
    accountStatus: "invited",
    accountKind: "unmanaged",
    role: null,
    householdRole: null,
    moduleAccessOverrides: [],
    betaAssignments: [],
    createdAt: "2026-07-10T11:00:00.000Z",
    profileCreatedAt: null,
    lastSignInAt: null,
    lastActivityAt: null,
    eventCount: 0,
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
  const normalized = normalizeBeastAdminMemberDirectory(directory);
  assert.ok(normalized);
  assert.equal(normalized[0].registeredAt, directory[0].createdAt);
  assert.equal(normalized[0].enabledModules.length, 8);
  assert.equal(normalized[1].displayName, "Not provided.");
  assert.equal(normalized[1].role, "Not provided.");
  assert.equal(normalized[1].lastActivityAt, null);
  assert.equal(normalized[1].eventCount, 0);
  assert.deepEqual(normalizeBeastAdminMemberDirectory([]), []);
  assert.equal(
    normalizeBeastAdminMemberDirectory([
      { ...directory[0], eventCount: -1 },
    ]),
    null
  );
  assert.equal(
    normalizeBeastAdminMemberDirectory([
      { ...directory[0], createdAt: "not-a-date" },
    ]),
    null
  );
});

test("BA-102 filters the directory by authoritative identity and effective access", () => {
  const normalized = normalizeBeastAdminMemberDirectory(directory);
  assert.ok(normalized);

  const baseFilters = {
    query: "",
    role: "all",
    accountStatus: "all" as const,
    betaStatus: "all" as const,
    moduleId: "all" as const,
  };

  assert.deepEqual(
    filterBeastAdminMemberDirectory(normalized, {
      ...baseFilters,
      query: "sean@example.com",
    }).map((member) => member.id),
    ["member-one"]
  );
  assert.deepEqual(
    filterBeastAdminMemberDirectory(normalized, {
      ...baseFilters,
      role: "Not provided.",
      accountStatus: "invited",
      betaStatus: "not_assigned",
      moduleId: "learning",
    }).map((member) => member.id),
    ["member-two"]
  );
  assert.deepEqual(
    filterBeastAdminMemberDirectory(normalized, {
      ...baseFilters,
      betaStatus: "assigned",
      moduleId: "admin",
    }).map((member) => member.id),
    ["member-one"]
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
  assert.equal(
    snapshot.events.find((event) => event.category === "registration")?.title,
    "Profile created"
  );
  assert.match(
    snapshot.events.find((event) => event.category === "registration")
      ?.detail || "",
    /may differ from the authentication signup/
  );
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

test("BA-102 exposes only owner-approved Auth fields and persisted access evidence", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726000900_add_authoritative_beast_admin_member_directory.sql",
    "utf8"
  );

  assert.match(migration, /security definer/);
  assert.match(migration, /public\.is_profile_admin\(\)/);
  assert.match(migration, /errcode = '42501'/);
  assert.match(migration, /auth_user\.email/);
  assert.match(migration, /auth_user\.email_confirmed_at/);
  assert.match(migration, /auth_user\.created_at/);
  assert.match(migration, /auth_user\.last_sign_in_at/);
  assert.match(migration, /auth_user\.banned_until/);
  assert.match(migration, /auth_user\.deleted_at/);
  assert.match(migration, /from auth\.users auth_user/);
  assert.match(
    migration,
    /left join public\.profiles profile on profile\.id = auth_user\.id/
  );
  assert.match(migration, /'householdRole', null/);
  assert.match(migration, /beast_admin_feature_flag_assignments/);
  assert.match(migration, /assignment\.scope_type = 'member'/);
  assert.match(migration, /assignment\.scope_type = 'role'/);
  assert.match(migration, /effective_assignment\.stage in \('internal_testing', 'beta'\)/);
  assert.match(migration, /'lastActivityAt', activity\.last_activity_at/);
  assert.doesNotMatch(migration, /split_part\(auth_user\.email/);
  assert.doesNotMatch(migration, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(
    migration,
    /revoke all on function public\.get_beast_admin_member_directory/
  );
  assert.match(
    migration,
    /grant execute on function public\.get_beast_admin_member_directory\(\)\s+to authenticated/
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

  assert.match(page, /Member Directory/);
  assert.match(page, /BeastAdminMemberTimelineWorkspace/);
  assert.match(workspace, /\.rpc\(\s*"get_beast_admin_member_directory"/);
  assert.match(workspace, /\.rpc\(\s*"get_beast_admin_member_timeline"/);
  assert.match(workspace, /Search members/);
  assert.match(workspace, /Authentication email/);
  assert.match(workspace, /Email verification/);
  assert.match(workspace, /Account status/);
  assert.match(workspace, /Household role/);
  assert.match(workspace, /Enabled modules/);
  assert.match(workspace, /Beta assignments/);
  assert.match(workspace, /Last sign-in/);
  assert.match(workspace, /Last active/);
  assert.match(workspace, /Not provided\./);
  assert.match(workspace, /All roles/);
  assert.match(workspace, /All account statuses/);
  assert.match(workspace, /All beta statuses/);
  assert.match(workspace, /All enabled modules/);
  assert.match(workspace, /No authenticated accounts found/);
  assert.match(workspace, /No .* events/);
  assert.match(workspace, /Permission and Source Coverage/);
  assert.match(workspace, /raw conversation content/);
  assert.match(workspace, /clinical details/);
  assert.match(workspace, /document contents/);
  assert.doesNotMatch(workspace, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(workspace, /localStorage/);
  assert.match(shell, /Members/);
  assert.match(navigation, /Members/);
});
