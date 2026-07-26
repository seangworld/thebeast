import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminPromptRuntimeAdoptionLabels,
  getBeastAdminPromptDependency,
  hasBeastAdminPromptRuntimeConsumers,
} from "../src/lib/beastAdminPromptDependencies";

test("BA-127 documents Money Coach impact without claiming runtime adoption", () => {
  const dependency = getBeastAdminPromptDependency("money.coach.system");

  assert.equal(dependency.runtimeAdoption, "not_adopted");
  assert.equal(hasBeastAdminPromptRuntimeConsumers(dependency), false);
  assert.deepEqual(dependency.consumingModules, []);
  assert.deepEqual(dependency.consumingProfessionals, []);
  assert.deepEqual(dependency.consumingComponents, []);
  assert.deepEqual(dependency.adoptionTargetPath, [
    "money.coach.system",
    "Money Coach",
    "BeastMoney",
    "Daily Advisor",
    "Conversation",
    "Insights",
  ]);
  assert.match(dependency.fallbackBehavior, /code-owned prompt/);
});

test("BA-127 documents Guidance Counselor impact and code-owned fallback", () => {
  const dependency = getBeastAdminPromptDependency(
    "education.guidance.system"
  );

  assert.equal(dependency.runtimeAdoption, "not_adopted");
  assert.deepEqual(dependency.adoptionTargetPath, [
    "education.guidance.system",
    "Guidance Counselor",
    "BeastEducation",
    "Professional Intake",
    "Conversation",
    "Roadmap",
  ]);
  assert.match(dependency.fallbackBehavior, /explicit adoption change/);
});

test("BA-127 fails unknown prompt adoption closed", () => {
  const dependency = getBeastAdminPromptDependency(
    "future.professional.system"
  );

  assert.equal(dependency.runtimeAdoption, "undocumented");
  assert.equal(hasBeastAdminPromptRuntimeConsumers(dependency), false);
  assert.deepEqual(dependency.adoptionTargetPath, []);
  assert.match(dependency.adoptionDetail, /No reviewed runtime dependency/);
  assert.match(
    dependency.fallbackBehavior,
    /does not change runtime behavior/
  );
  assert.equal(
    beastAdminPromptRuntimeAdoptionLabels.undocumented,
    "Not documented"
  );
});

test("BA-127 renders a read-only dependency explorer for every managed prompt", () => {
  const workspace = readFileSync(
    "src/app/dashboard/admin/prompts/BeastAdminPromptLibraryWorkspace.tsx",
    "utf8"
  );

  for (const label of [
    "Dependency Explorer",
    "Prompt key",
    "Current released version",
    "Runtime adoption",
    "Consuming modules",
    "Consuming professionals",
    "Runtime components",
    "Fallback behavior",
    "Released",
    "Draft",
    "Review",
    "Archived",
  ]) {
    assert.match(workspace, new RegExp(label));
  }

  assert.match(workspace, /visibleAssets\.map/);
  assert.match(workspace, /getBeastAdminPromptDependency/);
  assert.match(workspace, /Documented adoption target/);
  assert.match(workspace, /possible impact, not active consumption/);
  assert.match(workspace, /Releasing a version does not adopt it at runtime/);
});
