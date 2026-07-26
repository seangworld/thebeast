import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  categorizeAuthUserAgent,
  normalizeBeastAdminAccountAccessAction,
  normalizeBeastAdminAccountAccessResponse,
  normalizeBeastAdminAccountAccessSnapshot,
} from "../src/lib/beastAdminAccountAccess";

const memberId = "550e8400-e29b-41d4-a716-446655440000";

test("BA-109 derives only coarse device and browser categories from real user-agent evidence", () => {
  assert.deepEqual(
    categorizeAuthUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"
    ),
    {
      deviceCategory: "Mobile",
      platform: "iOS or iPadOS",
      browser: "Safari",
    }
  );
  assert.deepEqual(
    categorizeAuthUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/127.0 Safari/537.36 Edg/127.0"
    ),
    {
      deviceCategory: "Desktop",
      platform: "Windows",
      browser: "Microsoft Edge",
    }
  );
  assert.equal(categorizeAuthUserAgent(null), null);
});

test("BA-109 validates owner authentication actions and requires review evidence", () => {
  assert.deepEqual(
    normalizeBeastAdminAccountAccessAction({
      action: "revoke_sessions",
    }),
    { action: "revoke_sessions", reason: null }
  );
  assert.deepEqual(
    normalizeBeastAdminAccountAccessAction({
      action: "flag_suspicious",
      reason: "Unexpected repeated password recovery requests.",
    }),
    {
      action: "flag_suspicious",
      reason: "Unexpected repeated password recovery requests.",
    }
  );
  assert.equal(
    normalizeBeastAdminAccountAccessAction({
      action: "flag_suspicious",
      reason: "",
    }),
    null
  );
  assert.equal(
    normalizeBeastAdminAccountAccessAction({ action: "delete_account" }),
    null
  );
});

test("BA-109 normalizes evidence without inventing failed attempts, devices, or locations", () => {
  const snapshot = normalizeBeastAdminAccountAccessSnapshot({
    memberId,
    lastSuccessfulSignInAt: "2026-07-26T12:05:00.000Z",
    emailChangeSentAt: "2026-07-26T11:00:00.000Z",
    retentionDays: 90,
    providerAuditAvailable: true,
    providerEvents: [
      {
        id: "provider-1",
        action: "login",
        occurredAt: "2026-07-26T12:00:00.000Z",
        userAgent: null,
      },
      {
        id: "provider-2",
        action: "user_recovery_requested",
        occurredAt: "2026-07-26T10:00:00.000Z",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Version/18.0 Safari/605.1.15",
      },
    ],
    platformEvents: [
      {
        id: "platform-1",
        action: "suspicious_activity_flagged",
        occurredAt: "2026-07-26T12:10:00.000Z",
        reason: "Member reported an unrecognized recovery email.",
      },
    ],
    control: {
      freshSignInRequiredAfter: null,
      suspiciousActivityFlagged: true,
      suspiciousActivityFlaggedAt: "2026-07-26T12:10:00.000Z",
      suspiciousActivityReason:
        "Member reported an unrecognized recovery email.",
    },
  });

  assert.ok(snapshot);
  assert.equal(snapshot.failedSignInEvidenceAvailable, false);
  assert.equal(snapshot.locationCollectionEnabled, false);
  assert.equal(snapshot.events[0]?.type, "suspicious_activity_flagged");
  assert.equal(
    snapshot.events.find((event) => event.type === "sign_in")
      ?.deviceCategory,
    null
  );
  assert.equal(
    snapshot.events.find(
      (event) => event.type === "password_reset_requested"
    )?.platform,
    "macOS"
  );
  assert.equal(
    snapshot.events.some((event) => event.type === "email_change"),
    true
  );
  assert.ok(normalizeBeastAdminAccountAccessResponse(snapshot));
});

test("BA-109 route keeps service-role session actions server-side and owner-only", () => {
  const route = readFileSync(
    "src/app/api/admin/members/[memberId]/access-history/route.ts",
    "utf8"
  );

  assert.match(route, /actorProfile\?\.role !== "admin"/);
  assert.match(route, /createAdminClient\(\)/);
  assert.match(route, /get_beast_admin_member_access_history/);
  assert.match(route, /apply_beast_admin_member_auth_control/);
  assert.match(route, /auth\.admin\.getUserById/);
  assert.match(route, /normalizeBeastAdminAccountAccessSnapshot/);
  assert.match(route, /existing access tokens still expire on the provider/);
  assert.doesNotMatch(route, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("BA-109 UI exposes honest availability, retention, and confirmed controls", () => {
  const component = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberAccessHistory.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberTimelineWorkspace.tsx",
    "utf8"
  );

  for (const copy of [
    "Last successful sign-in",
    "Failed sign-ins",
    "Not available.",
    "Approximate location",
    "Not collected.",
    "Revoke all sessions",
    "Require fresh sign-in",
    "Flag for review",
  ]) {
    assert.match(component, new RegExp(copy));
  }
  const accessLogic = readFileSync(
    "src/lib/beastAdminAccountAccess.ts",
    "utf8"
  );
  assert.match(accessLogic, /Password reset requested/);
  assert.match(component, /window\.confirm/);
  assert.match(component, /raw user agents, IP addresses/);
  assert.match(workspace, /BeastAdminMemberAccessHistory/);
});

test("BA-109 migration keeps history owner-only, retained, and sessions controlled", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726001300_add_beast_admin_account_access_history.sql",
    "utf8"
  );

  assert.match(migration, /auth\.audit_log_entries/);
  assert.match(migration, /auth_user\.last_sign_in_at/);
  assert.match(migration, /auth_user\.email_change_sent_at/);
  assert.match(migration, /authentication_email_changed/);
  assert.match(migration, /account_event\.changes/);
  assert.match(migration, /interval '90 days'/g);
  assert.match(migration, /public\.is_profile_admin\(\)/);
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.doesNotMatch(migration, /delete from auth\.sessions/);
  assert.match(migration, /beastos_sessions_revoked/);
  assert.match(migration, /is_current_beast_session_allowed/);
  assert.match(migration, /suspicious_activity_flagged/);
  assert.match(migration, /grant execute[\s\S]*to service_role/);
  assert.match(migration, /grant execute[\s\S]*to authenticated/);
  assert.doesNotMatch(migration, /audit_event\.ip_address/);
});

test("BA-109 middleware enforces owner fresh-sign-in controls on protected requests", () => {
  const middleware = readFileSync("src/middleware.ts", "utf8");

  assert.match(middleware, /is_current_beast_session_allowed/);
  assert.match(middleware, /scope: "global"/);
  assert.match(middleware, /isPublicAuthApiRoute/);
  assert.match(middleware, /"\/api\/:path\*"/);
  assert.match(middleware, /"session_expired"/);
});
