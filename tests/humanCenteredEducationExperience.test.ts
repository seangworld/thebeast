import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  beastLearningNavigation,
  memberBeastEducationNavigation,
} from "../src/lib/moduleNavigation";

const read = (path: string) => readFileSync(path, "utf8");

test("BE-202 gives every core planning page a plain-language introduction", () => {
  const introduction = read(
    "src/app/dashboard/education/EducationPageIntroduction.tsx"
  );
  const pages = [
    "src/app/dashboard/education/about-you/page.tsx",
    "src/app/dashboard/education/education-planning/page.tsx",
    "src/app/dashboard/education/career-planning/page.tsx",
    "src/app/dashboard/education/progress/page.tsx",
  ].map(read);

  for (const label of [
    "Why this helps",
    "How Beast uses it",
    "What to do next",
  ]) {
    assert.match(introduction, new RegExp(label));
  }
  for (const page of pages) {
    assert.match(page, /EducationPageIntroduction/);
  }
  assert.match(pages[0], /The more we know about you/);
  assert.match(pages[1], /We'll build the education plan/);
  assert.match(pages[2], /We'll compare careers that fit you/);
});

test("BE-202 navigation uses understandable planning names", () => {
  const expected = [
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

  for (const navigation of [
    beastLearningNavigation,
    memberBeastEducationNavigation,
  ]) {
    assert.deepEqual(
      navigation.children?.map((item) => item.label),
      expected
    );
    assert.ok(navigation.children?.some((item) => item.label === "Homework Helper / AI Tutor"));
    assert.ok(navigation.children?.every((item) => !/Lesson|Course|Teaching/.test(item.label)));
  }
});

test("BE-202 keeps the dashboard focused on one recommendation and clear next areas", () => {
  const dashboard = read(
    "src/app/dashboard/learning/BeastEducationExperience.tsx"
  );

  assert.equal(
    (dashboard.match(/<RecommendationCard recommendation=\{recommendation\}/g) || [])
      .length,
    1
  );
  assert.doesNotMatch(dashboard, /<EducationCareerWorkspace/);
  assert.match(dashboard, /Three simple places to keep moving/);
  assert.match(dashboard, /md:grid-cols-3/);
  assert.doesNotMatch(
    dashboard,
    /Executive Education Briefing|Current Career Path|Upcoming Milestones|Planning readiness/
  );
});

test("BE-202 preserves the existing planning records while simplifying their presentation", () => {
  const workspace = read(
    "src/app/dashboard/learning/EducationCareerWorkspace.tsx"
  );

  for (const table of [
    "education_career_profile_items",
    "education_career_paths",
    "education_career_roadmaps",
    "education_career_roadmap_steps",
    "education_career_outcomes",
  ]) {
    assert.match(workspace, new RegExp(table));
  }
  assert.match(workspace, /About You/);
  assert.match(workspace, /Career Options/);
  assert.match(workspace, /Your Education Plan/);
  assert.match(workspace, /Your Progress/);
  assert.doesNotMatch(
    workspace,
    /Paths & Gap Analysis|Candidate Path|Decision & Outcome History/
  );
});

test("BE-202 explains contextual Education Goals and Documents without internal jargon", () => {
  const goals = read("src/app/dashboard/goals/page.tsx");
  const documents = read("src/app/dashboard/uploads/page.tsx");

  assert.match(goals, /These are the education goals you're working toward/);
  assert.match(goals, /Your Guidance Counselor uses these goals/);
  assert.match(
    documents,
    /Upload things like transcripts, resumes, certificates, or military records/
  );
  assert.match(documents, /help your Guidance Counselor understand/);
});
