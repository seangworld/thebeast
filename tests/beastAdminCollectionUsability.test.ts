import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const pagination = readFileSync(
  "src/app/dashboard/admin/BeastAdminPagination.tsx",
  "utf8"
);
const development = readFileSync(
  "src/app/dashboard/admin/development/BeastAdminDevelopmentConsoleWorkspace.tsx",
  "utf8"
);
const migrations = readFileSync(
  "src/app/dashboard/admin/migrations/BeastAdminMigrationStatusWorkspace.tsx",
  "utf8"
);
const releases = readFileSync(
  "src/app/dashboard/admin/releases/BeastAdminReleaseCenterWorkspace.tsx",
  "utf8"
);
const roadmap = readFileSync(
  "src/app/dashboard/admin/roadmap/BeastAdminRoadmapWorkspace.tsx",
  "utf8"
);

test("BeastAdmin large collections use a shared bounded pagination control", () => {
  assert.match(pagination, /BEAST_ADMIN_PAGE_SIZE = 20/);
  assert.match(pagination, /Showing[\s\S]*firstItem[\s\S]*lastItem[\s\S]*totalItems/);
  assert.match(pagination, /Page \{currentPage\} of \{pageCount\}/);
  assert.match(pagination, /Previous/);
  assert.match(pagination, /Next/);

  for (const workspace of [roadmap, releases]) {
    assert.match(workspace, /BeastAdminPagination/);
    assert.match(workspace, /pagedVisible = visible\.slice/);
    assert.match(workspace, /setPage\(1\)/);
    assert.doesNotMatch(workspace, /visible\.map\(/);
  }
});

test("Migration inventory is searchable, filterable, and never renders the full ledger at once", () => {
  assert.match(migrations, /Search inventory/);
  assert.match(migrations, /All classifications/);
  assert.match(migrations, /filteredMigrations/);
  assert.match(migrations, /pagedMigrations/);
  assert.match(migrations, /BeastAdminPagination/);
  assert.doesNotMatch(migrations, /snapshot\.migrations\.map\(/);
});

test("Development Console bounds long evidence and history sections", () => {
  assert.match(development, /DEVELOPMENT_HISTORY_PAGE_SIZE = 10/);
  assert.match(development, /BeastAdminPagination/);
  assert.match(development, /max-h-\[40rem\] overflow-auto/);
  assert.match(development, /sticky top-0/);
  assert.match(development, /Technical records stay collapsed until they are needed/);
  assert.match(development, /<details/);
  assert.match(development, /Show \{\(canonical\.records \?\? \[\]\)\.length\} technical source records/);
});
