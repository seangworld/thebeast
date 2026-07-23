import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { buildLearningReports } from "../src/lib/learning/learningReports";
import {
  beastLearningNavigation,
  memberBeastEducationNavigation,
} from "../src/lib/moduleNavigation";

test("BL-407 builds the complete printable Learning report set from real records", () => {
  const bundle = buildLearningReports({
    asOf: "2026-07-23T12:00:00Z",
    courses: [
      {
        id: "course-1",
        title: "Algebra",
        subject: "Math",
        status: "Completed",
        progress: 100,
        created_at: "2026-07-01T12:00:00Z",
        updated_at: "2026-07-22T12:00:00Z",
      },
    ],
    activities: [
      {
        id: "activity-1",
        activity_type: "lesson",
        title: "Linear equations",
        status: "Completed",
        completed_at: "2026-07-22T12:00:00Z",
      },
    ],
    sessions: [],
    mastery: [
      {
        id: "mastery-1",
        concept_id: "linear-equations",
        mastery_percent: 80,
        confidence: "high",
        updated_at: "2026-07-22T12:00:00Z",
      },
    ],
    achievements: [
      {
        id: "achievement-1",
        title: "Course finisher",
        detail: "Completed Algebra.",
        earned: true,
        earned_at: "2026-07-22T12:00:00Z",
      },
    ],
    certificates: [
      {
        id: "certificate-1",
        path_name: "Algebra",
        certificate_id: "BLC-ALGEBRA",
        completion_date: "2026-07-22",
      },
    ],
    goals: [
      {
        id: "goal-1",
        title: "Finish Algebra",
        target: "Complete the course.",
        status: "Completed",
        progress: 100,
        updated_at: "2026-07-22T12:00:00Z",
      },
    ],
  });

  assert.deepEqual(
    bundle.reports.map((report) => report.kind),
    [
      "progress_summary",
      "course",
      "knowledge",
      "achievement",
      "weekly",
      "monthly",
    ]
  );
  assert.equal(bundle.reports.every((report) => report.printable), true);
  assert.equal(bundle.reports.every((report) => report.sections.length > 0), true);
  assert.match(bundle.disclosure, /not grades, academic credit, accreditation/i);
  assert.equal(
    bundle.reports.find((report) => report.kind === "weekly")?.sections[0].rows[0].value,
    6
  );
});

test("BL-407 reports missing evidence honestly instead of fabricating progress", () => {
  const bundle = buildLearningReports({ asOf: "2026-07-23T12:00:00Z" });
  const knowledge = bundle.reports.find((report) => report.kind === "knowledge");
  const course = bundle.reports.find((report) => report.kind === "course");

  assert.equal(knowledge?.sections[0].rows[0].value, 0);
  assert.equal(knowledge?.sections[1].rows[0].value, "No mastery records available");
  assert.equal(course?.sections[1].rows[0].value, "No course records available");
});

test("BL-407 exposes print export owner scoping responsive layout and navigation", () => {
  const component = readFileSync(
    "src/app/dashboard/learning/LearningReports.tsx",
    "utf8"
  );
  const view = readFileSync(
    "src/app/dashboard/learning/LearningWorkspaceView.tsx",
    "utf8"
  );

  assert.match(component, /window\.print\(\)/);
  assert.match(component, /JSON\.stringify\(bundle/);
  assert.match(component, /beastlearning-reports-/);
  assert.match(component, /xl:grid-cols-2/);
  assert.match(component, /print:break-inside-avoid/);
  assert.match(component, /aria-label="Print Learning Reports"/);
  assert.match(component, /aria-label="Export Learning Reports"/);
  assert.match(view, /\.eq\("user_id", userId\)/);
  for (const navigation of [
    beastLearningNavigation,
    memberBeastEducationNavigation,
  ]) {
    assert.ok(
      navigation.children?.some(
        ({ href }) => href === "/dashboard/education/reports"
      )
    );
  }
});
