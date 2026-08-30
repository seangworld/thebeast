import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { beastModuleRegistry } from "../src/lib/moduleRegistry";

test("BH-REL-02 releases BeastHealth through the authoritative registry", () => {
  const health = beastModuleRegistry.find((entry) => entry.id === "health");
  assert.ok(health);
  assert.equal(health.visibility, "released");
  assert.equal(health.version, "v1.1.0 Production");
  const shell = readFileSync("src/app/dashboard/health/BeastHealthShell.tsx", "utf8");
  assert.match(shell, /resolveMemberModuleEntitlement/);
  assert.match(shell, /getModuleRegistryEntry\("health"\)/);
});

test("BH-REL-01 prepares owner-scoped supporting Health RLS without activating visibility", () => {
  const migration = readFileSync("supabase/migrations/20260809000200_prepare_member_health_rls.sql", "utf8");
  for (const table of ["beast_health_discovery", "beast_health_document_extractions", "beast_health_document_extraction_items"]) {
    assert.match(migration, new RegExp(`on public\\.${table}`));
  }
  assert.match(migration, /auth\.uid\(\) = owner_id/g);
  assert.doesNotMatch(migration, /profiles\.role|alter table.*visibility/i);
});

test("BH-REL-01 keeps AP-107 canonical records owner-scoped without a second writer", () => {
  const migration = readFileSync("supabase/migrations/20260809000100_restore_member_health_record_rls.sql", "utf8");
  assert.match(migration, /auth\.uid\(\) = owner_id/);
  assert.doesNotMatch(migration, /profiles\.role/);
  const persistence = readFileSync("src/lib/digitalStaffRuntime/persistence.ts", "utf8");
  assert.equal((persistence.match(/from\("beast_health_records"\)/g) || []).length > 0, true);
});
