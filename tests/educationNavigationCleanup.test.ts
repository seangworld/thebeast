import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync(
  "src/app/dashboard/learning/LearningWorkspaceShell.tsx",
  "utf8"
);
const errorState = readFileSync(
  "src/app/dashboard/education/[workspace]/error.tsx",
  "utf8"
);
const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");
const activityRunner = readFileSync(
  "src/app/dashboard/learning/activities/[activityId]/page.tsx",
  "utf8"
);

test("BE-211 removes duplicated Mission Control returns from workspace chrome", () => {
  assert.doesNotMatch(shell, /Back to Learning Mission Control/);
  assert.doesNotMatch(errorState, /Back to Learning Mission Control/);
  assert.doesNotMatch(errorState, /href="\/dashboard\/education"/);
});

test("BE-211 keeps every workspace reachable through persistent navigation", () => {
  for (const destination of [
    "Guidance Counselor",
    "Educational Roadmap",
    "Career Planning",
    "Schools",
    "Scholarships",
    "Certifications",
    "Skills",
    "Achievements",
    "Reports",
    "Courses",
    "Tutor",
    "Lesson History",
  ]) {
    assert.match(navigation, new RegExp(`label: "${destination}"`));
  }
});

test("BE-211 preserves contextual returns that close an activity workflow", () => {
  assert.match(activityRunner, /Back to Guidance Counselor/);
  assert.match(
    activityRunner,
    /href="\/dashboard\/education#mentor-session"/
  );
});

test("BE-211 preserves workspace actions and retry behavior", () => {
  assert.match(shell, /actions \?/);
  assert.match(shell, /\{actions\}/);
  assert.match(errorState, /onClick=\{reset\}/);
  assert.match(errorState, /Try again/);
});
