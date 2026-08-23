import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260823023000_restore_server_only_beast_admin_rpc_grants.sql"
  ),
  "utf8"
);

const serverOnlyFunctions = [
  "get_beast_admin_auth_user_id_by_email",
  "accept_beast_admin_member_invitation",
  "apply_beast_admin_member_auth_control",
  "create_beast_admin_member_invitation",
  "record_beast_admin_account_audit_event",
  "record_beast_admin_invitation_action",
  "update_beast_admin_member_account",
];

test("SEC-002 revokes public API execution from every proven server-only RPC", () => {
  for (const functionName of serverOnlyFunctions) {
    const start = migration.indexOf(`function public.${functionName}(`);
    assert.notEqual(start, -1, functionName);
    const grantStart = migration.indexOf("grant execute", start);
    const revoke = migration.slice(start, grantStart);
    assert.match(revoke, /from anon, authenticated;/, functionName);
  }
});

test("SEC-002 preserves service-role execution and makes no schema or data change", () => {
  for (const functionName of serverOnlyFunctions) {
    assert.match(
      migration,
      new RegExp(
        `grant execute on function public\\.${functionName}\\([\\s\\S]*?\\) to service_role;`
      ),
      functionName
    );
  }

  assert.doesNotMatch(
    migration,
    /\b(?:create|alter|drop|insert|update|delete|truncate)\b/i
  );
});
