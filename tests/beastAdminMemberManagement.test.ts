import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BEAST_ADMIN_MEMBER_USAGE_PERIOD_DAYS,
  buildBeastAdminManagedMemberDirectory,
  filterBeastAdminManagedMembers,
  getBeastAdminMostUsedModuleLabel,
  normalizeBeastAdminMemberUsageSummary,
  paginateBeastAdminManagedMembers,
  sortBeastAdminManagedMembers,
  type BeastAdminMemberManagementFilters,
} from "../src/lib/beastAdminMemberManagement";
import type { BeastAdminMemberDirectoryEntry } from "../src/lib/beastAdminMemberTimeline";

function member(
  overrides: Partial<BeastAdminMemberDirectoryEntry> & { id: string }
): BeastAdminMemberDirectoryEntry {
  const { id, ...values } = overrides;
  return {
    id,
    displayName: "Not provided.",
    email: null,
    emailVerificationStatus: "not_provided",
    accountStatus: "active",
    accountKind: "member",
    role: "member",
    householdRole: null,
    enabledModules: [],
    moduleAccessOverrides: [],
    betaAssignments: [],
    createdAt: "2026-01-01T12:00:00.000Z",
    profileCreatedAt: "2026-01-01T12:00:00.000Z",
    lastSignInAt: null,
    lastActivityAt: null,
    registeredAt: "2026-01-01T12:00:00.000Z",
    eventCount: 0,
    ...values,
  };
}

const defaultFilters: BeastAdminMemberManagementFilters = {
  query: "",
  role: "all",
  accountStatus: "all",
  emailVerification: "all",
  moduleUsage: "all",
  betaStatus: "all",
  lastActive: "all",
};

test("BA-128 accepts only complete persisted usage summaries", () => {
  const valid = [
    {
      memberId: "member-1",
      mostUsedModuleId: "learning",
      activityCount: 8,
      latestActivityAt: "2026-07-25T12:00:00.000Z",
      periodDays: 90,
    },
  ];

  assert.deepEqual(normalizeBeastAdminMemberUsageSummary(valid), valid);
  assert.equal(
    normalizeBeastAdminMemberUsageSummary([
      { ...valid[0], activityCount: 0 },
    ]),
    null
  );
  assert.equal(
    normalizeBeastAdminMemberUsageSummary([
      { ...valid[0], mostUsedModuleId: "access-assignment" },
    ]),
    null
  );
  assert.equal(
    normalizeBeastAdminMemberUsageSummary([
      { ...valid[0], latestActivityAt: "not-a-date" },
    ]),
    null
  );
});

test("BA-128 distinguishes no activity from an unavailable usage source", () => {
  const directory = [
    member({
      id: "active",
      displayName: "Active Member",
      email: "active@example.com",
      emailVerificationStatus: "verified",
    }),
    member({ id: "quiet", displayName: "Quiet Member" }),
  ];
  const usage = [
    {
      memberId: "active",
      mostUsedModuleId: "learning" as const,
      activityCount: 12,
      latestActivityAt: "2026-07-25T12:00:00.000Z",
      periodDays: 90,
    },
  ];

  const available = buildBeastAdminManagedMemberDirectory({
    members: directory,
    usage,
    usageEvidenceAvailable: true,
  });
  assert.equal(getBeastAdminMostUsedModuleLabel(available[0]), "BeastEducation");
  assert.equal(getBeastAdminMostUsedModuleLabel(available[1]), "Not enough activity");

  const unavailable = buildBeastAdminManagedMemberDirectory({
    members: directory,
    usage: [],
    usageEvidenceAvailable: false,
  });
  assert.equal(getBeastAdminMostUsedModuleLabel(unavailable[0]), "Usage unavailable");
  assert.equal(
    unavailable[0].usagePeriodDays,
    BEAST_ADMIN_MEMBER_USAGE_PERIOD_DAYS
  );
});

test("BA-128 searches and filters authoritative account attributes", () => {
  const now = new Date("2026-07-26T12:00:00.000Z");
  const members = buildBeastAdminManagedMemberDirectory({
    members: [
      member({
        id: "owner",
        displayName: "Sean Gatewood",
        email: "sean@example.com",
        emailVerificationStatus: "verified",
        role: "admin",
        householdRole: "Owner · Gatewood",
        lastActivityAt: "2026-07-25T12:00:00.000Z",
        betaAssignments: [
          {
            id: "beta-1",
            flagKey: "education.guidance-roadmap",
            name: "Roadmap",
            stage: "beta",
            sourceScope: "member",
          },
        ],
      }),
      member({
        id: "suspended",
        displayName: "Alex Student",
        email: "alex@example.com",
        emailVerificationStatus: "unverified",
        accountStatus: "suspended",
        lastActivityAt: "2026-03-01T12:00:00.000Z",
      }),
      member({ id: "quiet", displayName: "Not provided." }),
    ],
    usage: [
      {
        memberId: "owner",
        mostUsedModuleId: "money",
        activityCount: 5,
        latestActivityAt: "2026-07-25T12:00:00.000Z",
        periodDays: 90,
      },
    ],
    usageEvidenceAvailable: true,
  });

  assert.deepEqual(
    filterBeastAdminManagedMembers(
      members,
      { ...defaultFilters, query: "sean@" },
      now
    ).map((entry) => entry.id),
    ["owner"]
  );
  assert.deepEqual(
    filterBeastAdminManagedMembers(
      members,
      {
        ...defaultFilters,
        role: "admin",
        emailVerification: "verified",
        moduleUsage: "money",
        betaStatus: "assigned",
        lastActive: "7_days",
      },
      now
    ).map((entry) => entry.id),
    ["owner"]
  );
  assert.deepEqual(
    filterBeastAdminManagedMembers(
      members,
      {
        ...defaultFilters,
        accountStatus: "suspended",
        emailVerification: "unverified",
        lastActive: "inactive_90_days",
      },
      now
    ).map((entry) => entry.id),
    ["suspended"]
  );
  assert.deepEqual(
    filterBeastAdminManagedMembers(
      members,
      {
        ...defaultFilters,
        moduleUsage: "insufficient",
        betaStatus: "not_assigned",
        lastActive: "never",
      },
      now
    ).map((entry) => entry.id),
    ["quiet"]
  );
});

test("BA-128 sorts meaningful columns and paginates deterministically", () => {
  const members = buildBeastAdminManagedMemberDirectory({
    members: [
      member({
        id: "b",
        displayName: "Bravo",
        lastSignInAt: null,
        createdAt: "2026-02-01T12:00:00.000Z",
      }),
      member({
        id: "a",
        displayName: "Alpha",
        lastSignInAt: "2026-07-01T12:00:00.000Z",
        createdAt: "2026-03-01T12:00:00.000Z",
      }),
      member({
        id: "c",
        displayName: "Charlie",
        lastSignInAt: "2026-06-01T12:00:00.000Z",
      }),
    ],
    usage: [],
    usageEvidenceAvailable: true,
  });

  assert.deepEqual(
    sortBeastAdminManagedMembers(members, "displayName", "asc").map(
      (entry) => entry.id
    ),
    ["a", "b", "c"]
  );
  assert.deepEqual(
    sortBeastAdminManagedMembers(members, "lastSignIn", "desc").map(
      (entry) => entry.id
    ),
    ["a", "c", "b"]
  );
  assert.deepEqual(paginateBeastAdminManagedMembers(members, 2, 2), {
    page: 2,
    pageCount: 2,
    pageSize: 2,
    total: 3,
    items: [members[2]],
  });
});

test("BA-128 usage RPC is owner-only, bounded, and privacy preserving", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726001600_add_beast_admin_member_usage_summary.sql",
    "utf8"
  );

  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = public/);
  assert.match(migration, /public\.is_profile_admin\(\)/);
  assert.match(migration, /greatest\(1, least\(coalesce\(usage_period_days, 90\), 365\)\)/);
  assert.match(migration, /make_interval\(days => safe_period_days\)/);
  for (const source of [
    "agent_conversations",
    "beast_goal_lifecycle_events",
    "learning_sessions",
    "learning_achievements",
    "learning_certificates",
    "debt_payments",
    "bill_payments",
    "retirement_timeline_runs",
    "beast_documents",
  ]) {
    assert.match(migration, new RegExp(`public\\.${source}`));
  }
  assert.match(migration, /row_number\(\) over/);
  assert.match(migration, /activity_count desc/);
  assert.doesNotMatch(
    migration,
    /message\.content|conversation\.content|payment\.amount|storage_path|module_access|feature_flag_assignments/
  );
  assert.match(
    migration,
    /revoke all on function public\.get_beast_admin_member_usage_summary\(integer\)\s+from public/
  );
  assert.match(
    migration,
    /grant execute on function public\.get_beast_admin_member_usage_summary\(integer\)\s+to authenticated/
  );
});

test("BA-128 renders one owner workspace with the requested table, actions, and detail", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/members/page.tsx",
    "utf8"
  );
  const table = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberManagementTable.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberManagementWorkspace.tsx",
    "utf8"
  );
  const memberRoute = readFileSync(
    "src/app/api/admin/members/[memberId]/route.ts",
    "utf8"
  );

  assert.match(page, /BeastAdminMemberManagementWorkspace/);
  assert.doesNotMatch(page, /BeastAdminMemberTimelineWorkspace/);
  for (const label of [
    "Username / display name",
    "Login email",
    "Email verification",
    "Beast role",
    "Account status",
    "Household role",
    "Most-used module",
    "Last sign-in",
    "Last active",
    "Joined",
    "Actions",
  ]) {
    assert.match(table, new RegExp(label));
  }
  for (const action of [
    "View member",
    "Edit account",
    "Message member",
    "Resend verification",
    "Trigger password reset",
    "Manage module access",
    "Manage beta access",
    "Suspend account",
    "Revoke sessions",
    "View member timeline",
  ]) {
    assert.match(table, new RegExp(action));
  }
  assert.match(table, /sticky top-0/);
  assert.match(table, /max-w-full overflow-x-auto/);
  assert.match(table, /lg:hidden/);
  assert.match(table, /lg:block/);
  assert.match(table, /selected for future bulk actions/);
  assert.match(table, /No accounts match these filters/);
  assert.match(workspace, /No authenticated Beast accounts exist/);
  assert.match(workspace, /role="dialog"/);
  assert.match(workspace, /Messages with Admin/);
  assert.match(workspace, /BeastAdminMemberAccessHistory/);
  assert.match(workspace, /BeastAdminMemberEditor/);
  assert.match(workspace, /BeastAdminAccountAuditLog/);
  assert.match(workspace, /get_beast_admin_member_timeline/);
  assert.match(workspace, /get_beast_admin_member_usage_summary/);
  assert.match(memberRoute, /final Beast owner/i);
  assert.doesNotMatch(`${table}\n${workspace}`, /SUPABASE_SERVICE_ROLE_KEY/);
});
