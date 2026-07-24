import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getRoadmapCardAction,
  getWorkspaceRecordAction,
  learningAccessActions,
} from "../src/lib/education/contextualActions";
import type { LifelongRoadmapSection } from "../src/lib/education/lifelongRoadmap";

function roadmapSection(
  id: LifelongRoadmapSection["id"],
  status: LifelongRoadmapSection["status"] = "known"
): LifelongRoadmapSection {
  return { id, status, title: id, summary: "Saved context", items: [] };
}

test("BE-219 makes every roadmap section lead to a contextual next action", () => {
  const ids: LifelongRoadmapSection["id"][] = [
    "current-grade",
    "academic-progress",
    "career-interests",
    "possible-careers",
    "required-education",
    "recommended-certifications",
    "high-school-planning",
    "college-planning",
    "alternative-pathways",
  ];

  for (const id of ids) {
    const action = getRoadmapCardAction(roadmapSection(id));
    assert.ok(action.label);
    assert.match(action.href, /^\/dashboard\/education/);
  }
  assert.deepEqual(
    getRoadmapCardAction(roadmapSection("college-planning", "needs-context")),
    {
      label: "Discuss with Counselor",
      href: "/dashboard/education#mentor-session",
    }
  );
});

test("BE-219 gives every supporting learning access card a real route", () => {
  assert.deepEqual(Object.keys(learningAccessActions), [
    "goals",
    "study-plan",
    "courses",
    "flashcards",
    "achievements",
    "certificate-access",
  ]);
  for (const action of Object.values(learningAccessActions)) {
    assert.ok(action.label);
    assert.match(action.href, /^\/dashboard\/education/);
  }
});

test("BE-219 contextualizes goal certification course and weak-area actions", () => {
  const page = readFileSync("src/app/dashboard/learning/page.tsx", "utf8");
  const mission = readFileSync(
    "src/app/dashboard/learning/LearningMissionControl.tsx",
    "utf8"
  );
  const workspaces = readFileSync(
    "src/app/dashboard/learning/LearningWorkspaceView.tsx",
    "utf8"
  );

  assert.match(workspaces, /Open goal/);
  assert.equal(getWorkspaceRecordAction("certifications").label, "View plan");
  assert.match(mission, /Resume/);
  assert.match(page, /Review weak areas/);
  assert.match(page, /Discuss next step/);
});

test("BE-219 retains existing contextual recommendation and lifecycle actions", () => {
  const recommendation = readFileSync(
    "src/app/dashboard/learning/GuidanceCounselorRecommendation.tsx",
    "utf8"
  );
  const course = readFileSync(
    "src/app/dashboard/learning/CourseLifecycleCard.tsx",
    "utf8"
  );

  assert.match(recommendation, /nextAction\.actionLabel/);
  assert.match(recommendation, /assignment\.actionLabel/);
  assert.match(course, /CourseLifecycleManager/);
});
