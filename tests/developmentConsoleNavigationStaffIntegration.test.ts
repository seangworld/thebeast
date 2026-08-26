import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { developmentAgentProfiles } from "../src/lib/developmentAgentProfiles";
import { canAccessBeastAdmin } from "../src/lib/beastAdmin";
import { developmentConsoleSections } from "../src/app/dashboard/admin/development/DevelopmentConsoleSectionNav";

const developmentPage = readFileSync(
  "src/app/dashboard/admin/development/page.tsx",
  "utf8"
);
const developmentWorkspace = readFileSync(
  "src/app/dashboard/admin/development/BeastAdminDevelopmentConsoleWorkspace.tsx",
  "utf8"
);
const staffPage = readFileSync(
  "src/app/dashboard/digital-staff/page.tsx",
  "utf8"
);
const developmentStaff = readFileSync(
  "src/app/dashboard/digital-staff/OwnerDevelopmentStaffDirectory.tsx",
  "utf8"
);

test("BF-AGT-010 exposes compact deep links for every major Development Console section", () => {
  assert.deepEqual(
    developmentConsoleSections.map(({ id }) => id),
    ["overview", "agents", "proposals", "execution", "releases", "dependencies", "history", "governance"]
  );
  assert.match(developmentPage, /DevelopmentConsoleSectionNav/);
  assert.match(developmentPage, /id="releases"/);
  for (const id of developmentConsoleSections
    .map((section) => section.id)
    .filter((id) => id !== "releases")) {
    assert.match(developmentWorkspace, new RegExp(`id="${id}"`));
  }
  assert.match(developmentPage + developmentWorkspace, /scroll-mt-24/);
});

test("Agents and Proposals anchors reach the established roster and proposal queue", () => {
  assert.match(developmentWorkspace, /id="agents"[\s\S]*DevelopmentAgentDirectory/);
  assert.match(developmentWorkspace, /id="proposals"[\s\S]*Strategy proposal queue/);
  assert.match(developmentWorkspace, /href="\/dashboard\/admin\/development\/proposals"/);
});

test("Digital Staff reuses all six canonical development identities without adding parallel records", () => {
  assert.equal(developmentAgentProfiles.length, 6);
  assert.match(staffPage, /OwnerDevelopmentStaffDirectory/);
  assert.match(developmentStaff, /developmentAgentProfiles\.map/);
  assert.match(developmentStaff, /deriveDevelopmentAgentCanonicalState/);
  assert.match(developmentStaff, /Development &amp; Operations/);
  assert.match(developmentStaff, /not human employees/);
  assert.doesNotMatch(developmentStaff, /const developmentAgentProfiles|canonicalId:/);
});

test("development staff remains owner-only and operational profiles stay inside BeastAdmin", () => {
  assert.equal(canAccessBeastAdmin({ role: "admin", adminViewMode: "admin" }), true);
  assert.equal(canAccessBeastAdmin({ role: "admin", adminViewMode: "member" }), false);
  assert.equal(canAccessBeastAdmin({ role: "user", adminViewMode: "admin" }), false);
  assert.match(developmentStaff, /canAccessBeastAdmin/);
  assert.match(developmentStaff, /data-development-staff-directory="owner-only"/);
  assert.match(developmentStaff, /\/dashboard\/admin\/development\/agents\/\$\{profile\.id\}/);
  assert.match(developmentStaff, /Detailed package, evidence, execution, and governance records remain inside owner-only BeastAdmin profiles/);
  assert.doesNotMatch(developmentStaff, /evidenceReference|recentActivity|sourceDetail/);
});

test("section navigation and development staff cards preserve responsive horizontal and grid behavior", () => {
  const navigation = readFileSync(
    "src/app/dashboard/admin/development/DevelopmentConsoleSectionNav.tsx",
    "utf8"
  );
  assert.match(navigation, /overflow-x-auto/);
  assert.match(navigation, /shrink-0/);
  assert.match(navigation, /sticky top-3/);
  assert.match(developmentStaff, /md:grid-cols-2 xl:grid-cols-3/);
  assert.match(developmentStaff, /min-w-0/);
});
