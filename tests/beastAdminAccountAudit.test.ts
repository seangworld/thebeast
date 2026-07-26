import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminAccountAuditActions,
  formatBeastAdminAccountAuditValue,
  getBeastAdminAccountAuditActionLabel,
  normalizeBeastAdminAccountAuditReason,
  normalizeBeastAdminAccountAuditSnapshot,
} from "../src/lib/beastAdminAccountAudit";

const actorId = "4e929f61-7b9e-49c3-9d99-8e8f4cef4e92";
const memberId = "550e8400-e29b-41d4-a716-446655440000";

test("BA-110 exposes every requested sensitive account action", () => {
  for (const action of [
    "invitation_sent",
    "invitation_resent",
    "invitation_revoked",
    "email_changed",
    "role_changed",
    "account_suspended",
    "account_restored",
    "module_access_changed",
    "beta_assignment_changed",
    "password_reset_triggered",
    "beastos_sessions_revoked",
    "account_deletion_requested",
    "account_deletion_canceled",
  ] as const) {
    assert.equal(beastAdminAccountAuditActions.includes(action), true);
    assert.notEqual(getBeastAdminAccountAuditActionLabel(action), action);
  }
});

test("BA-110 normalizes explicit actor, target, values, outcome, and reason", () => {
  const snapshot = normalizeBeastAdminAccountAuditSnapshot({
    events: [
      {
        id: "audit-1",
        actorId,
        actorName: "Owner",
        memberId,
        memberName: "Member",
        action: "role_changed",
        occurredAt: "2026-07-26T12:00:00.000Z",
        previousValue: { role: "user" },
        newValue: { role: "beta" },
        outcome: "succeeded",
        reason: "Approved for the private beta.",
      },
    ],
    eventCount: 1,
    limit: 200,
  });

  assert.ok(snapshot);
  assert.equal(snapshot.events[0]?.actorId, actorId);
  assert.equal(snapshot.events[0]?.memberId, memberId);
  assert.deepEqual(snapshot.events[0]?.previousValue, { role: "user" });
  assert.deepEqual(snapshot.events[0]?.newValue, { role: "beta" });
  assert.equal(snapshot.events[0]?.outcome, "succeeded");
  assert.equal(
    normalizeBeastAdminAccountAuditReason("  Owner approved.  "),
    "Owner approved."
  );
  assert.equal(normalizeBeastAdminAccountAuditReason("x".repeat(501)), undefined);
  assert.match(
    formatBeastAdminAccountAuditValue({ moduleAccess: ["money", "learning"] }),
    /Module Access: money, learning/
  );
});

test("BA-110 rejects malformed audit snapshots instead of inventing evidence", () => {
  assert.equal(
    normalizeBeastAdminAccountAuditSnapshot({
      events: [
        {
          id: "audit-1",
          actorId,
          actorName: "Owner",
          memberId,
          memberName: "Member",
          action: "role_changed",
          occurredAt: "not-a-date",
          previousValue: {},
          newValue: {},
          outcome: "succeeded",
          reason: null,
        },
      ],
      eventCount: 1,
      limit: 200,
    }),
    null
  );
});

test("BA-110 migration is owner-only, append-only, searchable, and secret-safe", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726001400_add_immutable_beast_admin_account_audit_log.sql",
    "utf8"
  );
  const accountEditing = readFileSync(
    "supabase/migrations/20260726001000_add_beast_admin_member_account_editing.sql",
    "utf8"
  );

  assert.match(migration, /add column if not exists previous_value jsonb/);
  assert.match(migration, /add column if not exists new_value jsonb/);
  assert.match(migration, /add column if not exists outcome text/);
  assert.match(migration, /add column if not exists reason text/);
  assert.match(migration, /on delete restrict/);
  assert.match(migration, /before update or delete/);
  assert.match(migration, /account audit events are immutable/i);
  assert.match(migration, /public\.is_profile_admin\(\)/);
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.match(migration, /selected_member_id is null/);
  assert.match(migration, /selected_action is null/);
  assert.match(migration, /selected_date_from is null/);
  assert.match(migration, /selected_date_to is null/);
  assert.match(migration, /beast_admin_account_audit_action_created_idx/);
  assert.match(accountEditing, /beast_admin_member_account_audit_member_idx/);
  assert.match(
    migration,
    /password\|token\|secret\|emailotp\|otpcode\|actionlink\|confirmationlink/
  );
  assert.match(migration, /grant select[\s\S]*to authenticated/);
  assert.doesNotMatch(migration, /grant (insert|update|delete)[\s\S]*authenticated/);
});

test("BA-110 normalizes compound edits into distinct immutable events", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726001400_add_immutable_beast_admin_account_audit_log.sql",
    "utf8"
  );
  const editRoute = readFileSync(
    "src/app/api/admin/members/[memberId]/route.ts",
    "utf8"
  );

  for (const action of [
    "email_changed",
    "role_changed",
    "account_suspended",
    "account_restored",
    "module_access_changed",
    "beta_assignment_changed",
  ]) {
    assert.match(migration, new RegExp(`'${action}'`));
  }
  assert.match(editRoute, /currentModuleAccess/);
  assert.match(editRoute, /currentBetaFlagIds/);
  assert.match(editRoute, /moduleAccess: \{/);
  assert.match(editRoute, /betaAssignments: \{/);
});

test("BA-110 password-reset action records both outcomes without link secrets", () => {
  const route = readFileSync(
    "src/app/api/admin/members/[memberId]/password-reset/route.ts",
    "utf8"
  );
  const component = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberAccessHistory.tsx",
    "utf8"
  );

  assert.match(route, /actorProfile\?\.role !== "admin"/);
  assert.match(route, /isProtectedBeastAdminAccount/);
  assert.match(route, /resetPasswordForEmail/);
  assert.match(route, /record_beast_admin_account_audit_event/);
  assert.match(route, /resetError \? "failed" : "succeeded"/);
  assert.doesNotMatch(
    route,
    /(action_link|hashed_token|email_otp|access_token|refresh_token)/
  );
  assert.match(component, /Send password-reset email/);
  assert.match(component, /window\.confirm/);
});

test("BA-110 owner view searches by member, action, and date", () => {
  const route = readFileSync(
    "src/app/api/admin/account-audit/route.ts",
    "utf8"
  );
  const component = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminAccountAuditLog.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberTimelineWorkspace.tsx",
    "utf8"
  );

  assert.match(route, /actorProfile\?\.role !== "admin"/);
  assert.match(route, /get_beast_admin_account_audit_log/);
  for (const filter of ["memberId", "action", "dateFrom", "dateTo"]) {
    assert.match(route, new RegExp(filter));
    assert.match(component, new RegExp(filter));
  }
  assert.match(component, /Previous value/);
  assert.match(component, /New value/);
  assert.match(component, /event\.outcome/);
  assert.match(workspace, /BeastAdminAccountAuditLog/);
});

test("BA-110 pending invitation and access migrations expose exact values", () => {
  const invitations = readFileSync(
    "supabase/migrations/20260726001200_add_beast_admin_member_invitations.sql",
    "utf8"
  );
  const access = readFileSync(
    "supabase/migrations/20260726001300_add_beast_admin_account_access_history.sql",
    "utf8"
  );

  assert.match(invitations, /'previousValue'/g);
  assert.match(invitations, /'newValue'/g);
  assert.match(access, /prior_control/);
  assert.match(access, /next_control/);
  assert.match(access, /'previousValue'/);
  assert.match(access, /'newValue'/);
});
