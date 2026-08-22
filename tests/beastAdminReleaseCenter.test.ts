import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminDeploymentStatuses,
  beastAdminReleaseProducts,
  beastAdminValidationStatuses,
  buildBeastAdminReleaseSummary,
  filterBeastAdminReleaseRecords,
  normalizeBeastAdminReleaseRecords,
  type BeastAdminReleaseRecord,
} from "../src/lib/beastAdminReleaseCenter";

const release: BeastAdminReleaseRecord = {
  id: "release-1",
  product: "admin",
  version: "2.5.0",
  releaseDate: "2026-07-26",
  title: "BeastAdmin control center",
  summary: "Added owner release controls.",
  modulesIncluded: ["admin", "beastos"],
  bugFixes: ["Removed a stale release link."],
  features: ["Added complete release history."],
  databaseMigrations: [
    "20260726000600_add_beast_admin_release_center.sql",
  ],
  validationStatus: "passed",
  validationChecks: ["TypeScript", "ESLint", "Production build"],
  validationNotes: "All checks passed.",
  validatedAt: "2026-07-26T14:00:00.000Z",
  deploymentStatus: "deployed",
  deploymentReference: "94ba0ad",
  deploymentNotes: "Verified origin/main.",
  deployedAt: "2026-07-26T14:15:00.000Z",
  createdAt: "2026-07-26T13:00:00.000Z",
  updatedAt: "2026-07-26T14:15:00.000Z",
};

test("BA-108 supports releases across every Beast product", () => {
  assert.deepEqual(beastAdminReleaseProducts, [
    "platform",
    "beastos",
    "money",
    "education",
    "health",
    "goals",
    "documents",
    "home",
    "security",
    "fusion",
    "admin",
    "seangworld",
  ]);
  assert.deepEqual(beastAdminValidationStatuses, [
    "not_started",
    "in_progress",
    "passed",
    "passed_with_limits",
    "failed",
  ]);
  assert.deepEqual(beastAdminDeploymentStatuses, [
    "not_deployed",
    "scheduled",
    "deploying",
    "deployed",
    "failed",
    "rolled_back",
  ]);
});

test("BA-108 normalizes only complete evidence-backed release records", () => {
  assert.deepEqual(normalizeBeastAdminReleaseRecords([release]), [release]);
  assert.equal(
    normalizeBeastAdminReleaseRecords([
      { ...release, modulesIncluded: [] },
    ]),
    null
  );
  assert.equal(
    normalizeBeastAdminReleaseRecords([
      { ...release, deploymentStatus: "deployed", deployedAt: null },
    ]),
    null
  );
});

test("BA-108 filters release history and reports operational summary", () => {
  assert.deepEqual(
    filterBeastAdminReleaseRecords([release], {
      query: "release_center.sql",
      product: "admin",
      validationStatus: "passed",
      deploymentStatus: "deployed",
    }).map((item) => item.id),
    ["release-1"]
  );
  assert.equal(
    filterBeastAdminReleaseRecords([release], { product: "money" }).length,
    0
  );
  assert.deepEqual(buildBeastAdminReleaseSummary([release]), {
    releases: 1,
    deployed: 1,
    validationPassed: 1,
    withMigrations: 1,
    needsAttention: 0,
  });
  assert.equal(
    buildBeastAdminReleaseSummary([
      {
        ...release,
        id: "failed",
        validationStatus: "failed",
        deploymentStatus: "rolled_back",
      },
    ]).needsAttention,
    1
  );
});

test("BA-108 migration preserves owner-only release evidence", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726000600_add_beast_admin_release_center.sql",
    "utf8"
  );

  assert.match(migration, /beast_admin_release_records/);
  assert.match(migration, /version text not null/);
  assert.match(migration, /release_date date not null/);
  assert.match(migration, /modules_included text\[\]/);
  assert.match(migration, /bug_fixes text\[\]/);
  assert.match(migration, /features text\[\]/);
  assert.match(migration, /database_migrations text\[\]/);
  assert.match(migration, /validation_status/);
  assert.match(migration, /validation_checks/);
  assert.match(migration, /deployment_status/);
  assert.match(migration, /deployment_reference/);
  assert.match(migration, /deployed_at/);
  assert.match(
    migration,
    /'platform',[\s\S]*'beastos',[\s\S]*'money',[\s\S]*'education',[\s\S]*'health',[\s\S]*'goals',[\s\S]*'documents',[\s\S]*'home',[\s\S]*'security',[\s\S]*'fusion',[\s\S]*'admin',[\s\S]*'seangworld'/
  );
  assert.match(
    migration,
    /deployment_status <> 'deployed'[\s\S]*validation_status in \('passed', 'passed_with_limits'\)/
  );
  assert.match(migration, /enable row level security/);
  assert.match(migration, /public\.is_profile_admin\(\)/g);
  assert.match(migration, /auth\.uid\(\) = owner_id/g);
  assert.match(migration, /BeastAdmin owner access required/g);
  assert.match(migration, /get_beast_admin_release_records/);
  assert.match(migration, /save_beast_admin_release_record/);
  assert.match(
    migration,
    /Production deployment requires passing validation/
  );
  assert.match(migration, /revoke all on function/g);
  assert.doesNotMatch(
    migration,
    /insert into public\.beast_admin_release_records[\s\S]*values \(\s*'[a-z]/
  );
});

test("BA-CMD-001E makes Release Center canonical and separates operational annotations", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/releases/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/releases/BeastAdminReleaseCenterWorkspace.tsx",
    "utf8"
  );
  const notes = readFileSync(
    "src/app/dashboard/admin/releases/BeastAdminReleaseNotesWorkspace.tsx",
    "utf8"
  );
  const adminDashboard = readFileSync(
    "src/app/dashboard/admin/BeastAdminCEOModeWorkspace.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  assert.match(page, /Release Center/);
  assert.match(page, /BeastAdminShell/);
  assert.match(workspace, /useBeastAdminCommandCenter/);
  assert.match(workspace, /Read-only governed release truth/);
  assert.match(workspace, /\/dashboard\/admin\/releases\/notes/);
  assert.doesNotMatch(workspace, /get_beast_admin_release_records/);
  assert.doesNotMatch(workspace, /save_beast_admin_release_record/);
  assert.doesNotMatch(workspace, /\.insert\(|\.update\(|\.delete\(/);
  assert.match(notes, /\.rpc\(\s*"get_beast_admin_release_records"/);
  assert.match(notes, /save_beast_admin_release_record/);
  assert.match(notes, /Operational release annotations/);
  assert.match(notes, /do not validate, release, deploy, or override/);
  assert.match(notes, /href="\/dashboard\/releases"/);
  assert.match(notes, /href="\/release-notes"/);
  assert.doesNotMatch(workspace, /localStorage/);
  assert.match(adminDashboard, /\/dashboard\/admin\/releases/);
  assert.match(navigation, /Release Center/);
});
