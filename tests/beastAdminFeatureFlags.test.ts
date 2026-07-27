import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastFeatureFlagStages,
  filterBeastFeatureFlags,
  normalizeBeastFeatureFlagMembers,
  normalizeBeastFeatureFlagResolution,
  normalizeBeastFeatureFlags,
  resolveBeastFeatureFlag,
  type BeastFeatureFlag,
  type BeastFeatureFlagAssignment,
} from "../src/lib/beastFeatureFlags";

function assignment(
  overrides: Partial<BeastFeatureFlagAssignment>
): BeastFeatureFlagAssignment {
  return {
    id: "assignment",
    scopeType: "module",
    stage: "hidden",
    moduleId: "learning",
    roleName: null,
    memberId: null,
    memberName: null,
    memberEmail: null,
    createdAt: "2026-07-26T12:00:00.000Z",
    updatedAt: "2026-07-26T12:00:00.000Z",
    ...overrides,
  };
}

const flag: BeastFeatureFlag = {
  id: "flag-1",
  key: "education.guidance-roadmap",
  name: "Guidance roadmap",
  description: "Controlled release for the roadmap workspace.",
  assignments: [
    assignment({
      id: "module",
      scopeType: "module",
      stage: "beta",
      moduleId: "learning",
    }),
    assignment({
      id: "role",
      scopeType: "role",
      stage: "hidden",
      moduleId: null,
      roleName: "user",
    }),
    assignment({
      id: "member",
      scopeType: "member",
      stage: "internal_testing",
      moduleId: null,
      memberId: "member-1",
      memberName: "Sean",
      memberEmail: "sean@example.com",
    }),
  ],
  createdAt: "2026-07-26T12:00:00.000Z",
  updatedAt: "2026-07-26T12:00:00.000Z",
};

test("BA-106 supports every controlled release stage", () => {
  assert.deepEqual(beastFeatureFlagStages, [
    "hidden",
    "owner",
    "internal_testing",
    "beta",
    "released",
    "deprecated",
  ]);
});

test("BA-106 resolves member then role then module and fails closed", () => {
  const member = resolveBeastFeatureFlag({
    flag,
    moduleId: "learning",
    memberId: "member-1",
    role: "user",
  });
  const role = resolveBeastFeatureFlag({
    flag,
    moduleId: "learning",
    memberId: "member-2",
    role: "user",
  });
  const module = resolveBeastFeatureFlag({
    flag,
    moduleId: "learning",
    memberId: "member-3",
    role: "beta",
  });
  const missing = resolveBeastFeatureFlag({
    flag: null,
    moduleId: "money",
    memberId: "member-3",
    role: "user",
  });

  assert.equal(member.sourceScope, "member");
  assert.equal(member.stage, "internal_testing");
  assert.equal(member.visible, true);
  assert.equal(role.sourceScope, "role");
  assert.equal(role.stage, "hidden");
  assert.equal(role.visible, false);
  assert.equal(module.sourceScope, "module");
  assert.equal(module.stage, "beta");
  assert.equal(module.visible, true);
  assert.equal(missing.stage, "hidden");
  assert.equal(missing.visible, false);
  assert.equal(missing.sourceScope, "default");
});

test("BA-106 applies stage semantics without replacing permissions", () => {
  const resolveModuleStage = (
    stage: BeastFeatureFlagAssignment["stage"],
    role: string
  ) =>
    resolveBeastFeatureFlag({
      flag: {
        ...flag,
        assignments: [
          assignment({
            stage,
          }),
        ],
      },
      moduleId: "learning",
      memberId: "member",
      role,
    });

  assert.equal(resolveModuleStage("hidden", "admin").visible, false);
  assert.equal(resolveModuleStage("owner", "admin").visible, true);
  assert.equal(resolveModuleStage("owner", "beta").visible, false);
  assert.equal(
    resolveModuleStage("internal_testing", "beta").visible,
    false
  );
  assert.equal(resolveModuleStage("beta", "beta").visible, true);
  assert.equal(resolveModuleStage("released", "user").visible, true);
  assert.equal(resolveModuleStage("deprecated", "user").deprecated, true);
});

test("BA-106 normalizes assignments and searchable definitions", () => {
  const normalized = normalizeBeastFeatureFlags([flag]);
  assert.deepEqual(normalized, [flag]);
  assert.deepEqual(
    filterBeastFeatureFlags([flag], "controlled release").map(
      (item) => item.id
    ),
    ["flag-1"]
  );
  assert.equal(
    normalizeBeastFeatureFlags([
      {
        ...flag,
        assignments: [
          {
            ...flag.assignments[0],
            memberId: "member-with-second-target",
          },
        ],
      },
    ]),
    null
  );
  assert.deepEqual(
    normalizeBeastFeatureFlagResolution({
      flagKey: flag.key,
      stage: "deprecated",
      visible: true,
      deprecated: true,
      sourceScope: "module",
      sourceId: "learning",
      reason: "module assignment resolved to deprecated.",
    }),
    {
      flagKey: flag.key,
      stage: "deprecated",
      visible: true,
      deprecated: true,
      sourceScope: "module",
      sourceId: "learning",
      reason: "module assignment resolved to deprecated.",
    }
  );
  assert.deepEqual(
    normalizeBeastFeatureFlagMembers([
      {
        id: "member-1",
        displayName: "Sean",
        email: "sean@example.com",
        role: "admin",
      },
    ]),
    [
      {
        id: "member-1",
        displayName: "Sean",
        email: "sean@example.com",
        role: "admin",
      },
    ]
  );
});

test("BA-106 stores owner-only definitions and assignments with runtime precedence", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726000400_add_beast_admin_feature_flags.sql",
    "utf8"
  );

  assert.match(migration, /beast_admin_feature_flags/);
  assert.match(migration, /beast_admin_feature_flag_assignments/);
  assert.match(migration, /role in \('user', 'beta', 'admin'\)/);
  assert.match(migration, /scope_type in \('module', 'role', 'member'\)/);
  assert.match(
    migration,
    /'hidden',[\s\S]*'owner',[\s\S]*'internal_testing',[\s\S]*'beta',[\s\S]*'released',[\s\S]*'deprecated'/
  );
  assert.match(migration, /beast_admin_feature_flag_target_check/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /public\.is_profile_admin\(\)/g);
  assert.match(migration, /auth\.uid\(\) = owner_id/g);
  assert.match(migration, /get_beast_admin_feature_flag_members/);
  assert.match(migration, /join auth\.users auth_user/);
  assert.match(migration, /get_beast_feature_flag_resolution/);
  assert.match(
    migration,
    /when 'member' then 1[\s\S]*when 'role' then 2[\s\S]*else 3/
  );
  assert.match(migration, /No assignment matched, so visibility fails closed/);
  assert.match(migration, /revoke all on function/g);
  assert.doesNotMatch(migration, /insert into public\.beast_admin_feature_flags[\s\S]*values \(\s*'[a-z]/);
});

test("BA-106 provides owner management and a fail-closed runtime hook", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/flags/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/flags/BeastAdminFeatureFlagsWorkspace.tsx",
    "utf8"
  );
  const hook = readFileSync("src/lib/hooks/useFeatureFlag.ts", "utf8");
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  assert.match(page, /Feature Flags/);
  assert.match(page, /BeastAdminFeatureFlagsWorkspace/);
  assert.match(workspace, /\.rpc\("get_beast_admin_feature_flags"/);
  assert.match(
    workspace,
    /\.rpc\("get_beast_admin_feature_flag_members"/
  );
  assert.match(workspace, /save_beast_admin_feature_flag/);
  assert.match(workspace, /save_beast_admin_feature_flag_assignment/);
  assert.match(workspace, /remove_beast_admin_feature_flag_assignment/);
  assert.match(workspace, /New feature flag/);
  assert.match(workspace, /Module/);
  assert.match(workspace, /Role/);
  assert.match(workspace, /Member/);
  assert.match(workspace, /No feature flags are configured/);
  assert.match(workspace, /window\.confirm/);
  assert.doesNotMatch(workspace, /localStorage/);
  assert.match(hook, /get_beast_feature_flag_resolution/);
  assert.match(hook, /visibility fails closed/);
  assert.match(navigation, /Feature Flags/);
});

test("BA-124 makes an empty feature registry understandable without changing runtime stages", () => {
  const workspace = readFileSync(
    "src/app/dashboard/admin/flags/BeastAdminFeatureFlagsWorkspace.tsx",
    "utf8"
  );

  for (const example of [
    "education.guidance-roadmap",
    "money.velocity-planner",
    "health.timeline",
    "home.maintenance",
    "admin.ceo-mode",
  ]) {
    assert.match(workspace, new RegExp(example.replace(/[.-]/g, "\\$&")));
  }

  assert.match(
    workspace,
    /"hidden",[\s\S]*"internal_testing",[\s\S]*"beta",[\s\S]*"released",[\s\S]*"deprecated"/
  );
  assert.match(workspace, /Current lifecycle/);
  assert.match(workspace, /domain-first key/);
  assert.match(workspace, /owner-only previews/);
  assert.deepEqual(beastFeatureFlagStages, [
    "hidden",
    "owner",
    "internal_testing",
    "beta",
    "released",
    "deprecated",
  ]);
});
