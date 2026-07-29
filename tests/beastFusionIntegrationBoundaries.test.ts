import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  beastEducationGeneration,
  dormantTeachingWorkspaces,
  educationTeachingCapabilitiesAvailable,
  generationOneEducationWorkspaces,
  isDormantTeachingWorkspace,
  isGenerationOneEducationWorkspace,
} from "../src/lib/education/generationBoundary";
import {
  digitalProfessionals,
  getDigitalProfessional,
} from "../src/lib/digitalStaff";
import { buildUnifiedSearchItems } from "../src/lib/platform/unifiedSearch";

test("BF-001 exposes only approved Generation 1 BeastEducation workspaces", () => {
  assert.equal(beastEducationGeneration, 1);
  assert.equal(educationTeachingCapabilitiesAvailable, false);
  assert.deepEqual(generationOneEducationWorkspaces, [
    "educational-roadmap",
    "career-planning",
    "schools",
    "scholarships",
    "certifications",
    "skills",
    "reports",
  ]);
  assert.ok(isGenerationOneEducationWorkspace("career-planning"));
  assert.ok(dormantTeachingWorkspaces.every(isDormantTeachingWorkspace));
  assert.equal(isGenerationOneEducationWorkspace("tutor"), false);
});

test("BF-001 blocks questionnaire, teaching workspace, and activity entry routes", () => {
  const files = [
    "src/app/dashboard/onboarding/layout.tsx",
    "src/app/dashboard/education/[workspace]/page.tsx",
    "src/app/dashboard/education/activities/layout.tsx",
    "src/app/dashboard/learning/activities/layout.tsx",
    "src/app/dashboard/learning/goals/layout.tsx",
  ].map((path) => readFileSync(path, "utf8"));

  assert.match(files[0], /education\/guidance-counselor/);
  assert.match(files[1], /isDormantTeachingWorkspace/);
  assert.match(files[1], /redirect\("\/dashboard\/education"\)/);
  assert.ok(files.slice(2, 4).every((source) => /redirect\("\/dashboard\/education"\)/.test(source)));
  assert.match(files[4], /redirect\("\/dashboard\/goals\?module=education"\)/);
});

test("BF-001 keeps internal orchestration out of member Digital Staff surfaces", () => {
  assert.deepEqual(
    digitalProfessionals.map((professional) => professional.canonicalId),
    [
      "beastmoney.money-coach",
      "beasteducation.guidance-counselor",
      "beasthealth.health-advisor",
    ]
  );
  assert.equal(getDigitalProfessional("fusion-director"), undefined);

  const memberSource = [
    readFileSync("src/app/dashboard/digital-staff/page.tsx", "utf8"),
    readFileSync(
      "src/app/dashboard/digital-staff/[professionalId]/page.tsx",
      "utf8"
    ),
  ].join("\n");
  assert.doesNotMatch(
    memberSource,
    /Fusion Director|Release status|Portrait status|placeholder_reference/
  );
});

test("BF-001 does not index dormant lesson records in member search", () => {
  const items = buildUnifiedSearchItems({
    lessons: [
      {
        id: "dormant-lesson",
        title: "Dormant lesson",
        activityType: "Lesson",
        difficulty: "Current",
        status: "Ready",
        updatedAt: "2026-07-29T12:00:00.000Z",
      },
    ],
  });

  assert.deepEqual(items, []);
});

test("BF-001 dashboard access guard does not mutate onboarding state or expose diagnostics", () => {
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");

  assert.doesNotMatch(layout, /onboarding_complete|onboarding repair/);
  assert.doesNotMatch(layout, /userId: authUser\.id|Supabase:|errorDetails/);
  assert.match(layout, /We could not confirm your account access/);
  assert.doesNotMatch(layout, /mentor-session|mentor-plan|label: "Tutor"/);
});
