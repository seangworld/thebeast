import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  educationProfileDraftFromRow,
  educationProfileUpsert,
  normalizeEducationProfileDraft,
} from "../src/lib/education/profilePersistence";

const component = readFileSync(
  "src/app/dashboard/learning/EducationCommandCenter.tsx",
  "utf8"
);
const page = readFileSync("src/app/dashboard/learning/page.tsx", "utf8");
const saveHook = readFileSync(
  "src/lib/platform/useProgressiveSave.ts",
  "utf8"
);
const migration = readFileSync(
  "supabase/migrations/20260724000200_add_education_profiles.sql",
  "utf8"
);

test("BE-215 supports an honest initial blank profile without losing valid zeroes", () => {
  const blank = normalizeEducationProfileDraft(null);
  assert.equal(blank.goal, "");
  assert.deepEqual(blank.answers, {});
  assert.equal(blank.selectedProviders.length > 0, true);
  assert.equal(
    normalizeEducationProfileDraft({ weeklyHours: 0 }).weeklyHours,
    0
  );
});

test("BE-215 explicit save and autosave use one owner-scoped upsert", () => {
  assert.match(component, /useProgressiveSave/);
  assert.match(component, /delayMs: 800/);
  assert.match(component, /Save profile/);
  assert.match(component, /Retry save/);
  assert.match(component, /\.upsert\(educationProfileUpsert\(ownerId, value\), \{ onConflict: "owner_id" \}\)/);
  assert.match(saveHook, /setStatus\("dirty"\)/);
  assert.match(saveHook, /saveNow/);
});

test("BE-215 reload restores every saved value including selections", () => {
  const restored = educationProfileDraftFromRow({
    goal_kind: "certification",
    goal: "Cloud security",
    current_situation: "Working full time",
    background: "Military IT",
    strengths: "Troubleshooting",
    growth_areas: "Networking",
    constraints: "Evenings only",
    weekly_hours: 0,
    discovery_answers: { direction: "Security engineering" },
    selected_providers: ["Microsoft Learn", "Books"],
  });
  assert.equal(restored.goal, "Cloud security");
  assert.equal(restored.weeklyHours, 0);
  assert.deepEqual(restored.answers, { direction: "Security engineering" });
  assert.deepEqual(restored.selectedProviders, ["Microsoft Learn", "Books"]);
  assert.match(page, /educationProfileDraftFromRow/);
  assert.match(page, /initialProfile=\{guidanceDiscoveryProfile\}/);
});

test("BE-215 persistence payload includes all rendered profile fields", () => {
  const value = normalizeEducationProfileDraft({
    goal: "Engineer",
    currentSituation: "",
    weeklyHours: 0,
    answers: {},
    selectedProviders: [],
  });
  const payload = educationProfileUpsert("owner-1", value);
  assert.equal(payload.owner_id, "owner-1");
  assert.equal(payload.current_situation, "");
  assert.equal(payload.weekly_hours, 0);
  assert.deepEqual(payload.discovery_answers, {});
  assert.deepEqual(payload.selected_providers, []);
  for (const field of [
    "goal_kind",
    "goal",
    "current_situation",
    "background",
    "strengths",
    "growth_areas",
    "constraints",
  ]) {
    assert.equal(field in payload, true);
  }
});

test("BE-215 save failure preserves input and provides retry", () => {
  assert.match(component, /Save failed — retry\. Your answers are still visible/);
  assert.match(component, /saveState\.status === "error" \? "Retry save"/);
  assert.match(component, /Your saved answers were not replaced/);
  assert.doesNotMatch(component, /setGoal\(""\)/);
});

test("BE-215 owner isolation and one-current-profile semantics are database enforced", () => {
  assert.match(migration, /owner_id uuid primary key/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /auth\.uid\(\) = owner_id/);
  assert.match(migration, /with check \(auth\.uid\(\) = owner_id\)/);
  assert.match(migration, /created_at timestamptz/);
  assert.match(migration, /updated_at timestamptz/);
});

test("BE-215 hydration cannot overwrite saved data", () => {
  assert.match(component, /enabled: hydrated/);
  assert.match(component, /if \(!hydrated\)/);
  assert.match(component, /Loading your Education Profile/);
  assert.match(saveHook, /if \(!enabled\) return/);
  assert.match(saveHook, /if \(first\.current\)/);
});

test("BE-215 refreshes Guidance Counselor context after save", () => {
  assert.match(component, /router\.refresh\(\)/);
  assert.match(page, /educationProfile\.goal/);
  assert.match(page, /educationProfile\.strengths/);
  assert.match(page, /educationProfile\.currentSituation/);
  assert.match(page, /careerInterests: \[activeLearner\.focus, educationProfile\.goal\]/);
});
