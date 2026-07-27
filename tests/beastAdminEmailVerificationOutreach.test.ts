import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BEAST_VERIFICATION_REMINDER_BODY,
  BEAST_VERIFICATION_REMINDER_SUBJECT,
  beastEmailVerificationPolicy,
  buildBeastEmailVerificationAccessDecision,
  canCreateBeastEmailVerificationException,
  getBeastEmailVerificationAccessImpact,
} from "../src/lib/beastEmailVerificationPolicy";

test("BA-130 uses the reviewed reminder without implying that messaging verifies email", () => {
  assert.equal(
    BEAST_VERIFICATION_REMINDER_SUBJECT,
    "Verify your Beast account email"
  );
  assert.match(
    BEAST_VERIFICATION_REMINDER_BODY,
    /use the verification link sent to your login email/i
  );
  assert.doesNotMatch(
    BEAST_VERIFICATION_REMINDER_BODY,
    /this message (verifies|verified)/i
  );
});

test("BA-130 keeps essential access and the current platform available until policy approval", () => {
  assert.equal(beastEmailVerificationPolicy.restrictionEnforced, false);
  assert.equal(beastEmailVerificationPolicy.exceptionPolicyApproved, false);
  assert.deepEqual(beastEmailVerificationPolicy.verificationRequired, []);
  assert.deepEqual(
    beastEmailVerificationPolicy.essential.map((item) => item.key),
    [
      "authentication",
      "account_settings",
      "verification_help",
      "private_admin_messaging",
      "privacy_and_support",
    ]
  );
  assert.match(
    getBeastEmailVerificationAccessImpact(false),
    /No current restriction/
  );
  assert.equal(canCreateBeastEmailVerificationException("unknown"), false);

  const decision = buildBeastEmailVerificationAccessDecision({
    featureKey: "money.dashboard",
    featureLabel: "BeastMoney",
    verified: false,
  });
  assert.equal(decision.allowed, true);
  assert.equal(decision.featureClass, "allowed_before_verification");
  assert.match(decision.explanation, /not restricted/);
  assert.equal(decision.adminSupportPath, "/dashboard/messages");
});

test("BA-130 migration is owner-only, provenance-aware, and does not enable restrictions", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726001900_add_email_verification_outreach_policy.sql",
    "utf8"
  );

  for (const object of [
    "beast_email_verification_policy_rules",
    "beast_email_verification_exceptions",
    "get_beast_admin_member_email_statuses",
    "send_beast_admin_verification_reminder",
    "set_beast_admin_email_verification_exception",
    "record_beast_email_became_verified",
  ]) {
    assert.match(migration, new RegExp(object));
  }
  assert.match(migration, /enable row level security/g);
  assert.match(migration, /public\.is_profile_admin\(\)/g);
  assert.match(migration, /security definer/g);
  assert.match(migration, /set search_path = public/g);
  assert.match(migration, /restriction_enabled boolean not null default false/);
  assert.match(migration, /approved_at is not null/);
  assert.match(migration, /approved_by is not null/);
  assert.match(migration, /public\.send_beast_admin_message\(/);
  assert.match(migration, /message body excluded from audit/i);
  assert.match(migration, /after update of email_confirmed_at on auth\.users/);
  assert.match(migration, /notify pgrst, 'reload schema'/);
  assert.doesNotMatch(
    migration,
    /insert into public\.beast_email_verification_policy_rules/
  );
});

test("BA-130 owner routes report provider and environment diagnostics without exposing service credentials", () => {
  const resendRoute = readFileSync(
    "src/app/api/admin/members/[memberId]/email-verification/route.ts",
    "utf8"
  );
  const outreachRoute = readFileSync(
    "src/app/api/admin/members/[memberId]/verification-outreach/route.ts",
    "utf8"
  );

  for (const route of [resendRoute, outreachRoute]) {
    assert.match(route, /actorProfile\?\.role !== "admin"/);
    assert.match(route, /getBeastAdminMigrationEnvironment/);
    assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
  }
  assert.match(resendRoute, /providerError/);
  assert.match(resendRoute, /email_verification_resent/);
  assert.match(outreachRoute, /send_beast_admin_verification_reminder/);
  assert.match(outreachRoute, /verifiesEmail: false/);
  assert.match(outreachRoute, /No owner-approved verification exception policy/);
});

test("BA-130 member management exposes truthful outreach, history, and access impact", () => {
  const workspace = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberManagementWorkspace.tsx",
    "utf8"
  );
  const table = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberManagementTable.tsx",
    "utf8"
  );

  for (const text of [
    "Unverified",
    "Last verification email sent",
    "Send private verification reminder",
    "Resend official verification email",
    "Copy sign-in email",
    "Email verification outreach and history",
    "Owner technical diagnostics",
    "No verification-required feature policy",
  ]) {
    assert.match(`${workspace}\n${table}`, new RegExp(text));
  }
  assert.match(workspace, /BEAST_VERIFICATION_REMINDER_BODY/);
  assert.match(workspace, /\/verification-outreach/);
  assert.match(workspace, /BeastAdminAccountAuditLog/);
  assert.match(
    workspace,
    /\/dashboard\/admin\/messages\?member=/
  );
  assert.doesNotMatch(workspace, /mailto:/);
});
