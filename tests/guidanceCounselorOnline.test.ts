import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildGuidanceCounselorOnlineModel,
  type GuidanceCounselorOnlineInput,
} from "../src/lib/guidanceCounselorOnline";
import type { ProfessionalExecutionHistory } from "../src/lib/platform/agents";

function input(
  activities: GuidanceCounselorOnlineInput["activities"] = []
): GuidanceCounselorOnlineInput {
  return {
    mission: {
      missionTitle: "Continue Security+ foundations",
      recommendationReason: "The saved path has an active learning step.",
      currentGoalLabel: "Security+",
      recentProgressLabel: "One session completed",
      primaryAction: {
        label: "Continue learning",
        href: "/dashboard/education/tutor",
      },
    },
    confidence: {
      missingData: false,
      dimensions: [{
        id: "networking",
        label: "Networking",
        level: "developing",
        learnerLanguage: "Networking evidence is still developing.",
      }],
    },
    goals: [{
      id: "goal-1",
      learnerId: "member-1",
      title: "Security+",
      category: "Certification",
      target: "Prepare for the exam",
      progress: 40,
      status: "Active",
      priority: "High",
    }],
    plan: {
      id: "plan-1",
      learnerId: "member-1",
      title: "Security+ readiness path",
      summary: "Build foundations before practice exams.",
      primaryGoalId: "goal-1",
      currentCourseId: "course-1",
      weeklySessionTarget: 4,
    },
    workflow: {
      action: "tutor",
      eyebrow: "From your Guidance Counselor",
      title: "Bring in Tutor for the next learning step",
      introduction: "The learning objective is ready.",
      why: "A specific active course is ready for instruction.",
      outcome: "Tutor returns evidence for the next planning decision.",
      actionLabel: "Continue with Tutor",
      href: "/dashboard/education/tutor",
    },
    roadmap: {
      sections: [
        {
          id: "career-interests",
          title: "Career interests",
          status: "needs-context",
          items: ["Verify cybersecurity role fit"],
        },
        {
          id: "required-education",
          title: "Required education",
          status: "needs-context",
          items: ["Verify current credential requirements"],
        },
      ],
    },
    learningRecommendations: [{
      id: "recommendation-1",
      title: "Review networking foundations",
      reason: "Completed work indicates this is the next useful review.",
      recommendedAction: "Review the saved weak concept",
      estimatedBenefit: "Improve readiness for the next session",
      actionUrl: "/dashboard/education/reviews",
    }],
    activities,
    courses: [{
      id: "course-1",
      goalId: "goal-1",
      title: "Security+ Foundations",
      category: "Cybersecurity",
      progress: 40,
      estimatedCompletion: "6 weeks",
      status: "In progress",
      priority: "High",
    }],
    sessions: [],
  } as unknown as GuidanceCounselorOnlineInput;
}

test("Guidance Counselor does not invent a placement diagnostic", () => {
  const model = buildGuidanceCounselorOnlineModel(input());
  assert.equal(model.diagnostics.status, "not-recorded");
  assert.match(model.diagnostics.summary, /No saved placement diagnostic/);
  assert.ok(model.diagnostics.limitations.some((item) =>
    item.includes("not a placement diagnostic")
  ));
});

test("completed learning evidence informs diagnostics without replacing diagnostics", () => {
  const model = buildGuidanceCounselorOnlineModel(input([{
    id: "activity-1",
    title: "Networking review",
    status: "Completed",
    activity_type: "Review",
    session_strengths: ["subnetting"],
    session_weak_concepts: ["routing tables"],
  } as GuidanceCounselorOnlineInput["activities"][number]]));
  assert.equal(model.diagnostics.status, "available");
  assert.ok(model.diagnostics.evidence.some((item) => item.includes("subnetting")));
  assert.ok(model.diagnostics.evidence.some((item) => item.includes("routing tables")));
});

test("Guidance Counselor hands a defined objective to Tutor without duplicating Tutor", () => {
  const model = buildGuidanceCounselorOnlineModel(input());
  assert.equal(model.tutorHandoff.href, "/dashboard/education/tutor");
  assert.match(model.tutorHandoff.boundary, /Tutor teaches the specific concept/);
  assert.match(model.tutorHandoff.boundary, /does not own the long-term plan/);
});

test("recommendation lifecycle and outcome learning come only from durable history", () => {
  const history: ProfessionalExecutionHistory = {
    requests: [],
    recommendations: [{
      id: "recommendation-history-1",
      ownerId: "member-1",
      requestId: "request-1",
      professionalId: "beasteducation.guidance-counselor",
      title: "Review networking foundations",
      recommendation: "Review the saved weak concept.",
      status: "completed",
      confidence: { label: "medium", score: 70 },
      limitations: [],
      supportingEvidence: [{ sourceRecommendationId: "recommendation-1" }],
      createdAt: "2026-07-28T12:00:00.000Z",
      updatedAt: "2026-07-28T12:00:00.000Z",
    }],
    outcomes: [{
      id: "outcome-1",
      requestId: "request-1",
      outcomeStatus: "successful",
      expectedResult: {},
      actualResult: { source: "member_report" },
      memberLearning: ["Member reported that this guidance helped."],
      limitations: ["Member-reported."],
      supportingEvidence: [],
      observedAt: "2026-07-28T12:00:00.000Z",
      recordedAt: "2026-07-28T12:00:00.000Z",
    }],
  };
  const model = buildGuidanceCounselorOnlineModel(input(), history);
  assert.equal(
    model.recommendations.find(
      (item) => item.sourceRecommendationId === "recommendation-1"
    )?.lifecycle?.status,
    "completed"
  );
  assert.deepEqual(model.outcomeLearning[0]?.learning, [
    "Member reported that this guidance helped.",
  ]);
  assert.equal(buildGuidanceCounselorOnlineModel(input()).outcomeLearning.length, 0);
});

test("online workspace exposes the requested sections and immutable history integration", () => {
  const source = readFileSync(
    "src/app/dashboard/learning/GuidanceCounselorOnline.tsx",
    "utf8"
  );
  for (const heading of [
    "Learning Briefing",
    "Goal Planning",
    "Learning Priorities",
    "Career Guidance",
    "Tutor Handoff",
    "Notifications",
    "Outcome Learning",
  ]) {
    assert.match(source, new RegExp(heading));
  }
  assert.match(source, /SupabaseExecutionHistoryStore/);
  assert.match(source, /recordDecision/);
  assert.match(source, /recordResultAndOutcome/);
  assert.doesNotMatch(source, /lessonContent|teachingResponse|TutorConversation/);
});
