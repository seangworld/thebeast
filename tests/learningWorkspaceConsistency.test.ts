import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  learningWorkspaceDefinitions,
  learningWorkspaceSlugs,
} from "../src/lib/learning/workspaces";
import {
  beastLearningNavigation,
  memberBeastEducationNavigation,
} from "../src/lib/moduleNavigation";

const expected = [
  "learning-path",
  "courses",
  "lessons",
  "reviews",
  "achievements",
  "history",
  "certificates",
  "reports",
] as const;

test("BL-403 defines every Learning workspace through one configuration", () => {
  assert.deepEqual(learningWorkspaceSlugs, expected);
  assert.deepEqual(
    Object.keys(learningWorkspaceDefinitions),
    expected
  );
  for (const definition of Object.values(learningWorkspaceDefinitions)) {
    assert.ok(definition.title);
    assert.ok(definition.description);
    assert.ok(definition.emptyTitle);
    assert.match(definition.emptyAction.href, /^\/dashboard\/education/);
  }
});

test("BL-403 uses one responsive shell with consistent loading empty and error states", () => {
  const shell = readFileSync(
    "src/app/dashboard/learning/LearningWorkspaceShell.tsx",
    "utf8"
  );
  const view = readFileSync(
    "src/app/dashboard/learning/LearningWorkspaceView.tsx",
    "utf8"
  );
  const error = readFileSync(
    "src/app/dashboard/education/[workspace]/error.tsx",
    "utf8"
  );

  assert.match(shell, /beast-page/);
  assert.match(shell, /beast-container space-y-8/);
  assert.match(shell, /beast-page-header/);
  assert.match(shell, /LearningEmptyState/);
  assert.match(shell, /LearningWorkspaceLoading/);
  assert.match(shell, /aria-busy="true"/);
  assert.match(view, /md:grid-cols-2 xl:grid-cols-3/);
  assert.match(view, /break-words/);
  assert.match(error, /role="alert"/);
  assert.match(error, /Try again/);
});

test("BL-403 navigation exposes canonical workspaces without hash substitutes", () => {
  for (const navigation of [
    beastLearningNavigation,
    memberBeastEducationNavigation,
  ]) {
    const hrefs = navigation.children?.map(({ href }) => href) || [];
    for (const slug of expected) {
      assert.ok(hrefs.includes(`/dashboard/education/${slug}`));
    }
    assert.ok(hrefs.includes("/dashboard/education/goals"));
  }
});

test("BL-403 preserves legacy Learning routes and sends Activities to Lessons", () => {
  const legacy = readFileSync(
    "src/app/dashboard/learning/[workspace]/page.tsx",
    "utf8"
  );
  const activities = readFileSync(
    "src/app/dashboard/learning/activities/page.tsx",
    "utf8"
  );
  assert.match(legacy, /education\/\[workspace\]\/page/);
  assert.match(activities, /\/dashboard\/education\/lessons/);
});
