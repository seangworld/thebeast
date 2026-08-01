import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildApplicationNavigationForPersona } from "../src/lib/moduleNavigation";
import { healthWorkspaceDefinitions } from "../src/lib/health/foundation";

const read = (path: string) => readFileSync(path, "utf8");

test("BH-205 gives BeastHealth pages a reusable plain-language introduction", () => {
  const introduction = read(
    "src/app/dashboard/health/HealthPageIntroduction.tsx"
  );
  const shell = read("src/app/dashboard/health/BeastHealthShell.tsx");

  for (const label of [
    "Why this helps",
    "How Beast uses it",
    "What to do next",
  ]) {
    assert.match(introduction, new RegExp(label));
  }
  assert.match(shell, /HealthPageIntroduction/);
  assert.match(shell, /why=\{why\}/);
  assert.match(shell, /how=\{how\}/);
  assert.match(shell, /next=\{next\}/);
});

test("BH-205 uses everyday explanations for every health record area", () => {
  assert.match(
    healthWorkspaceDefinitions.profile.description,
    /helps Beast understand your health/
  );
  assert.match(
    healthWorkspaceDefinitions.condition.description,
    /health conditions you have now or had in the past/
  );
  assert.match(
    healthWorkspaceDefinitions.medication.description,
    /medicines you take/
  );
  assert.match(
    healthWorkspaceDefinitions.provider.description,
    /doctors and specialists/
  );
  assert.match(
    healthWorkspaceDefinitions.document.description,
    /visit summaries, lab reports, or vaccination records/
  );

  for (const definition of Object.values(healthWorkspaceDefinitions)) {
    assert.ok(definition.why.length > 20, definition.kind);
    assert.ok(definition.how.length > 20, definition.kind);
    assert.ok(definition.nextStep.length > 20, definition.kind);
  }
});

test("BH-205 keeps Health Advisor separate while preserving the understanding model", () => {
  const workspace = read(
    "src/app/dashboard/health/BeastHealthWorkspace.tsx"
  );

  assert.match(workspace, /label: "Talk with Health Advisor"/);
  assert.doesNotMatch(workspace, /health-advisor-\$\{kind\}-conversation/);
  assert.match(workspace, /ProfessionalKnowledgeWorkspace/);
  assert.match(workspace, /known,/);
  assert.match(workspace, /thinking,/);
  assert.match(workspace, /needed,/);
  assert.match(workspace, /View record/);
  assert.match(workspace, /Edit this record/);
});

test("BH-205 onboarding stays gradual, skippable, resumable, and responsive", () => {
  const onboarding = read(
    "src/app/dashboard/health/HealthDiscoveryOnboarding.tsx"
  );

  assert.match(onboarding, /One question for now/);
  assert.match(onboarding, /Skip for now/);
  assert.match(onboarding, /Choose another area/);
  assert.match(onboarding, /last_topic, skipped_topics/);
  assert.match(onboarding, /role="progressbar"/);
  assert.match(onboarding, /sm:grid-cols-2/);
  assert.doesNotMatch(onboarding, /<form/);
});

test("BH-205 navigation names are understandable without changing routes", () => {
  const health = buildApplicationNavigationForPersona({ isOwner: true }).find(
    (item) => item.module === "health"
  );
  const labels = health?.children?.map((item) => item.label) || [];

  assert.ok(labels.includes("Health Measurements"));
  assert.ok(labels.includes("Providers"));
  assert.ok(labels.includes("Timeline"));
  assert.ok(!labels.includes("Vitals"));
  assert.ok(!labels.includes("Provider Directory"));
  assert.equal(
    health?.children?.find((item) => item.label === "Providers")?.href,
    "/dashboard/health/provider-directory"
  );
});

test("BH-205 preserves the existing health record and safety boundaries", () => {
  const workspace = read(
    "src/app/dashboard/health/BeastHealthWorkspace.tsx"
  );
  const foundation = read("src/lib/health/foundation.ts");

  assert.match(workspace, /\.from\("beast_health_records"\)/);
  assert.match(workspace, /\.eq\("owner_id", ownerId\)/);
  assert.match(workspace, /never diagnoses or prescribes/);
  assert.match(foundation, /does not check interactions/);
  assert.doesNotMatch(workspace, /create table|alter table|create policy/i);
});
