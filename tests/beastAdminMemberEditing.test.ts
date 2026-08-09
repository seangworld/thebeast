import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  isProtectedBeastAdminAccount,
  normalizeBeastAdminMemberEditRequest,
  wouldRemoveFinalBeastOwner,
} from "../src/lib/beastAdminMemberEditing";
import { buildMobileNavigation } from "../src/lib/mobileFoundation";
import {
  buildApplicationNavigationForPersona,
  getBeastModuleNavigationForPersona,
} from "../src/lib/moduleNavigation";

const validRequest = {
  displayName: "Avery Member",
  email: "avery@example.com",
  role: "beta",
  accountStatus: "active",
  moduleAccess: ["learning"],
  betaFlagIds: ["9d998e8f-4cef-4e92-96f4-09c38c12f813"],
  confirmEmailChange: true,
};

test("BA-103 validates every editable field and rejects ambiguous selections", () => {
  assert.deepEqual(normalizeBeastAdminMemberEditRequest(validRequest), {
    ...validRequest,
    role: "beta",
    accountStatus: "active",
    moduleAccess: ["learning"],
  });
  assert.equal(
    normalizeBeastAdminMemberEditRequest({
      ...validRequest,
      email: "not-an-email",
    }),
    null
  );
  assert.equal(
    normalizeBeastAdminMemberEditRequest({
      ...validRequest,
      displayName: "x".repeat(101),
    }),
    null
  );
  assert.equal(
    normalizeBeastAdminMemberEditRequest({
      ...validRequest,
      moduleAccess: ["learning", "learning"],
    }),
    null
  );
  assert.equal(
    normalizeBeastAdminMemberEditRequest({
      ...validRequest,
      betaFlagIds: ["not-a-uuid"],
    }),
    null
  );
  assert.equal(
    normalizeBeastAdminMemberEditRequest({
      ...validRequest,
      confirmEmailChange: "yes",
    }),
    null
  );
});

test("BA-103 protects final owners plus explicit system and demo accounts", () => {
  assert.equal(
    wouldRemoveFinalBeastOwner({
      currentRole: "admin",
      nextRole: "user",
      nextStatus: "active",
      adminCount: 1,
    }),
    true
  );
  assert.equal(
    wouldRemoveFinalBeastOwner({
      currentRole: "admin",
      nextRole: "admin",
      nextStatus: "suspended",
      adminCount: 1,
    }),
    true
  );
  assert.equal(
    wouldRemoveFinalBeastOwner({
      currentRole: "admin",
      nextRole: "user",
      nextStatus: "active",
      adminCount: 2,
    }),
    false
  );
  assert.equal(
    isProtectedBeastAdminAccount({ accountKind: "system" }),
    true
  );
  assert.equal(
    isProtectedBeastAdminAccount({
      accountKind: "member",
      appMetadata: { is_demo: true },
    }),
    true
  );
  assert.equal(
    isProtectedBeastAdminAccount({ accountKind: "unmanaged" }),
    true
  );
  assert.equal(
    isProtectedBeastAdminAccount({ accountKind: "member" }),
    false
  );
});

test("BA-103 module access uses one shared navigation behavior", () => {
  const moduleAccess = [
    { moduleId: "money" as const, enabled: false },
    { moduleId: "learning" as const, enabled: true },
  ];
  const desktop = buildApplicationNavigationForPersona({
    isOwner: false,
    moduleAccess,
  });
  const moduleNavigation = getBeastModuleNavigationForPersona(
    false,
    moduleAccess
  );
  const mobile = buildMobileNavigation({
    isOwner: false,
    moduleAccess,
  });

  assert.equal(desktop.some((item) => item.module === "money"), false);
  assert.equal(desktop.some((item) => item.module === "learning"), true);
  assert.equal(
    moduleNavigation.some((item) => item.module === "money"),
    false
  );
  assert.equal(
    mobile.primary.some((item) => item.module === "money"),
    false
  );
  assert.equal(
    mobile.more.some((item) => item.module === "learning"),
    true
  );

  const owner = buildApplicationNavigationForPersona({
    isOwner: true,
    moduleAccess,
  });
  assert.equal(owner.some((item) => item.module === "money"), true);
});

test("BA-103 server route updates authoritative Auth with confirmation and rollback", () => {
  const route = readFileSync(
    "src/app/api/admin/members/[memberId]/route.ts",
    "utf8"
  );
  const adminClient = readFileSync("src/lib/supabase/admin.ts", "utf8");

  assert.match(route, /createRouteClient\(\)/);
  assert.match(route, /actorProfile\?\.role !== "admin"/);
  assert.match(route, /createAdminClient\(\)/);
  assert.match(route, /const \{ memberId \} = await params/);
  assert.match(route, /auth\.admin\.getUserById\(memberId\)/);
  assert.match(route, /auth\.admin\.updateUserById/);
  assert.match(
    route,
    /adminClient\.rpc\("update_beast_admin_member_account"/
  );
  assert.match(route, /authUpdates\.email_confirm = false/);
  assert.match(route, /confirmEmailChange/);
  assert.match(route, /already used by another Auth account/);
  assert.match(route, /final Beast owner cannot be demoted or suspended/);
  assert.match(route, /System and demo accounts are protected/);
  assert.match(route, /Auth rollback also failed/);
  assert.match(route, /emailReverificationRequired/);
  assert.match(adminClient, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(adminClient, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
});

test("BA-103 migration persists access and audits owner-only transactional edits", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726001000_add_beast_admin_member_account_editing.sql",
    "utf8"
  );

  assert.match(migration, /account_kind in \('member', 'system', 'demo'\)/);
  assert.match(migration, /beast_admin_member_module_access/);
  assert.match(migration, /beast_admin_member_account_audit_events/);
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /auth\.uid\(\) = member_id/);
  assert.match(migration, /public\.is_profile_admin\(\)/);
  assert.match(migration, /for update/);
  assert.match(migration, /final Beast owner cannot be demoted or suspended/);
  assert.match(migration, /join auth\.users owner_auth/);
  assert.match(migration, /owner_auth\.banned_until/);
  assert.match(migration, /current_profile\.account_kind <> 'member'/);
  assert.match(migration, /selected_module_ids/);
  assert.match(migration, /selected_beta_flag_ids/);
  assert.match(migration, /auth_change_summary/);
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.match(migration, /selected_actor_id/);
  assert.match(
    migration,
    /Non-Beta member overrides must be managed in Feature Flags/
  );
  assert.match(migration, /returning id into audit_event_id/);
  assert.match(
    migration,
    /revoke all on function public\.update_beast_admin_member_account/
  );
  assert.match(
    migration,
    /grant execute on function public\.update_beast_admin_member_account[\s\S]*to service_role/
  );
  assert.doesNotMatch(
    migration,
    /grant execute on function public\.update_beast_admin_member_account[\s\S]*to authenticated/
  );
  assert.doesNotMatch(
    migration,
    /create policy "[^"]+"\s+on public\.beast_admin_member_(?:module_access|account_audit_events)\s+for (?:insert|update|delete)/i
  );
});

test("BA-103 editor communicates destructive identity impact and unsupported household writes", () => {
  const editor = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberEditor.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberTimelineWorkspace.tsx",
    "utf8"
  );
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");

  assert.match(editor, /changes the member&apos;s sign-in email/);
  assert.match(editor, /same user ID and member records/);
  assert.match(editor, /require the member to verify/);
  assert.match(editor, /authoritative login email should change/);
  assert.match(editor, /Household relationship/);
  assert.match(editor, /editing is unavailable/i);
  assert.match(workspace, /accountKind === "member"/);
  assert.match(workspace, /protected system or demo account/);
  assert.match(workspace, /no managed public profile/);
  assert.match(layout, /beast_admin_member_module_access/);
  assert.match(layout, /router\.replace\("\/dashboard\/today"\)/);
});

test("BA-103 documents the environment deployment boundary", () => {
  const report = readFileSync(
    "docs/BA-103-MEMBER-ACCOUNT-EDITING.md",
    "utf8"
  );
  const envExample = readFileSync(".env.local.example", "utf8");

  assert.match(report, /20260726000900/);
  assert.match(report, /20260726001000/);
  assert.match(report, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(report, /server-only/);
  assert.match(envExample, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(envExample, /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY/);
});
