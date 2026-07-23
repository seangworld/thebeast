import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildLearningChronology } from "../src/lib/learning/learningChronology";

test("BL-406 builds one newest-first chronology from every required learning record", () => {
  const events = buildLearningChronology({
    history: [
      {
        id: "history-1",
        event_type: "review_completed",
        title: "Fractions review",
        summary: "Review evidence was saved.",
        occurred_at: "2026-07-15T09:00:00Z",
      },
    ],
    activities: [
      {
        id: "lesson-1",
        activity_type: "lesson",
        title: "Linear equations",
        status: "Completed",
        session_recap: "Solved five equations accurately.",
        completed_at: "2026-07-16T09:00:00Z",
      },
    ],
    sessions: [],
    courses: [
      {
        id: "course-started",
        title: "Algebra",
        subject: "Math",
        status: "Active",
        progress: 20,
        created_at: "2026-07-10T09:00:00Z",
      },
      {
        id: "course-finished",
        title: "Fractions",
        subject: "Math",
        status: "Completed",
        progress: 100,
        created_at: "2026-06-01T09:00:00Z",
        updated_at: "2026-07-18T09:00:00Z",
      },
    ],
    achievements: [
      {
        id: "achievement-1",
        title: "Five lessons",
        detail: "Completed five lessons.",
        earned: true,
        earned_at: "2026-07-17T09:00:00Z",
      },
    ],
    mastery: [
      {
        id: "mastery-1",
        concept_id: "one-variable-equations",
        mastery_percent: 80,
        confidence: "high",
        updated_at: "2026-07-19T09:00:00Z",
      },
    ],
    certificates: [
      {
        id: "certificate-1",
        path_name: "Math Foundations",
        certificate_id: "BLC-MATH",
        completion_date: "2026-07-20",
      },
    ],
    goals: [
      {
        id: "goal-1",
        title: "Complete Math Foundations",
        target: "Finish the foundation mission.",
        status: "Completed",
        updated_at: "2026-07-21T09:00:00Z",
      },
    ],
  });

  assert.deepEqual(
    new Set(events.map((event) => event.type)),
    new Set([
      "lesson_completed",
      "course_started",
      "course_finished",
      "achievement",
      "review",
      "knowledge_milestone",
      "certificate",
      "mission_completed",
    ])
  );
  assert.equal(events[0]?.type, "mission_completed");
  assert.equal(events.at(-1)?.type, "course_started");
  assert.equal(
    events.every(
      (event, index) =>
        index === 0 ||
        new Date(events[index - 1].occurredAt).getTime() >=
          new Date(event.occurredAt).getTime()
    ),
    true
  );
});

test("BL-406 omits unsupported records and deduplicates canonical history overlap", () => {
  const events = buildLearningChronology({
    history: [
      {
        id: "canonical",
        event_type: "lesson_completed",
        title: "Percentages",
        summary: "Canonical event.",
        occurred_at: "2026-07-20T09:00:00Z",
      },
    ],
    activities: [
      {
        id: "derived",
        activity_type: "lesson",
        title: "Percentages",
        status: "Completed",
        completed_at: "2026-07-20T14:00:00Z",
      },
      {
        id: "unfinished",
        activity_type: "lesson",
        title: "Not complete",
        status: "Ready",
        created_at: "2026-07-21T09:00:00Z",
      },
    ],
    achievements: [
      {
        id: "locked",
        title: "Not earned",
        earned: false,
        created_at: "2026-07-21T09:00:00Z",
      },
    ],
  });

  assert.equal(events.length, 1);
  assert.equal(events[0]?.detail, "Canonical event.");
});

test("BL-406 History workspace renders an accessible responsive timeline from owner-scoped records", () => {
  const source = readFileSync(
    join(process.cwd(), "src/app/dashboard/learning/LearningWorkspaceView.tsx"),
    "utf8"
  );

  for (const table of [
    "learning_history",
    "learning_activities",
    "learning_sessions",
    "learning_courses",
    "learning_achievements",
    "learning_mastery",
    "learning_certificates",
    "learning_goals",
  ]) {
    assert.equal(source.includes(`from("${table}")`), true);
  }
  assert.equal(source.includes('.eq("user_id", userId)'), true);
  assert.equal(source.includes('aria-label="Chronological learning history"'), true);
  assert.equal(source.includes("<time"), true);
  assert.equal(source.includes("LearningTimeline events={timeline}"), true);
});
