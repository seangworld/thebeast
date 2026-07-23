import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(path, "utf8");
}

test("BL-410 standardizes responsive workspace cards controls and progress semantics", () => {
  const shell = source("src/app/dashboard/learning/LearningWorkspaceShell.tsx");
  const view = source("src/app/dashboard/learning/LearningWorkspaceView.tsx");
  const reports = source("src/app/dashboard/learning/LearningReports.tsx");

  assert.match(shell, /w-full justify-center sm:w-auto/);
  assert.match(view, /motion-safe:hover:-translate-y-0\.5/);
  assert.match(view, /role="progressbar"/);
  assert.match(view, /aria-valuenow/);
  assert.match(view, /motion-reduce:transition-none/);
  assert.match(reports, /sm:w-auto sm:flex-row/);
  assert.match(reports, /motion-safe:hover:shadow/);
});

test("BL-410 makes goals responsive accessible and visually consistent", () => {
  const goals = source(
    "src/app/dashboard/learning/goals/LearningGoalsManager.tsx"
  );

  assert.match(goals, /role="status" aria-live="polite"/);
  assert.match(goals, /aria-label=\{`\$\{goal\.title\} progress`\}/);
  assert.match(goals, /aria-valuemin=\{0\}/);
  assert.match(goals, /w-full justify-center/);
  assert.match(goals, /motion-reduce:transition-none/);
  assert.match(goals, /border-dashed/);
});

test("BL-410 aligns lesson loading reflection and module responsiveness", () => {
  const activity = source(
    "src/app/dashboard/learning/activities/[activityId]/page.tsx"
  );
  const landing = source("src/app/dashboard/learning/page.tsx");

  assert.match(activity, /motion-safe:animate-pulse/);
  assert.match(activity, /Loading your guided learning session/);
  assert.match(activity, /min-h-11/);
  assert.match(activity, /space-y-6 sm:space-y-8/);
  assert.match(landing, /space-y-6 sm:space-y-8/);
  assert.match(landing, /focus-visible:outline-indigo-300/);
  assert.match(landing, /motion-safe:hover:-translate-y-0\.5/);
});
