import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  canonicalEvidenceHref,
  canonicalProjectionAgeHours,
  canonicalStatusLabel,
} from "../src/lib/beastAdminCommandCenter";

const roadmap = readFileSync(
  "src/app/dashboard/admin/roadmap/BeastAdminRoadmapWorkspace.tsx",
  "utf8"
);
const roadmapIntake = readFileSync(
  "src/app/dashboard/admin/roadmap/BeastAdminRoadmapIntakeWorkspace.tsx",
  "utf8"
);
const releases = readFileSync(
  "src/app/dashboard/admin/releases/BeastAdminReleaseCenterWorkspace.tsx",
  "utf8"
);
const releaseNotes = readFileSync(
  "src/app/dashboard/admin/releases/BeastAdminReleaseNotesWorkspace.tsx",
  "utf8"
);
const development = readFileSync(
  "src/app/dashboard/admin/development/BeastAdminDevelopmentConsoleWorkspace.tsx",
  "utf8"
);
const developmentRoute = readFileSync(
  "src/app/api/admin/development-console/route.ts",
  "utf8"
);
const projectionRoute = readFileSync(
  "src/app/api/admin/beastfusion-projection/route.ts",
  "utf8"
);

test("BA-CMD-001E cuts authority-looking roadmap and release surfaces over to one canonical source", () => {
  for (const source of [roadmap, releases, development]) {
    assert.match(source, /useBeastAdminCommandCenter/);
  }
  assert.doesNotMatch(roadmap, /beast_admin_roadmap_items|\.insert\(|\.update\(|\.delete\(/);
  assert.doesNotMatch(
    releases,
    /get_beast_admin_release_records|save_beast_admin_release_record|\.insert\(|\.update\(|\.delete\(/
  );
  assert.doesNotMatch(
    developmentRoute,
    /beast_admin_roadmap_items|get_beast_admin_release_records/
  );
  assert.match(developmentRoute, /loadBeastFusionCanonicalReadModel/);
  assert.match(developmentRoute, /legacy roadmap and release records were not used as a fallback/);
});

test("BA-CMD-001E preserves editable inputs only as explicit non-canonical intake and annotations", () => {
  assert.match(roadmapIntake, /Non-canonical boundary/);
  assert.match(roadmapIntake, /governance_classification: "intake"/);
  assert.match(roadmapIntake, /execution_status: "candidate_intake"/);
  assert.match(roadmapIntake, /is_next_build: false/);
  assert.match(releaseNotes, /Non-canonical boundary/);
  assert.match(releaseNotes, /do not validate, release, deploy, or override/);
  assert.match(roadmap, /Candidate intake and annotations/);
  assert.match(releases, /Operational annotations/);
});

test("BA-CMD-001E renders every parity-remediation development capability without changing member execution history", () => {
  for (const expected of [
    "Projection identity and freshness",
    "Package progress",
    "Blocked work",
    "Waiting work",
    "Canonical next five",
    "Package and roadmap dependency view",
    "Development History",
    "Digital Professional Execution History remains a separate",
    "Registry, BeastShield, and agent policy",
    "Validation health",
    "Canonical record drill-down",
  ]) {
    assert.match(development, new RegExp(expected));
  }
  assert.doesNotMatch(development, /localStorage|git push|git commit|child_process/);
});

test("BA-CMD-001E command-center APIs apply private no-store on every response helper", () => {
  for (const route of [developmentRoute, projectionRoute]) {
    assert.match(route, /private, no-cache, no-store, must-revalidate/);
    assert.match(route, /function json\(body: unknown, status = 200\)/);
    assert.match(route, /NextResponse\.json\(body, \{ status, headers: privateHeaders \}\)/);
  }
});

test("canonical evidence drill-down accepts only exact allowlisted BeastFusion references", () => {
  const sourceCommit = "a".repeat(40);
  assert.equal(
    canonicalEvidenceHref("commit:" + "b".repeat(40), sourceCommit),
    "https://github.com/seangworld/beastfusion/commit/" + "b".repeat(40)
  );
  assert.equal(
    canonicalEvidenceHref("roadmaps/active/BeastFusion.md", sourceCommit),
    "https://github.com/seangworld/beastfusion/blob/" + sourceCommit + "/roadmaps/active/BeastFusion.md"
  );
  assert.equal(
    canonicalEvidenceHref("state/ecosystem-execution-state.json", sourceCommit),
    "https://github.com/seangworld/beastfusion/blob/" + sourceCommit + "/state/ecosystem-execution-state.json"
  );
  assert.equal(canonicalEvidenceHref("../private-key.pem", sourceCommit), null);
  assert.equal(canonicalEvidenceHref("https://attacker.example/item", sourceCommit), null);
  assert.equal(canonicalEvidenceHref("docs/audit.md", "short-sha"), null);
});

test("canonical presentation helpers preserve status meaning and freshness without inventing state", () => {
  assert.equal(canonicalStatusLabel("owner_strategy_review"), "Owner Strategy Review");
  assert.equal(
    canonicalProjectionAgeHours(
      "2026-08-22T12:00:00.000Z",
      Date.parse("2026-08-22T15:00:00.000Z")
    ),
    3
  );
  assert.equal(canonicalProjectionAgeHours(null), null);
});
