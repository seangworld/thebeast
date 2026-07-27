import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  assessBeastAdminMigrationSafety,
  inspectBeastAdminMigrationSql,
} from "../src/lib/beastAdminMigrationSqlExplorer";
import { beastAdminRepositoryMigrationFiles } from "../src/lib/beastAdminMigrationStatus";

test("BA-132 inspects every repository migration without inventing source metadata", () => {
  const migrations = beastAdminRepositoryMigrationFiles.map((filename) =>
    inspectBeastAdminMigrationSql({
      filename,
      sql: readFileSync(`supabase/migrations/${filename}`, "utf8"),
    })
  );

  assert.equal(migrations.length, 55);
  for (const migration of migrations) {
    assert.match(migration.version, /^\d{14}$/);
    assert.equal(migration.filename.endsWith(".sql"), true);
    assert.equal(migration.purpose.length > 0, true, migration.filename);
    assert.equal(migration.capability.length > 0, true, migration.filename);
    assert.equal(migration.safety.summary.length > 0, true, migration.filename);
    assert.equal(Array.isArray(migration.createdObjects), true);
    assert.equal(Array.isArray(migration.tables), true);
    assert.equal(Array.isArray(migration.rpcs), true);
    assert.equal(Array.isArray(migration.policies), true);
    assert.equal(Array.isArray(migration.grants), true);
    assert.equal(Array.isArray(migration.triggers), true);
  }

  const migrationStatus = migrations.find(
    (migration) =>
      migration.filename ===
      "20260726001500_add_beast_admin_migration_status.sql"
  );
  assert.equal(migrationStatus?.roadmapId, "BA-119");
  assert.equal(
    migrationStatus?.rpcs.includes(
      "public.get_beast_admin_migration_status"
    ),
    true
  );
});

test("BA-132 safety assessment distinguishes additive configuration data and destructive SQL", () => {
  assert.equal(
    assessBeastAdminMigrationSafety(
      "create table if not exists public.example (id uuid);"
    ).level,
    "safe"
  );
  assert.equal(
    assessBeastAdminMigrationSafety(
      'create policy "Owner read" on public.example for select using (true);'
    ).level,
    "configuration"
  );
  assert.equal(
    assessBeastAdminMigrationSafety(
      "update public.example set id = id;"
    ).level,
    "data_migration"
  );
  const destructive = assessBeastAdminMigrationSafety(
    "drop table if exists public.example;"
  );
  assert.equal(destructive.level, "destructive");
  assert.equal(destructive.irreversible, true);
});

test("BA-132 does not mistake SQL inside a function definition for migration-time deletion", () => {
  const assessment = assessBeastAdminMigrationSafety(`
    create or replace function public.remove_example()
    returns void
    language plpgsql
    as $$
    begin
      delete from public.example;
    end;
    $$;
  `);

  assert.equal(assessment.level, "safe");
  assert.equal(assessment.irreversible, false);
});

test("BA-132 SQL source API is owner-only repository read access", () => {
  const route = readFileSync(
    "src/app/api/admin/migration-sql-explorer/route.ts",
    "utf8"
  );
  const nextConfig = readFileSync("next.config.js", "utf8");

  assert.match(route, /export async function GET/);
  assert.match(route, /supabase\.auth\.getUser\(\)/);
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /beastAdminRepositoryMigrationFiles\.includes/);
  assert.match(route, /readFile\(join\(migrationDirectory, filename\)/);
  assert.match(route, /format"\) === "source"/);
  assert.match(route, /content-type": "text\/plain/);
  assert.match(route, /get_beast_admin_migration_status/);
  assert.doesNotMatch(route, /service_role|SUPABASE_SERVICE_ROLE/);
  assert.doesNotMatch(
    route,
    /\.(insert|update|delete|upsert)\(|supabase\s+db\s+(push|reset)/
  );
  assert.match(nextConfig, /outputFileTracingIncludes/);
  assert.match(nextConfig, /supabase\/migrations\/\*\.sql/);
});

test("BA-132 presents complete highlighted SQL and copy-only controls", () => {
  const workspace = readFileSync(
    "src/app/dashboard/admin/migrations/explorer/BeastAdminMigrationSqlExplorerWorkspace.tsx",
    "utf8"
  );
  const page = readFileSync(
    "src/app/dashboard/admin/migrations/explorer/page.tsx",
    "utf8"
  );

  assert.match(page, /BeastAdminShell/);
  assert.match(page, /Migration SQL Explorer/);
  assert.match(workspace, /Copy SQL/);
  assert.match(workspace, /Copy filename/);
  assert.match(workspace, /Copy roadmap ID/);
  assert.match(workspace, /Open migration source/);
  assert.match(workspace, /Complete SQL/);
  assert.match(workspace, /HighlightedSql/);
  assert.match(workspace, /Safety assessment/);
  assert.match(workspace, /Expected objects/);
  assert.match(workspace, /Created objects/);
  assert.match(workspace, /RPCs and functions/);
  assert.match(workspace, /Policies/);
  assert.match(workspace, /Grants and revocations/);
  assert.match(workspace, /Triggers/);
  assert.match(workspace, /cannot execute SQL/);
  assert.doesNotMatch(workspace, />\s*(Run|Execute|Apply) SQL\s*</i);
  assert.doesNotMatch(workspace, /method:\s*"(POST|PUT|PATCH|DELETE)"/);
});
