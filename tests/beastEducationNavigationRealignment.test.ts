import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  beastLearningNavigation,
  memberBeastEducationNavigation,
} from "../src/lib/moduleNavigation";

const primaryLabels = [
  "Dashboard",
  "Guidance Counselor",
  "Homework Helper / AI Tutor",
  "About You",
  "Education Planning",
  "Career Planning",
  "Education Goals",
  "Schools",
  "Certifications",
  "Scholarships",
  "Education Documents",
  "Progress & Decisions",
];

const secondaryLabels: string[] = [];

test("BE-201 preserves the Guidance Counselor architecture in Education and Career navigation", () => {
  for (const navigation of [
    beastLearningNavigation,
    memberBeastEducationNavigation,
  ]) {
    assert.equal(navigation.label, "BeastEducation");
    const children = navigation.children || [];
    assert.deepEqual(
      children.filter((item) => !item.secondary).map((item) => item.label),
      primaryLabels
    );
    assert.deepEqual(
      children.filter((item) => item.secondary).map((item) => item.label),
      secondaryLabels
    );
  }
});

test("BE-301 releases Tutor without reopening unrelated teaching destinations", () => {
  const routeDefinitions = readFileSync("src/lib/learning/workspaces.ts", "utf8");
  assert.match(routeDefinitions, /tutor:/);
  assert.match(routeDefinitions, /"lesson-history":/);
  assert.ok(
    beastLearningNavigation.children?.every((item) => !item.secondary)
  );
  assert.ok(beastLearningNavigation.children?.some((item) => item.href === "/dashboard/education/tutor"));
});

test("BE-204 has no visible BeastLearning product references", () => {
  const visibleSources = [
    "src/app/dashboard/learning/page.tsx",
    "src/app/dashboard/learning/BeastEducationExperience.tsx",
    "src/app/dashboard/learning/LearningWorkspaceShell.tsx",
    "src/app/dashboard/learning/LearningWorkspaceView.tsx",
    "src/lib/learning/workspaces.ts",
  ];

  for (const path of visibleSources) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /BeastLearning|Beast Learning/);
  }
});
