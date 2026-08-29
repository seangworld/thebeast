import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { beastEducationAgentManifest } from "../src/lib/education/agentManifest";
import {
  beastEducationGen2ArchitectureRules,
  beastEducationGen2Vision,
} from "../src/lib/education/gen2Vision";

test("BE-201 establishes the Guidance Counselor as the Gen2 primary professional", () => {
  assert.equal(beastEducationGen2Vision.packageId, "BE-201");
  assert.equal(beastEducationGen2Vision.primaryProfessional, "Guidance Counselor");
  assert.equal(
    beastEducationGen2Vision.primaryExperience,
    "Long-term educational guidance and planning"
  );
  assert.deepEqual(
    beastEducationGen2Vision.focus.map((focus) => focus.title),
    [
      "Educational planning",
      "Career exploration",
      "Educational roadmap",
      "School planning",
      "Certification planning",
      "Long-term educational goals",
    ]
  );
  assert.equal(
    beastEducationAgentManifest.agents?.[0]?.metadata?.primaryProfessional,
    "Guidance Counselor"
  );
});

test("BE-302 reconciles the released Tutor while unrelated instructional scope stays on hold", () => {
  assert.deepEqual(
    beastEducationGen2Vision.supportingCapabilities.map(
      ({ id, generation }) => [id, generation]
    ),
    [
      ["courses", "on-hold"],
      ["lessons", "on-hold"],
      ["practice", "on-hold"],
      ["tutor-specialists", "released"],
    ]
  );
  assert.match(beastEducationGen2ArchitectureRules[1], /AI Tutor teaches and reviews schoolwork/);
  assert.match(beastEducationGen2ArchitectureRules[2], /AI Tutor and Homework Helper are released/);
  assert.match(beastEducationGen2ArchitectureRules[3], /Historical teaching records/);
});

test("BE-201 makes the vision visible without removing existing education routes", () => {
  const commandCenter = readFileSync(
    "src/app/dashboard/learning/EducationCommandCenter.tsx",
    "utf8"
  );
  const moduleNavigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");
  const workspaces = readFileSync("src/lib/learning/workspaces.ts", "utf8");

  assert.match(commandCenter, /BE-201 · Gen2 vision/);
  assert.match(commandCenter, /Guidance for the whole educational journey/);
  assert.match(commandCenter, /supportingCapabilities\.map/);
  assert.match(commandCenter, /Start tutoring/);
  assert.doesNotMatch(moduleNavigation, /\/dashboard\/education\/courses/);
  assert.match(moduleNavigation, /\/dashboard\/education\/tutor/);
  assert.match(workspaces, /slug: "lessons"/);
  assert.match(workspaces, /slug: "reviews"/);
});
