import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminRepositoryMigrationFiles,
  buildBeastAdminCapabilityDiagnostics,
  buildBeastAdminMigrationInventory,
  buildBeastAdminMigrationStatusSnapshot,
  getBeastAdminMigrationEnvironment,
  normalizeBeastAdminDatabaseMigrationSnapshot,
  normalizeBeastAdminMigrationStatusSnapshot,
  type BeastAdminCapabilityObject,
  type BeastAdminMigrationRow,
} from "../src/lib/beastAdminMigrationStatus";
import {
  buildBeastAdminOpenApiInventory,
  buildBeastAdminMigrationSchemaEvidence,
} from "../src/lib/beastAdminMigrationSchemaEvidence";
import { inspectBeastAdminMigrationSql } from "../src/lib/beastAdminMigrationSqlExplorer";

const historySource = {
  schema: "supabase_migrations",
  table: "schema_migrations",
  available: true,
  storesAppliedTimestamp: false,
};

const executiveMetricsObject: BeastAdminCapabilityObject = {
  capabilityId: "executive_metrics",
  requiredMigration:
    "20260726000700_add_beast_admin_executive_metrics.sql",
  objectId: "executive_metrics_rpc",
  kind: "function",
  schema: "public",
  name: "get_beast_admin_executive_metrics",
  identity: "public.get_beast_admin_executive_metrics(integer)",
  exists: true,
  authenticatedExecute: true,
  rlsEnabled: null,
  policyCount: null,
};

test("BA-119 repository registry matches every Supabase migration file", () => {
  const actual = readdirSync("supabase/migrations")
    .filter((file) => file.endsWith(".sql"))
    .sort();

  assert.deepEqual([...beastAdminRepositoryMigrationFiles], actual);
  assert.equal(actual.length, 80);
});

test("BA-119 reports a fully applied repository without inventing timestamps", () => {
  const databaseMigrations = [
    {
      version: "20260726000600",
      name: "add_beast_admin_release_center",
      appliedAt: null,
    },
    {
      version: "20260726000700",
      name: "add_beast_admin_executive_metrics",
      appliedAt: null,
    },
  ];
  const result = buildBeastAdminMigrationInventory({
    repositoryFiles: [
      "20260726000600_add_beast_admin_release_center.sql",
      "20260726000700_add_beast_admin_executive_metrics.sql",
    ],
    databaseMigrations,
    historyAvailable: true,
  });

  assert.equal(result.summary.repositoryMigrations, 2);
  assert.equal(result.summary.applied, 2);
  assert.equal(result.summary.pending, 0);
  assert.deepEqual(result.pendingSequence, []);
  assert.equal(result.migrations[1]?.appliedAt, null);
});

test("BA-119 produces the exact pending order and identifies out-of-order history", () => {
  const result = buildBeastAdminMigrationInventory({
    repositoryFiles: [
      "20260726000100_first.sql",
      "20260726000200_second.sql",
      "20260726000300_third.sql",
    ],
    databaseMigrations: [
      { version: "20260726000100", name: "first", appliedAt: null },
      { version: "20260726000300", name: "third", appliedAt: null },
    ],
    historyAvailable: true,
    schemaEvidenceByMigration: {
      "20260726000200_second.sql": {
        status: "missing",
        expectedObjects: ["relation:second"],
        presentObjects: [],
        missingObjects: ["relation:second"],
        safeToExecute: true,
        explanation: "The expected relation is absent.",
      },
    },
  });

  assert.deepEqual(result.pendingSequence, ["20260726000200_second.sql"]);
  assert.equal(result.migrations[1]?.state, "pending");
  assert.equal(result.migrations[2]?.state, "applied_out_of_order");
  assert.equal(result.summary.outOfOrder, 1);
});

test("BA-119 classifies live schema independently and recommends only verified safe gaps", () => {
  const files = [
    "20260726000100_present.sql",
    "20260726000200_partial.sql",
    "20260726000300_safe_missing.sql",
    "20260726000400_review_missing.sql",
  ];
  const result = buildBeastAdminMigrationInventory({
    repositoryFiles: files,
    databaseMigrations: [],
    historyAvailable: true,
    schemaEvidenceByMigration: {
      [files[0]]: {
        status: "fully_present",
        expectedObjects: ["relation:present"],
        presentObjects: ["relation:present"],
        missingObjects: [],
        safeToExecute: true,
        explanation: "Present.",
      },
      [files[1]]: {
        status: "partial",
        expectedObjects: ["relation:partial", "rpc:partial"],
        presentObjects: ["relation:partial"],
        missingObjects: ["rpc:partial"],
        safeToExecute: true,
        explanation: "Partial.",
      },
      [files[2]]: {
        status: "missing",
        expectedObjects: ["relation:safe_missing"],
        presentObjects: [],
        missingObjects: ["relation:safe_missing"],
        safeToExecute: true,
        explanation: "Missing.",
      },
      [files[3]]: {
        status: "missing",
        expectedObjects: ["relation:review_missing"],
        presentObjects: [],
        missingObjects: ["relation:review_missing"],
        safeToExecute: false,
        explanation: "Missing and requires review.",
      },
    },
  });

  assert.deepEqual(
    result.migrations.map((migration) => migration.state),
    ["history_drift", "partial", "pending", "missing"]
  );
  assert.deepEqual(result.executionRecommendations, [files[2]]);
  assert.deepEqual(result.pendingSequence, [files[2]]);
  assert.equal(result.summary.historyDrift, 1);
  assert.equal(result.summary.partial, 1);
  assert.equal(result.summary.pending, 1);
  assert.equal(result.summary.missing, 1);
});

test("BA-119 never recommends superseded migrations that are unsafe to replay", () => {
  const original =
    "20260726001100_add_beast_auth_email_workflows.sql";
  const result = buildBeastAdminMigrationInventory({
    repositoryFiles: [original],
    databaseMigrations: [],
    historyAvailable: true,
    schemaEvidenceByMigration: {
      [original]: {
        status: "fully_present",
        expectedObjects: ["rpc:get_beast_auth_email_status"],
        presentObjects: ["rpc:get_beast_auth_email_status"],
        missingObjects: [],
        safeToExecute: true,
        explanation: "Present.",
      },
    },
  });

  assert.equal(result.migrations[0]?.state, "unsafe_to_replay");
  assert.equal(
    result.migrations[0]?.replacementMigration,
    "20260726002000_reconcile_beast_auth_email_workflows.sql"
  );
  assert.equal(result.migrations[0]?.executionRecommended, false);
  assert.deepEqual(result.executionRecommendations, []);
});

test("BA-119 keeps a reconciled capability available while its original migration remains unsafe", () => {
  const migration: BeastAdminMigrationRow = {
    version: "20260726001200",
    filename: "20260726001200_add_beast_admin_member_invitations.sql",
    name: "add_beast_admin_member_invitations",
    roadmapId: "BA-INV-101",
    historicalRoadmapId: "BA-108",
    capability: "Member Invitations",
    repositoryStatus: "present",
    databaseStatus: "not_applied",
    liveSchemaStatus: "fully_present",
    expectedObjects: ["relation:beast_admin_member_invitations"],
    presentObjects: ["relation:beast_admin_member_invitations"],
    missingObjects: [],
    appliedAt: null,
    state: "unsafe_to_replay",
    classificationReason: "Superseded by reconciliation.",
    executionRecommended: false,
    replacementMigration:
      "20260726002100_reconcile_beast_admin_member_invitations.sql",
  };
  const object: BeastAdminCapabilityObject = {
    capabilityId: "member_administration",
    requiredMigration: migration.filename,
    objectId: "member_invitations",
    kind: "table",
    schema: "public",
    name: "beast_admin_member_invitations",
    identity: "public.beast_admin_member_invitations",
    exists: true,
    authenticatedExecute: null,
    rlsEnabled: true,
    policyCount: 1,
  };
  const diagnostic = buildBeastAdminCapabilityDiagnostics({
    migrations: [migration],
    objects: [object],
  }).find((capability) => capability.id === "member_administration");

  assert.equal(diagnostic?.state, "available");
  assert.match(diagnostic?.conclusion || "", /unsafe to replay/i);
});

test("BA-119 derives read-only schema evidence from PostgREST OpenAPI", () => {
  const sql = `
    create table if not exists public.example_records (id uuid primary key);
    alter table public.profiles add column if not exists example_note text;
    create or replace function public.get_example_records() returns jsonb
      language sql as $$ select '[]'::jsonb $$;
    grant execute on function public.get_example_records() to authenticated;
  `;
  const metadata = inspectBeastAdminMigrationSql({
    filename: "20260726000100_example.sql",
    sql,
  });
  const openApi = {
    paths: {
      "/example_records": {},
      "/profiles": {},
      "/rpc/get_example_records": {},
    },
    definitions: {
      example_records: { properties: { id: {} } },
      profiles: { properties: { example_note: {} } },
    },
  };
  const inventory = buildBeastAdminOpenApiInventory(openApi);
  const evidence = buildBeastAdminMigrationSchemaEvidence({
    migrations: [{ metadata, sql }],
    openApi,
    diagnosticObjects: [],
  })[metadata.filename];

  assert.equal(inventory.relations.has("example_records"), true);
  assert.equal(inventory.columns.has("profiles.example_note"), true);
  assert.equal(inventory.rpcs.has("get_example_records"), true);
  assert.equal(evidence?.status, "fully_present");
  assert.deepEqual(evidence?.missingObjects, []);
});

test("BA-119 distinguishes database-only duplicate invalid and unknown records", () => {
  const knownHistory = buildBeastAdminMigrationInventory({
    repositoryFiles: [
      "20260726000100_first.sql",
      "20260726000100_duplicate.sql",
      "not-a-migration.sql",
    ],
    databaseMigrations: [
      {
        version: "20260725000000",
        name: "database_only",
        appliedAt: "2026-07-25T12:00:00.000Z",
      },
    ],
    historyAvailable: true,
  });
  const unknownHistory = buildBeastAdminMigrationInventory({
    repositoryFiles: ["20260726000100_first.sql"],
    databaseMigrations: [],
    historyAvailable: false,
  });

  assert.equal(
    knownHistory.migrations.filter(
      (migration) => migration.state === "duplicate_version"
    ).length,
    2
  );
  assert.equal(
    knownHistory.migrations.some(
      (migration) => migration.state === "invalid_filename"
    ),
    true
  );
  assert.equal(
    knownHistory.migrations.some(
      (migration) => migration.state === "database_only"
    ),
    true
  );
  assert.equal(unknownHistory.migrations[0]?.state, "unknown");
  assert.equal(unknownHistory.migrations[0]?.databaseStatus, "unknown");
});

test("BA-119 distinguishes applied history with a missing object from permissions", () => {
  const appliedMigration: BeastAdminMigrationRow = {
    version: "20260726000700",
    filename: "20260726000700_add_beast_admin_executive_metrics.sql",
    name: "add_beast_admin_executive_metrics",
    roadmapId: "BA-MET-101",
    historicalRoadmapId: "BA-110",
    capability: "Executive Metrics",
    repositoryStatus: "present",
    databaseStatus: "applied",
    liveSchemaStatus: "fully_present",
    expectedObjects: ["rpc:get_beast_admin_executive_metrics"],
    presentObjects: ["rpc:get_beast_admin_executive_metrics"],
    missingObjects: [],
    appliedAt: null,
    state: "applied",
    classificationReason: "Repository, ledger, and schema agree.",
    executionRecommended: false,
    replacementMigration: null,
  };
  const missingObject = {
    ...executiveMetricsObject,
    exists: false,
    authenticatedExecute: null,
  };
  const deniedObject = {
    ...executiveMetricsObject,
    authenticatedExecute: false,
  };

  assert.equal(
    buildBeastAdminCapabilityDiagnostics({
      migrations: [appliedMigration],
      objects: [missingObject],
    }).find((capability) => capability.id === "executive_metrics")?.state,
    "history_schema_mismatch"
  );
  assert.equal(
    buildBeastAdminCapabilityDiagnostics({
      migrations: [appliedMigration],
      objects: [deniedObject],
      actualErrors: {
        executive_metrics: {
          code: "42501",
          message: "BeastAdmin owner access required",
        },
      },
    }).find((capability) => capability.id === "executive_metrics")?.state,
    "permission_failure"
  );
});

test("BA-119 preserves the actual Executive Metrics API error", () => {
  const pendingMigration: BeastAdminMigrationRow = {
    version: "20260726000700",
    filename: "20260726000700_add_beast_admin_executive_metrics.sql",
    name: "add_beast_admin_executive_metrics",
    roadmapId: "BA-MET-101",
    historicalRoadmapId: "BA-110",
    capability: "Executive Metrics",
    repositoryStatus: "present",
    databaseStatus: "not_applied",
    liveSchemaStatus: "missing",
    expectedObjects: ["rpc:get_beast_admin_executive_metrics"],
    presentObjects: [],
    missingObjects: ["rpc:get_beast_admin_executive_metrics"],
    appliedAt: null,
    state: "pending",
    classificationReason: "The expected RPC is absent.",
    executionRecommended: true,
    replacementMigration: null,
  };
  const diagnostic = buildBeastAdminCapabilityDiagnostics({
    migrations: [pendingMigration],
    objects: [
      {
        ...executiveMetricsObject,
        exists: false,
        authenticatedExecute: null,
      },
    ],
    actualErrors: {
      executive_metrics: {
        code: "PGRST202",
        message:
          "Could not find the function public.get_beast_admin_executive_metrics(window_days) in the schema cache",
        hint: "Perhaps you meant get_beast_admin_member_timeline",
      },
    },
  }).find((capability) => capability.id === "executive_metrics");

  assert.equal(diagnostic?.state, "pending_migration");
  assert.equal(diagnostic?.actualError?.code, "PGRST202");
  assert.match(diagnostic?.actualError?.message || "", /window_days/);
});

test("BA-119 identifies wrong development preview and production projects", () => {
  const production = getBeastAdminMigrationEnvironment({
    supabaseUrl: "https://grpyzwvgqiwtxadfdtni.supabase.co",
    siteOrigin: "https://thebeast.seangworld.com",
    vercelEnvironment: "production",
    branch: "main",
  });
  const wrongPreview = getBeastAdminMigrationEnvironment({
    supabaseUrl: "https://grpyzwvgqiwtxadfdtni.supabase.co",
    siteOrigin: "https://preview.example",
    vercelEnvironment: "preview",
    branch: "feature",
  });

  assert.equal(production.name, "Production");
  assert.equal(production.projectLabel, "thebeast");
  assert.equal(production.matchesExpectedProject, true);
  assert.equal(wrongPreview.name, "Preview");
  assert.equal(wrongPreview.expectedProjectRef, "zvzcojwjgnedrouilovc");
  assert.equal(wrongPreview.matchesExpectedProject, false);
});

test("BA-119 normalizes the supported Supabase migration-history response", () => {
  const databaseSnapshot = normalizeBeastAdminDatabaseMigrationSnapshot({
    historySource,
    migrations: [
      {
        version: "20260726000700",
        name: "add_beast_admin_executive_metrics",
        appliedAt: null,
      },
    ],
    objects: [executiveMetricsObject],
  });
  assert.ok(databaseSnapshot);

  const snapshot = buildBeastAdminMigrationStatusSnapshot({
    databaseSnapshot,
    environment: getBeastAdminMigrationEnvironment({
      supabaseUrl: "https://grpyzwvgqiwtxadfdtni.supabase.co",
      siteOrigin: "https://thebeast.seangworld.com",
      vercelEnvironment: "production",
      branch: "main",
    }),
    repositoryFiles: [
      "20260726000700_add_beast_admin_executive_metrics.sql",
    ],
    generatedAt: "2026-07-26T21:00:00.000Z",
  });

  assert.ok(normalizeBeastAdminMigrationStatusSnapshot(snapshot));
  assert.equal(
    normalizeBeastAdminDatabaseMigrationSnapshot({
      historySource,
      migrations: [{ version: "bad", name: null, appliedAt: null }],
      objects: [],
    }),
    null
  );
});

test("BA-119 database diagnostic is owner-only read-only and statement-safe", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726001500_add_beast_admin_migration_status.sql",
    "utf8"
  );

  assert.match(migration, /supabase_migrations\.schema_migrations/);
  assert.match(migration, /to_jsonb\(history_row\) - 'statements'/);
  assert.match(migration, /public\.is_profile_admin\(\)/);
  assert.match(migration, /security definer/);
  assert.match(migration, /set search_path = public, pg_catalog/);
  assert.match(migration, /to_regprocedure/);
  assert.match(migration, /has_function_privilege/);
  assert.match(migration, /relrowsecurity/);
  assert.match(migration, /pg_policies/);
  assert.match(migration, /grant execute[\s\S]*to authenticated/);
  assert.doesNotMatch(migration, /\btruncate\b|\bdelete from\b/i);
});

test("BA-119 server route protects diagnostics and never exposes service credentials", () => {
  const route = readFileSync(
    "src/app/api/admin/migration-status/route.ts",
    "utf8"
  );

  assert.match(route, /auth\.getUser/);
  assert.match(route, /profile\?\.role !== "admin"/);
  assert.match(route, /get_beast_admin_migration_status/);
  assert.match(route, /get_beast_admin_executive_metrics/);
  assert.match(route, /application\/openapi\+json/);
  assert.match(route, /buildBeastAdminMigrationSchemaEvidence/);
  assert.match(route, /requiredMigration/);
  assert.match(route, /cache-control/);
  assert.doesNotMatch(route, /createAdminClient|SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(route, /insert\(|update\(|delete\(|migration repair/);
});

test("BA-119 presents schema-aware classifications recommendations and responsive inventory", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/migrations/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/migrations/BeastAdminMigrationStatusWorkspace.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");
  const metrics = readFileSync(
    "src/app/dashboard/admin/metrics/BeastAdminExecutiveMetricsWorkspace.tsx",
    "utf8"
  );
  const responsive = readFileSync(
    "tests/e2e/responsive-overflow.spec.ts",
    "utf8"
  );

  assert.match(page, /Migration Status/);
  assert.match(page, /BeastAdminShell/);
  assert.match(workspace, /Connected environment/);
  assert.match(workspace, /Supabase project/);
  assert.match(workspace, /Execution recommendations/);
  assert.match(workspace, /Fully Present — History Drift/);
  assert.match(workspace, /Unsafe to Replay/);
  assert.match(workspace, /Live schema/);
  assert.match(workspace, /Migration ledger/);
  assert.match(workspace, /Verified migrations ready to execute/);
  assert.match(workspace, /Copy ordered list/);
  assert.match(workspace, /Capability diagnostics/);
  assert.match(workspace, /Migration inventory/);
  assert.match(workspace, /Applied out of order/);
  assert.match(workspace, /Database-only/);
  assert.match(workspace, /Not recorded by migration history/);
  assert.match(workspace, /overflow-x-auto/);
  assert.match(workspace, /md:hidden/);
  assert.match(workspace, /min-w-0/);
  assert.match(workspace, /never applies or repairs migrations/i);
  assert.match(navigation, /Migration Status/);
  assert.match(metrics, /Open Migration Status/);
  assert.match(responsive, /\/dashboard\/admin\/migrations/);
  assert.doesNotMatch(workspace, /SUPABASE_SERVICE_ROLE_KEY/);
});
