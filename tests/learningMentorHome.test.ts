import test from "node:test";
import assert from "node:assert/strict";
import { buildMentorHomeMission } from "../src/lib/learning/mentorHome";
import { buildGuidedLearningSession } from "../src/lib/learning/guidedSession";
import {
  buildLearnerReflectionOutcome,
  buildLearnerReflectionStorage,
} from "../src/lib/learning/reflectionEngine";
import { selectMentorTutor } from "../src/lib/learning/tutorOrchestration";
import {
  buildLessonEngineDefinition,
  getLessonEngineProgress,
} from "../src/lib/learning/lessonEngine";
import type { LearningActivityRunnerRow } from "../src/lib/learning/activityRunner";
import type {
  LearningCourse,
  LearningGoal,
  LearningProgressSignals,
  LearningRecommendation,
  LearningSession,
} from "../src/lib/learning/types";

const progressSignals: LearningProgressSignals = {
  activeGoalsCount: 1,
  currentStreakDays: 0,
  sessionsCompleted: 0,
  estimatedWeeklyStudyMinutes: 30,
  progressPercentage: 20,
  readinessScore: 35,
  weakArea: "Subnetting",
  recommendedNextAction: "Review Subnetting.",
  snapshotTiles: [],
};

const activeGoal: LearningGoal = {
  id: "goal-1",
  learnerId: "learner-1",
  title: "Security+ certification",
  category: "Certification",
  target: "Prepare for the exam",
  progress: 20,
  status: "Active",
  priority: "High",
};

const course: LearningCourse = {
  id: "course-1",
  title: "Networking foundations",
  category: "Security",
  progress: 35,
  estimatedCompletion: "Starter path",
  status: "In progress",
  priority: "High",
};

const recommendation: LearningRecommendation = {
  id: "rec-1",
  module: "learning",
  priority: "High",
  severity: "info",
  title: "Review the next topic.",
  summary: "Keep moving.",
  reason: "A current plan exists and has measurable progress.",
  recommendedAction: "Review today's result before picking the next lesson.",
  estimatedBenefit: "Keeps momentum attached to the active learning path.",
  actionUrl: "/dashboard/learning",
  confidence: "reserved",
  dismissible: true,
  completed: false,
};

function buildMission(overrides: {
  goals?: LearningGoal[];
  courses?: LearningCourse[];
  sessions?: LearningSession[];
  activities?: LearningActivityRunnerRow[];
}) {
  return buildMentorHomeMission({
    learnerName: "Sean",
    learningGoals: overrides.goals ?? [activeGoal],
    learningCourses: overrides.courses ?? [course],
    learningSessions: overrides.sessions ?? [],
    learningActivities: overrides.activities ?? [],
    learningRecommendations: [recommendation],
    progressSignals,
  });
}

test("Mentor Home uses first-use state without fabricated history", () => {
  const mission = buildMission({
    goals: [],
    courses: [],
    sessions: [],
    activities: [],
  });

  assert.equal(mission.state, "first_use");
  assert.equal(mission.hasSufficientLearnerData, false);
  assert.equal(mission.currentGoalLabel, "No active goal selected yet");
  assert.match(mission.recommendationReason, /do not have enough learning history/i);
  assert.match(mission.recentProgressLabel, /No prior learning history/i);
});

test("Mentor Home resumes unfinished sessions before new recommendations", () => {
  const mission = buildMission({
    sessions: [
      {
        id: "session-1",
        learnerId: "learner-1",
        title: "CIDR notation practice",
        courseTitle: "Networking foundations",
        when: "Today",
        duration: "20 min",
        status: "In progress",
      },
    ],
  });

  assert.equal(mission.state, "resume");
  assert.equal(mission.missionTitle, "CIDR notation practice");
  assert.equal(mission.durationLabel, "20 min");
  assert.match(mission.recommendationReason, /still in progress/i);
});

test("Mentor Home chooses a ready activity and cites actual saved work", () => {
  const mission = buildMission({
    sessions: [
      {
        id: "session-1",
        learnerId: "learner-1",
        title: "Subnetting warmup",
        courseTitle: "Networking foundations",
        when: "Yesterday",
        duration: "15 min",
        status: "Completed",
      },
    ],
    activities: [
      {
        id: "activity-1",
        activity_type: "Lesson",
        title: "CIDR notation",
        difficulty: "Core",
        estimated_minutes: 18,
        xp: 20,
        status: "Ready",
        created_at: "2026-07-13T12:00:00.000Z",
      },
    ],
  });

  assert.equal(mission.state, "next_activity");
  assert.equal(mission.missionTitle, "CIDR notation");
  assert.equal(mission.durationLabel, "18 minutes");
  assert.equal(mission.primaryAction.href, "/dashboard/learning/activities/activity-1");
  assert.match(mission.recommendationReason, /Subnetting warmup/);
});

test("Mentor Home avoids dead ends when every activity is completed", () => {
  const mission = buildMission({
    activities: [
      {
        id: "activity-1",
        activity_type: "Lesson",
        title: "Completed lesson",
        difficulty: "Core",
        estimated_minutes: 18,
        xp: 20,
        status: "Completed",
        completed_at: "2026-07-13T12:00:00.000Z",
      },
    ],
  });

  assert.equal(mission.state, "completed_queue");
  assert.match(mission.recommendationReason, /not sending you back/i);
  assert.equal(mission.primaryAction.href, "#mentor-plan");
});

test("Mentor selects a certification Tutor from session context", () => {
  const selection = selectMentorTutor({
    activityType: "Lesson",
    activityTitle: "CIDR notation",
    courseTitle: "Security+ networking foundations",
    goalTitle: "Security+ certification",
    weakArea: "subnetting",
  });

  assert.equal(selection.role, "Certification Tutor");
  assert.equal(selection.fallbackUsed, false);
  assert.match(selection.handoff, /Certification Tutor/);
});

test("Mentor Tutor orchestration uses a safe fallback", () => {
  const selection = selectMentorTutor({
    activityType: "Lesson",
    activityTitle: "General learning strategy",
  });

  assert.equal(selection.role, "General Academic Tutor");
  assert.equal(selection.fallbackUsed, true);
});

test("guided learning session builds Mentor intro recap and state", () => {
  const activity: LearningActivityRunnerRow = {
    id: "activity-1",
    activity_type: "Lesson",
    title: "Pre-Algebra: Combining Like Terms",
    difficulty: "Beginner",
    estimated_minutes: 20,
    xp: 20,
    status: "Ready",
  };
  const engine = buildLessonEngineDefinition(activity);
  const quizAnswers = Object.fromEntries(
    engine.lesson.quizQuestions.map((question) => [question.id, question.answer])
  );
  const practiceAnswers = Object.fromEntries(
    engine.lesson.guidedPractice.map((practice) => [
      practice.id,
      practice.expectedAnswer,
    ])
  );
  const progress = getLessonEngineProgress({
    checkedPhases: Object.fromEntries(engine.phases.map((phase) => [phase.id, true])),
    phaseCount: engine.phases.length,
    reflection: "Like terms share the same variable part.",
    confidence: "Ready for more",
    quizAnswers,
    practiceAnswers,
    lesson: engine.lesson,
  });
  const tutorSelection = selectMentorTutor({
    activityType: activity.activity_type,
    activityTitle: activity.title,
    courseTitle: "Pre-Algebra",
    goalTitle: "Build algebra confidence",
  });
  const session = buildGuidedLearningSession({
    activity,
    courseTitle: "Pre-Algebra",
    goalTitle: "Build algebra confidence",
    progress,
    tutorSelection,
    hasDraft: false,
  });

  assert.equal(session.state, "mastery_check_required");
  assert.match(session.mentorIntroduction, /Today we are working on/);
  assert.match(session.goalConnection, /Build algebra confidence/);
  assert.match(session.tutorHandoff, /Math Tutor/);
  assert.match(session.recap.meaning, /ready to continue/);
});

test("reflection outcome changes Mentor recommendations for guessing and frustration", () => {
  const guessed = buildLearnerReflectionOutcome({
    option: "I guessed",
    mastered: true,
    recommendedReview: false,
    nextRecommendation: "Next lesson",
  });
  const frustrated = buildLearnerReflectionOutcome({
    option: "I'm frustrated",
    note: "This felt like too much.",
    mastered: false,
    recommendedReview: true,
    nextRecommendation: "Review",
  });
  const storage = buildLearnerReflectionStorage({
    option: "Hard",
    note: "x".repeat(600),
    mastered: false,
    recommendedReview: true,
    nextRecommendation: "Review",
  });

  assert.equal(guessed.confidenceAdjustment, "lower-confidence");
  assert.match(guessed.recommendationReason, /correctness alone/);
  assert.equal(frustrated.confidenceAdjustment, "reduce-pressure");
  assert.match(frustrated.nextAction, /smaller/);
  assert.equal(storage.reflection_note.length, 500);
});
