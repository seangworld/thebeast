import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildEmailVerificationCallbackUrl,
  buildEmailVerificationFailurePath,
  getBeastAuthEmailStatus,
  getEmailWorkflowErrorMessage,
  normalizeRequestedAuthEmail,
} from "../src/lib/auth/emailWorkflows";
import {
  mergeBeastAdminMemberEmailStatuses,
  normalizeBeastAdminMemberDirectory,
  normalizeBeastAdminMemberEmailStatuses,
} from "../src/lib/beastAdminMemberTimeline";

const memberDirectory = [
  {
    id: "member-one",
    displayName: "Sean",
    email: "old@example.com",
    emailVerificationStatus: "verified",
    accountStatus: "active",
    accountKind: "member",
    role: "admin",
    householdRole: null,
    moduleAccessOverrides: [],
    betaAssignments: [],
    createdAt: "2026-07-01T11:00:00.000Z",
    profileCreatedAt: "2026-07-01T11:00:00.000Z",
    lastSignInAt: "2026-07-26T11:00:00.000Z",
    lastActivityAt: "2026-07-26T12:00:00.000Z",
    eventCount: 1,
  },
];

test("BA-107 derives member email state only from Supabase Auth fields", () => {
  assert.deepEqual(
    getBeastAuthEmailStatus({
      email: "Current@Example.com",
      email_confirmed_at: "2026-07-26T12:00:00.000Z",
      new_email: "New@Example.com",
      email_change_sent_at: "2026-07-26T12:05:00.000Z",
    }),
    {
      currentEmail: "current@example.com",
      verified: true,
      pendingEmail: "new@example.com",
      emailChangeSentAt: "2026-07-26T12:05:00.000Z",
    }
  );
  assert.deepEqual(getBeastAuthEmailStatus(null), {
    currentEmail: null,
    verified: false,
    pendingEmail: null,
    emailChangeSentAt: null,
  });
});

test("BA-107 validates a new email and keeps callback destinations internal", () => {
  assert.equal(
    normalizeRequestedAuthEmail(" New@Example.com ", "old@example.com"),
    "new@example.com"
  );
  assert.equal(
    normalizeRequestedAuthEmail("old@example.com", "OLD@example.com"),
    null
  );
  assert.equal(normalizeRequestedAuthEmail("not-an-email"), null);

  const callback = new URL(
    buildEmailVerificationCallbackUrl(
      "https://preview.example.com",
      "https://thebeast.seangworld.com/ignored"
    )
  );
  assert.equal(callback.origin, "https://thebeast.seangworld.com");
  assert.equal(callback.pathname, "/auth/callback");
  assert.equal(callback.searchParams.get("flow"), "email_verification");
  assert.equal(
    callback.searchParams.get("next"),
    "/dashboard/settings/profile?email=verification-returned"
  );
  assert.equal(
    buildEmailVerificationFailurePath(),
    "/dashboard/settings/profile?email=verification-failed"
  );
});

test("BA-107 returns human-readable and non-destructive email errors", () => {
  assert.match(
    getEmailWorkflowErrorMessage({ code: "email_exists" }),
    /already used/
  );
  assert.match(
    getEmailWorkflowErrorMessage({ code: "over_email_send_rate_limit" }),
    /sent recently/
  );
  assert.match(
    getEmailWorkflowErrorMessage({ code: "session_expired" }),
    /Sign in again/
  );
  assert.match(getEmailWorkflowErrorMessage({ code: "unknown" }), /unchanged/);
});

test("BA-107 merges owner-only pending Auth status without replacing it with profile data", () => {
  const members = normalizeBeastAdminMemberDirectory(memberDirectory);
  const statuses = normalizeBeastAdminMemberEmailStatuses([
    {
      id: "member-one",
      currentEmail: "current@example.com",
      emailVerificationStatus: "verified",
      pendingEmail: "pending@example.com",
      emailChangeSentAt: "2026-07-26T12:05:00.000Z",
    },
  ]);
  assert.ok(members);
  assert.ok(statuses);

  const merged = mergeBeastAdminMemberEmailStatuses(members, statuses);
  assert.equal(merged[0].email, "current@example.com");
  assert.equal(merged[0].pendingEmail, "pending@example.com");
  assert.equal(
    merged[0].emailChangeSentAt,
    "2026-07-26T12:05:00.000Z"
  );
  assert.equal(
    normalizeBeastAdminMemberEmailStatuses([
      {
        id: "member-one",
        currentEmail: "current@example.com",
        emailVerificationStatus: "verified",
        pendingEmail: "pending@example.com",
        emailChangeSentAt: "not-a-date",
      },
    ]),
    null
  );
});

test("BA-107 member workflow requests, resends, and explains authoritative email behavior", () => {
  const component = readFileSync(
    "src/app/dashboard/settings/profile/AccountEmailWorkflowCard.tsx",
    "utf8"
  );
  const callback = readFileSync("src/app/auth/callback/route.ts", "utf8");

  assert.match(component, /auth\.getUser\(\)/);
  assert.match(component, /auth\.updateUser\(/);
  assert.match(component, /emailRedirectTo: verificationRedirect\(\)/);
  assert.match(component, /type: status\.pendingEmail \? "email_change" : "signup"/);
  assert.match(component, /current email remains the login email/i);
  assert.match(component, /does\s+not keep a hidden profile copy/i);
  assert.match(component, /Resend email-change verification/);
  assert.match(callback, /flow"\) === "email_verification"/);
  assert.match(callback, /buildEmailVerificationFailurePath/);
  assert.match(callback, /auth\.verifyOtp\(/);
  assert.match(callback, /token_hash: tokenHash/);
});

test("BA-107 owner correction and resend remain server-only, confirmed, and audited", () => {
  const editRoute = readFileSync(
    "src/app/api/admin/members/[memberId]/route.ts",
    "utf8"
  );
  const resendRoute = readFileSync(
    "src/app/api/admin/members/[memberId]/email-verification/route.ts",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberTimelineWorkspace.tsx",
    "utf8"
  );

  assert.match(editRoute, /authUpdates\.email_confirm = false/);
  assert.match(editRoute, /adminClient\.auth\.resend/);
  assert.match(editRoute, /The original Auth email was restored/);
  assert.match(resendRoute, /actorProfile\?\.role !== "admin"/);
  assert.match(resendRoute, /const \{ memberId \} = await params/);
  assert.match(resendRoute, /auth\.admin\.getUserById\(memberId\)/);
  assert.match(resendRoute, /email_verification_resent/);
  assert.match(resendRoute, /System, demo, and unmanaged accounts are protected/);
  assert.match(workspace, /Pending email change/);
  assert.match(workspace, /Resend verification/);
});

test("BA-107 migration and templates preserve Auth authority and secure confirmation", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726001100_add_beast_auth_email_workflows.sql",
    "utf8"
  );
  const config = readFileSync("supabase/config.toml", "utf8");
  const template = readFileSync(
    "supabase/auth/templates/change-email.html",
    "utf8"
  );
  const report = readFileSync(
    "docs/BA-107-AUTH-EMAIL-WORKFLOWS.md",
    "utf8"
  );

  assert.match(migration, /security definer/);
  assert.match(migration, /public\.is_profile_admin\(\)/);
  assert.match(migration, /auth_user\.email_change/);
  assert.match(migration, /auth_user\.email_change_sent_at/);
  assert.match(migration, /email_verification_resent/);
  assert.match(migration, /grant execute[\s\S]*to authenticated/);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/);
  assert.match(config, /double_confirm_changes = true/);
  assert.match(config, /enable_confirmations = true/);
  assert.match(config, /\[auth\.email\.template\.confirmation\]/);
  assert.match(config, /\[auth\.email\.template\.email_change\]/);
  assert.match(template, /\{\{ \.RedirectTo \}\}/);
  assert.match(template, /\{\{ \.TokenHash \}\}/);
  assert.match(template, /\{\{ \.NewEmail \}\}/);
  assert.match(report, /does not write a copied email/i);
  assert.match(report, /20260726001100/);
});
