import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminMemberFieldSources,
  beastAdminMemberNonSources,
} from "../src/lib/beastAdminMemberDataAudit";

test("BA-101 maps every displayed member field to an explicit authority", () => {
  assert.deepEqual(
    beastAdminMemberFieldSources.map((field) => field.id),
    [
      "displayName",
      "email",
      "emailVerification",
      "accountStatus",
      "role",
      "householdRole",
      "enabledModules",
      "betaAssignments",
      "accountCreatedAt",
      "lastSignInAt",
      "registeredAt",
      "lastActivityAt",
      "eventCount",
      "applicationsUsed",
      "latestActivity",
      "timelineEvents",
    ]
  );

  for (const field of beastAdminMemberFieldSources) {
    assert.ok(field.source);
    assert.ok(field.columns);
    assert.ok(field.authoritativeSource);
    assert.ok(field.editable);
    assert.ok(field.synchronization);
    assert.ok(field.accessBoundary);
  }

  const email = beastAdminMemberFieldSources.find(
    (field) => field.id === "email"
  );
  assert.equal(email?.source, "Supabase Auth");
  assert.equal(email?.columns, "auth.users.email");
  assert.match(email?.synchronization || "", /No profile email copy/);
});

test("BA-101 proves the live member RPC joins Auth email to profile identity", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726000200_add_beast_admin_member_timeline.sql",
    "utf8"
  );
  const profileMigration = readFileSync(
    "supabase/migrations/20260628000000_add_profiles.sql",
    "utf8"
  );

  assert.match(migration, /'email', auth_user\.email/g);
  assert.match(migration, /'role', profile\.role/g);
  assert.match(
    migration,
    /profile\.preferred_name[\s\S]*profile\.display_name[\s\S]*profile\.full_name[\s\S]*profile\.username/
  );
  assert.match(
    migration,
    /join auth\.users auth_user on auth_user\.id = profile\.id/g
  );
  assert.match(migration, /public\.is_profile_admin\(\)/);
  assert.match(migration, /security definer/g);
  assert.doesNotMatch(migration, /profile\.email/);
  assert.doesNotMatch(migration, /service_role/);

  assert.match(profileMigration, /references auth\.users\(id\)/);
  assert.match(profileMigration, /after insert on auth\.users/);
  assert.match(profileMigration, /insert into public\.profiles \(id\)[\s\S]*from auth\.users/);
  assert.match(profileMigration, /Only admins can change profile roles/);
});

test("BA-101 confirms household family and beta records are not identity authorities", () => {
  assert.deepEqual(
    beastAdminMemberNonSources.map((item) => item.source),
    [
      "Household and Family",
      "Learning and Education profiles",
      "Feature flags and beta assignments",
      "Legacy BeastAdmin fixtures",
    ]
  );

  const household = readFileSync("src/lib/platform/household.ts", "utf8");
  const family = readFileSync("src/lib/platform/family.ts", "utf8");
  const flags = readFileSync(
    "supabase/migrations/20260726000400_add_beast_admin_feature_flags.sql",
    "utf8"
  );

  assert.match(household, /mockHouseholdModel/);
  assert.match(family, /mockFamilyModel/);
  assert.match(flags, /member_id uuid null references auth\.users/);
  assert.match(flags, /'memberEmail', auth_user\.email/);
  assert.match(flags, /'role', profile\.role/);
  assert.doesNotMatch(flags, /member_email text|member_name text/);
});

test("BA-101 removes placeholder identities from production-facing BeastAdmin", () => {
  const adminSettings = readFileSync(
    "src/app/dashboard/admin/settings/page.tsx",
    "utf8"
  );
  const adminMemberWorkspace = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberTimelineWorkspace.tsx",
    "utf8"
  );
  const legacyModel = readFileSync("src/lib/beastAdmin.ts", "utf8");

  assert.match(adminSettings, /Manage live assignments in Feature Flags/);
  assert.match(adminSettings, /does not display seeded members/);
  assert.doesNotMatch(
    adminSettings,
    /beastAdminMembers|beastAdminBetaAssignments|buildBetaAssignmentRows/
  );
  assert.doesNotMatch(
    `${adminSettings}\n${adminMemberWorkspace}\n${legacyModel}`,
    /owner@beastos\.local|beta@beastos\.local|Sean G\.|Beta Member/
  );
  assert.doesNotMatch(
    legacyModel,
    /export const beastAdminMembers|export const beastAdminBetaAssignments|export const beastAdminFeedbackItems/
  );
});

test("BA-101 makes provenance and truthful profile terminology visible", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/members/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberTimelineWorkspace.tsx",
    "utf8"
  );

  assert.match(page, /authoritative account identity/);
  assert.match(workspace, /Where every displayed field comes from/);
  assert.match(workspace, /Auth email:/);
  assert.match(workspace, /label="Profile role"/);
  assert.match(workspace, /label="Profile Created"/);
  assert.match(workspace, /public\.profiles\.created_at/);
  assert.match(workspace, /From profile creation to today/);
  assert.doesNotMatch(workspace, /Authenticated Beast profile/);
});

test("BA-101 ships the concise implementation audit without changing records", () => {
  const report = readFileSync(
    "docs/BA-101-MEMBER-AUTH-DATA-AUDIT.md",
    "utf8"
  );

  for (const section of [
    "Conclusion",
    "Displayed field map",
    "Other audited sources",
    "Safe corrections implemented",
  ]) {
    assert.match(report, new RegExp(section));
  }
  assert.match(report, /auth\.users\.email/);
  assert.match(report, /profiles\.preferred_name/);
  assert.match(report, /profiles\.role/);
  assert.match(report, /No member, Auth, profile, household, role, beta, or feedback records are changed/);
});
