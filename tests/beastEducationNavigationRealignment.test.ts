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
  "Educational Roadmap",
  "Career Planning",
  "Schools",
  "Scholarships",
  "Certifications",
  "Skills",
  "Reports",
];

const secondaryLabels: string[] = [];

test("BP-400 preserves the Guidance Counselor architecture in the approved workspace navigation", () => {
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

test("BP-400 hides supporting teaching destinations without deleting their routes", () => {
  const routeDefinitions = readFileSync("src/lib/learning/workspaces.ts", "utf8");
  assert.match(routeDefinitions, /tutor:/);
  assert.match(routeDefinitions, /"lesson-history":/);
  assert.ok(
    beastLearningNavigation.children?.every((item) => !item.secondary)
  );
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
