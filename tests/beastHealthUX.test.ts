import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildApplicationNavigationForPersona } from "../src/lib/moduleNavigation";

test("BP-300 promotes Health Advisor directly below Overview in the shared sidebar", () => {
  const health = buildApplicationNavigationForPersona({ isOwner: true }).find(
    (item) => item.module === "health"
  );

  assert.ok(health);
  assert.deepEqual(
    health.children?.map((item) => item.label),
    [
      "Overview",
      "Health Advisor",
      "Health Profile",
      "Conditions",
      "Medications",
      "Procedures",
      "Family History",
      "Lifestyle",
      "Vitals",
      "Documents",
      "Provider Directory",
      "Appointments",
      "Health Timeline",
    ]
  );
  assert.equal(health.children?.[0]?.group, undefined);
  assert.equal(health.children?.[1]?.group, undefined);
  health.children?.slice(2).forEach((item) => {
    assert.equal(item.group, "Health records");
  });
});

test("BP-300 removes the duplicate BeastHealth horizontal page navigation", () => {
  const shell = readFileSync(
    "src/app/dashboard/health/BeastHealthShell.tsx",
    "utf8"
  );

  assert.doesNotMatch(shell, /aria-label="BeastHealth sections"/);
  assert.doesNotMatch(shell, /beastHealthSections\.map/);
  assert.doesNotMatch(shell, /<nav/);
  assert.match(shell, /beast-container space-y-4/);
});

test("BP-300 makes Overview an advisor-led executive health briefing", () => {
  const workspace = readFileSync(
    "src/app/dashboard/health/BeastHealthWorkspace.tsx",
    "utf8"
  );

  [
    "Executive Health Briefing",
    "Recent changes",
    "Upcoming appointments",
    "Medication summary",
    "Suggested questions for providers",
    "Timeline summary",
    "Recommended actions",
  ].forEach((label) => assert.match(workspace, new RegExp(label)));

  assert.match(workspace, /buildHealthAdvisorModel\(\{ records \}\)/);
  assert.match(workspace, /Open Health Advisor/);
  assert.match(workspace, /No saved update/);
  assert.doesNotMatch(workspace, /MetricTile/);
});

test("BP-300 gives each record workspace purpose-specific presentation", () => {
  const workspace = readFileSync(
    "src/app/dashboard/health/BeastHealthWorkspace.tsx",
    "utf8"
  );

  [
    "Personal health context",
    "Known conditions",
    "Medication organization",
    "Procedure history",
    "Recorded measurements",
    "Medical references",
    "Personal context",
    "Family context",
    "Care contacts",
    "Visit planning",
  ].forEach((label) => assert.match(workspace, new RegExp(label)));

  assert.match(workspace, /data-health-record-purpose=\{kind\}/);
  assert.match(workspace, /presentation\.collectionTitle/);
  assert.match(workspace, /presentation\.emptyGuidance/);
  assert.match(workspace, /Add verified information/);
  assert.match(workspace, /\.from\("beast_health_records"\)/);
  assert.match(workspace, /\.insert\(/);
  assert.match(workspace, /\.update\(/);
});

test("BP-300 preserves explicit medical safety boundaries", () => {
  const overview = readFileSync(
    "src/app/dashboard/health/BeastHealthWorkspace.tsx",
    "utf8"
  );
  const advisor = readFileSync(
    "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
    "utf8"
  );

  assert.match(overview, /never diagnoses or prescribes/);
  assert.match(overview, /qualified clinicians remain authoritative/);
  assert.match(advisor, /never diagnoses or replaces clinicians/);
  assert.match(advisor, /does not check interactions or change medications/);
  assert.match(advisor, /Medical Safety Boundary/);
});
