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
      "Health Measurements",
      "Health Goals",
      "Health Documents",
      "Providers",
      "Appointments",
      "Timeline",
    ]
  );
  assert.equal(health.children?.[0]?.group, undefined);
  assert.equal(health.children?.[1]?.group, undefined);
  health.children?.slice(2).filter((item) => item.label !== "Health Goals").forEach((item) => {
    assert.equal(item.group, "Health records");
  });
  assert.equal(
    health.children?.find((item) => item.label === "Health Goals")?.group,
    "Planning"
  );
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

test("BH-205 makes Overview a member-led health story", () => {
  const workspace = readFileSync(
    "src/app/dashboard/health/BeastHealthWorkspace.tsx",
    "utf8"
  );

  [
    "Your health today",
    "Recent changes",
    "Upcoming appointments",
    "Your medicines",
    "Suggested questions for providers",
    "Your health story",
    "Possible next steps",
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
    "Your information",
    "Your conditions",
    "Your medicines",
    "Your procedures",
    "Your measurements",
    "Your documents",
    "Your routines",
    "Your family history",
    "Your care team",
    "Your visits",
  ].forEach((label) => assert.match(workspace, new RegExp(label)));

  assert.match(workspace, /data-health-record-purpose=\{kind\}/);
  assert.match(workspace, /presentation\.collectionTitle/);
  assert.match(workspace, /presentation\.emptyGuidance/);
  assert.match(workspace, /Talk with Health Advisor/);
  assert.match(workspace, /ProfessionalKnowledgeWorkspace/);
  assert.match(workspace, /Add it yourself/);
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
