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
  "educational-roadmap",
  "career-planning",
  "schools",
  "scholarships",
  "certifications",
  "skills",
  "tutor",
  "lesson-history",
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
    assert.match(
      definition.emptyAction.href,
      /^\/dashboard\/(?:education|goals\?module=education)/
    );
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
  assert.match(shell, /beast-container space-y-6 sm:space-y-8/);
  assert.match(shell, /beast-page-header/);
  assert.match(shell, /LearningEmptyState/);
  assert.match(shell, /LearningWorkspaceLoading/);
  assert.match(shell, /aria-busy="true"/);
  assert.match(view, /md:grid-cols-2 xl:grid-cols-3/);
  assert.match(view, /break-words/);
  assert.match(error, /role="alert"/);
  assert.match(error, /Try again/);
});

test("BE-201 navigation exposes the consolidated planning anchors", () => {
  const visibleNavigationHrefs = [
    "/dashboard/education#profile",
    "/dashboard/education/education-planning",
    "/dashboard/education/career-planning",
    "/dashboard/education/goals",
    "/dashboard/education/schools",
    "/dashboard/education/certifications",
    "/dashboard/education/scholarships",
    "/dashboard/education/documents",
    "/dashboard/education#outcomes",
  ];
  for (const navigation of [
    beastLearningNavigation,
    memberBeastEducationNavigation,
  ]) {
    const hrefs = navigation.children?.map(({ href }) => href) || [];
    for (const href of visibleNavigationHrefs) {
      assert.ok(hrefs.includes(href));
    }
  }
});

test("Generation 1 preserves legacy source while blocking dormant teaching routes", () => {
  const legacy = readFileSync(
    "src/app/dashboard/learning/[workspace]/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/education/[workspace]/page.tsx",
    "utf8"
  );
  const activities = readFileSync(
    "src/app/dashboard/learning/activities/layout.tsx",
    "utf8"
  );
  assert.match(legacy, /education\/\[workspace\]\/page/);
  assert.match(workspace, /isDormantTeachingWorkspace/);
  assert.match(workspace, /redirect\("\/dashboard\/education"\)/);
  assert.match(activities, /redirect\("\/dashboard\/education"\)/);
});
