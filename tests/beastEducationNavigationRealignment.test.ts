import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  beastLearningNavigation,
  memberBeastEducationNavigation,
} from "../src/lib/moduleNavigation";

const primaryLabels = [
  "Guidance Counselor",
  "Educational Roadmap",
  "Career Planning",
  "Schools",
  "Scholarships",
  "Certifications",
  "Skills",
  "Achievements",
  "Reports",
];

const secondaryLabels = ["Courses", "Tutor", "Lesson History"];

test("BE-204 makes Guidance Counselor architecture the primary navigation", () => {
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

test("BE-204 visually separates supporting learning destinations", () => {
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");

  assert.match(layout, /child\.secondary/);
  assert.match(layout, /Supporting learning/);
});

test("BE-204 has no visible BeastLearning product references", () => {
  const visibleSources = [
    "src/app/dashboard/learning/page.tsx",
    "src/app/dashboard/learning/LearningWorkspaceShell.tsx",
    "src/app/dashboard/learning/LearningWorkspaceView.tsx",
    "src/lib/learning/workspaces.ts",
  ];

  for (const path of visibleSources) {
    assert.doesNotMatch(readFileSync(path, "utf8"), /BeastLearning|Beast Learning/);
  }
});
