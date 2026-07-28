import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { beastAdminRepositoryMigrationFiles } from "../src/lib/beastAdminMigrationStatus";

const migrationsDirectory = join(process.cwd(), "supabase", "migrations");
const readMigration = (filename: string) =>
  readFileSync(join(migrationsDirectory, filename), "utf8");

const originals = {
  email: "20260726001100_add_beast_auth_email_workflows.sql",
  invitations: "20260726001200_add_beast_admin_member_invitations.sql",
  access: "20260726001300_add_beast_admin_account_access_history.sql",
} as const;

const reconciliations = {
  email: "20260726002000_reconcile_beast_auth_email_workflows.sql",
  invitations:
    "20260726002100_reconcile_beast_admin_member_invitations.sql",
  access:
    "20260726002200_reconcile_beast_admin_account_access_history.sql",
} as const;

function matches(source: string, pattern: RegExp, group = 1) {
  return Array.from(source.matchAll(pattern), (match) => match[group])
    .filter((value): value is string => Boolean(value))
    .sort();
}

function expectedObjects(source: string) {
  return {
    tables: matches(
      source,
      /\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?(public\.[a-z0-9_]+)/gi
    ),
    functions: matches(
      source,
      /\bcreate\s+(?:or\s+replace\s+)?function\s+(public\.[a-z0-9_]+)\s*\(/gi
    ),
    indexes: matches(
      source,
      /\bcreate\s+(?:unique\s+)?index\s+(?:if\s+not\s+exists\s+)?([a-z0-9_]+)/gi
    ),
    policies: matches(
      source,
      /\bcreate\s+policy\s+"([^"]+)"\s+on\s+public\.[a-z0-9_]+/gi
    ),
    triggers: matches(
      source,
      /\bcreate\s+trigger\s+([a-z0-9_]+)/gi
    ),
  };
}

test("BA-134 reconciles the current email-status RPC without touching audit state", () => {
  const original = readMigration(originals.email);
  const reconciliation = readMigration(reconciliations.email);

  assert.deepEqual(
    expectedObjects(reconciliation).functions,
    expectedObjects(original).functions
  );
  assert.match(
    reconciliation,
    /to_regprocedure\(\s*'public\.get_beast_admin_member_email_statuses\(\)'/
  );
  assert.match(reconciliation, /'verifiedAt'/);
  assert.match(reconciliation, /'lastVerificationEmailSentAt'/);
  assert.match(
    reconciliation,
    /grant execute on function public\.get_beast_admin_member_email_statuses\(\)\s+to authenticated/
  );
  assert.doesNotMatch(
    reconciliation,
    /alter table public\.beast_admin_member_account_audit_events/i
  );
});

test("BA-134 invitation reconciliation restores every original capability object", () => {
  const originalObjects = expectedObjects(readMigration(originals.invitations));
  const reconciliation = readMigration(reconciliations.invitations);
  const reconciledObjects = expectedObjects(reconciliation);

  assert.deepEqual(reconciledObjects.tables, originalObjects.tables);
  assert.deepEqual(reconciledObjects.functions, originalObjects.functions);
  assert.deepEqual(reconciledObjects.indexes, originalObjects.indexes);
  assert.deepEqual(reconciledObjects.policies, originalObjects.policies);
  assert.deepEqual(reconciledObjects.triggers, originalObjects.triggers);
  assert.match(reconciliation, /enable row level security/g);
  assert.match(
    reconciliation,
    /grant execute on function public\.create_beast_admin_member_invitation/
  );
  assert.match(
    reconciliation,
    /grant execute on function public\.get_beast_admin_member_invitations\(\)\s+to authenticated/
  );
});

test("BA-134 access reconciliation restores every original capability object", () => {
  const originalObjects = expectedObjects(readMigration(originals.access));
  const reconciliation = readMigration(reconciliations.access);
  const reconciledObjects = expectedObjects(reconciliation);

  assert.deepEqual(reconciledObjects.tables, originalObjects.tables);
  assert.deepEqual(reconciledObjects.functions, originalObjects.functions);
  assert.deepEqual(reconciledObjects.indexes, originalObjects.indexes);
  assert.deepEqual(reconciledObjects.policies, originalObjects.policies);
  assert.deepEqual(reconciledObjects.triggers, originalObjects.triggers);
  assert.match(reconciliation, /enable row level security/g);
  assert.match(
    reconciliation,
    /grant execute on function public\.get_beast_admin_member_access_history/
  );
  assert.match(
    reconciliation,
    /grant execute on function public\.is_current_beast_session_allowed\(\)/
  );
  assert.match(
    reconciliation,
    /grant execute on function public\.apply_beast_admin_member_auth_control/
  );
});

test("BA-134 never drops objects or alters the immutable audit constraint", () => {
  for (const filename of Object.values(reconciliations)) {
    const reconciliation = readMigration(filename);
    assert.doesNotMatch(reconciliation, /^\s*drop\b/im, filename);
    assert.doesNotMatch(
      reconciliation,
      /\bcreate\s+or\s+replace\s+function\b/i,
      filename
    );
    assert.doesNotMatch(
      reconciliation,
      /beast_admin_member_account_audit_action_check/i,
      filename
    );
    assert.doesNotMatch(
      reconciliation,
      /alter table public\.beast_admin_member_account_audit_events/i,
      filename
    );
    assert.doesNotMatch(
      reconciliation,
      /\b(?:delete\s+from|update|truncate)\s+public\.beast_admin_member_account_audit_events\b/i,
      filename
    );
  }
});

test("BA-134 creates RPCs only when their exact signatures are absent", () => {
  for (const filename of Object.values(reconciliations)) {
    const reconciliation = readMigration(filename);
    const functions = expectedObjects(reconciliation).functions;
    const guards = matches(
      reconciliation,
      /to_regprocedure\(\s*'([^']+)'\s*\)/g
    );

    assert.equal(guards.length, functions.length, filename);
    for (const functionName of functions) {
      assert.equal(
        guards.some((guard) => guard.startsWith(`${functionName}(`)),
        true,
        `${filename} does not guard ${functionName}`
      );
    }
  }
});

test("BA-134 preserves the current broad immutable audit action set", () => {
  const currentAudit = readMigration(
    "20260726001900_add_email_verification_outreach_policy.sql"
  );
  const constraint = currentAudit.match(
    /add constraint beast_admin_member_account_audit_action_check check \(\s*action in \(([\s\S]*?)\)\s*\);/i
  )?.[1];
  assert.ok(constraint);

  const actions = matches(constraint, /'([a-z0-9_]+)'/g);
  assert.deepEqual(actions, [
    "account_deletion_canceled",
    "account_deletion_requested",
    "account_restored",
    "account_suspended",
    "account_updated",
    "admin_account_message_sent",
    "beastos_sessions_revoked",
    "beta_assignment_changed",
    "email_became_verified",
    "email_changed",
    "email_verification_policy_exception_added",
    "email_verification_policy_exception_removed",
    "email_verification_reminder_sent",
    "email_verification_resent",
    "fresh_sign_in_required",
    "invitation_accepted",
    "invitation_resent",
    "invitation_revoked",
    "invitation_sent",
    "module_access_changed",
    "password_reset_triggered",
    "role_changed",
    "suspicious_activity_cleared",
    "suspicious_activity_flagged",
  ]);
});

test("BA-134 migrations are registered after every required dependency", () => {
  const positions = new Map(
    beastAdminRepositoryMigrationFiles.map((filename, index) => [
      filename,
      index,
    ])
  );

  assert.ok(
    positions.get(reconciliations.email)! >
      positions.get(
        "20260726001900_add_email_verification_outreach_policy.sql"
      )!
  );
  assert.ok(
    positions.get(reconciliations.invitations)! >
      positions.get(reconciliations.email)!
  );
  assert.ok(
    positions.get(reconciliations.access)! >
      positions.get(reconciliations.invitations)!
  );
  assert.deepEqual(
    beastAdminRepositoryMigrationFiles.slice(
      positions.get(reconciliations.email),
      positions.get(reconciliations.access)! + 1
    ),
    Object.values(reconciliations)
  );
});
