import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { HealthRecord } from "../src/lib/health/foundation";
import type { Goal } from "../src/lib/platform/goals";
import {
  buildEducationPlanningContributions,
  buildHealthTodayContributions,
  buildHealthUpcomingEvents,
  getTodayProfessionalLabel,
} from "../src/lib/platform/todayGenerationOne";

const now = "2026-07-29T12:00:00.000Z";

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: "goal-1",
    ownerId: "member-1",
    title: "Earn Security+ certification",
    category: "Education",
    status: "Active",
    summary: "Prepare for a recognized IT credential.",
    currentStep: "Compare certification requirements",
    milestones: [],
    supportItems: [],
    references: [],
    contributions: [],
    recommendations: [],
    lifecycleEvents: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function healthRecord(
  overrides: Partial<HealthRecord>
): HealthRecord {
  return {
    id: "health-1",
    ownerId: "member-1",
    recordType: "appointment",
    title: "Annual physical",
    status: "planned",
    occurredOn: "2026-08-04",
    source: "Primary care office",
    details: {},
    notes: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

test("BO-401 education contributions contain planning evidence only", () => {
  const contributions = buildEducationPlanningContributions({
    goals: [
      goal({}),
      goal({
        id: "goal-lesson",
        title: "Finish eighth grade math lesson",
        currentStep: "Begin lesson",
      }),
      goal({
        id: "goal-money",
        category: "Money",
        title: "Build emergency savings",
      }),
    ],
    today: "2026-07-29",
  });

  assert.equal(contributions.length, 1);
  assert.equal(contributions[0].source, "learning");
  assert.equal(
    contributions[0].actionUrl,
    "/dashboard/education/certifications"
  );
  assert.equal(contributions[0].recommendedAction, "View certification plan");
  assert.deepEqual(contributions[0].sourceEvidenceIds, ["goal:goal-1"]);
  assert.doesNotMatch(
    JSON.stringify(contributions),
    /lesson|tutor|study|grade|teaching|course/i
  );
});

test("BO-401 Health Advisor contributions require saved record evidence", () => {
  const records = [
    healthRecord({}),
    healthRecord({
      id: "medication-1",
      recordType: "medication",
      title: "Saved medication",
      status: "active",
      occurredOn: null,
      source: null,
    }),
  ];
  const contributions = buildHealthTodayContributions({
    records,
    today: "2026-07-29",
  });

  assert.deepEqual(
    contributions.map((item) => item.title),
    ["Verify the saved medication list", "Prepare for Annual physical"]
  );
  assert.ok(
    contributions.every(
      (item) =>
        item.source === "health" &&
        item.sourceEvidenceIds.every((id) => id.startsWith("health-record:"))
    )
  );
  assert.equal(
    buildHealthTodayContributions({ records: [], today: "2026-07-29" }).length,
    0
  );
});

test("BO-401 upcoming health events use only saved future appointments", () => {
  const events = buildHealthUpcomingEvents({
    records: [
      healthRecord({}),
      healthRecord({
        id: "past-appointment",
        title: "Past visit",
        occurredOn: "2026-07-20",
      }),
      healthRecord({
        id: "future-medication",
        recordType: "medication",
        title: "Medication record",
        occurredOn: "2026-08-05",
      }),
    ],
    now: new Date(now),
  });

  assert.equal(events.length, 1);
  assert.equal(events[0].title, "Annual physical");
  assert.equal(events[0].actionUrl, "/dashboard/health/appointments");
});

test("BO-401 Today removes legacy education and internal implementation UI", () => {
  const page = readFileSync("src/app/dashboard/today/page.tsx", "utf8");

  assert.match(page, /buildEducationPlanningContributions/);
  assert.match(page, /buildHealthTodayContributions/);
  assert.match(page, /getTodayProfessionalLabel/);
  assert.match(page, /Education planning/);
  assert.doesNotMatch(
    page,
    /learning_activities|learning_sessions|learning_plans|learning_courses/
  );
  assert.doesNotMatch(
    page,
    /Starter Lesson|Begin Lesson|Continue Lesson|Learning Activity|Study Activity|Tutor|Priority Engine/i
  );
  assert.equal(getTodayProfessionalLabel("learning"), "Guidance Counselor");
  assert.equal(getTodayProfessionalLabel("money"), "Money Coach");
  assert.equal(getTodayProfessionalLabel("health"), "Health Advisor");
});
