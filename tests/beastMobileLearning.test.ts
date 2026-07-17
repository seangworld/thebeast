import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildMobileLearningQuickActionCards } from "../src/lib/mobileLearning";
import { buildMentorHomeMission } from "../src/lib/learning/mentorHome";
import { buildConfidenceIntelligenceSnapshot } from "../src/lib/learning/confidenceIntelligence";
import { buildWeeklyMentorReview } from "../src/lib/learning/weeklyMentorReview";
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
  currentStreakDays: 2,
  sessionsCompleted: 1,
  estimatedWeeklyStudyMinutes: 45,
  progressPercentage: 35,
  readinessScore: 52,
  weakArea: "Access control",
  recommendedNextAction: "Review access control before moving ahead.",
  snapshotTiles: [],
};

const goal: LearningGoal = {
  id: "goal-1",
  learnerId: "learner-1",
  title: "Security+ certification",
  category: "Certification",
  target: "Prepare for the exam",
  progress: 35,
  status: "Active",
  priority: "High",
};

const course: LearningCourse = {
  id: "course-1",
  title: "Security+ Foundations",
  category: "Cybersecurity",
  progress: 42,
  estimatedCompletion: "6 weeks",
  status: "In progress",
  priority: "High",
};

const sessions: LearningSession[] = [
  {
    id: "session-1",
    learnerId: "learner-1",
    title: "Authentication and access control",
    courseTitle: "Security+ Foundations",
    when: "Today",
    duration: "35 min",
    status: "In progress",
  },
  {
    id: "session-2",
    learnerId: "learner-1",
    title: "Identity review",
    courseTitle: "Security+ Foundations",
    when: "Yesterday",
    duration: "25 min",
    status: "Completed",
  },
];

const activities: LearningActivityRunnerRow[] = [
  {
    id: "activity-1",
    activity_type: "Reflection",
    title: "Authentication confidence check",
    difficulty: "Medium",
    estimated_minutes: 12,
    xp: 25,
    status: "Ready",
    sort_order: 1,
    created_at: "2026-07-17T12:00:00.000Z",
    session_recap: "Capture what feels clear and what still feels fuzzy.",
    reflection_option: "I guessed",
    reflection_confidence_adjustment: "lower-confidence",
  },
];

const recommendation: LearningRecommendation = {
  id: "rec-1",
  module: "learning",
  priority: "High",
  severity: "info",
  title: "Review access control",
  summary: "Keep the next step focused.",
  reason: "A current plan exists and has measurable progress.",
  recommendedAction: "Review today's result before picking the next lesson.",
  estimatedBenefit: "Keeps momentum attached to the active learning path.",
  actionUrl: "/dashboard/learning",
  confidence: "reserved",
  dismissible: true,
  completed: false,
};

function buildCards(overrides: {
  learningActivities?: LearningActivityRunnerRow[];
  learningSessions?: LearningSession[];
} = {}) {
  const learningActivities = overrides.learningActivities ?? activities;
  const learningSessions = overrides.learningSessions ?? sessions;
  const mission = buildMentorHomeMission({
    learnerName: "Sean",
    learningGoals: [goal],
    learningCourses: [course],
    learningSessions,
    learningActivities,
    learningRecommendations: [recommendation],
    progressSignals,
  });
  const confidence = buildConfidenceIntelligenceSnapshot({
    activities: learningActivities,
    courses: [course],
    sessions: learningSessions,
  });
  const review = buildWeeklyMentorReview({
    activities: learningActivities,
    sessions: learningSessions,
    goals: [goal],
    courses: [course],
    confidence,
  });

  return buildMobileLearningQuickActionCards({
    mission,
    confidence,
    review,
    activities: learningActivities,
  });
}

test("BF-MOB-006 builds Mentor next step and resume actions through Learning contracts", () => {
  const cards = buildCards();
  const nextStep = cards.find((card) => card.id === "mobile-learning-next-step");
  const resume = cards.find((card) => card.id === "mobile-learning-resume");

  assert.equal(cards.length, 4);
  assert.equal(nextStep?.source, "learning");
  assert.equal(nextStep?.sourceOwnershipPreserved, true);
  assert.equal(resume?.href, "/dashboard/learning/activities/activity-1");
  assert.equal(resume?.dispatchMode, "learning-activity-route");
  assert.equal(resume?.actionLabel, "Save reflection");
});

test("BF-MOB-006 builds review reminders and confidence reflection without mutating Learning state", () => {
  const cards = buildCards();
  const review = cards.find((card) => card.id === "mobile-learning-review-reminder");
  const confidence = cards.find(
    (card) => card.id === "mobile-learning-confidence-reflection"
  );

  assert.equal(review?.dispatchMode, "mentor-review-contract");
  assert.equal(confidence?.dispatchMode, "confidence-reflection-contract");
  assert.equal(confidence?.sourceOwnershipPreserved, true);
  assert.match(confidence?.summary || "", /confidence|understanding|guess/i);
});

test("BF-MOB-006 keeps mobile Learning cards narrow and desktop Learning page intact", () => {
  const learningPage = readFileSync("src/app/dashboard/learning/page.tsx", "utf8");
  const mobileLearning = readFileSync("src/lib/mobileLearning.ts", "utf8");
  const globalStyles = readFileSync("src/app/globals.css", "utf8");

  assert.match(learningPage, /data-mobile-learning-actions="true"/);
  assert.match(learningPage, /md:hidden/);
  assert.match(learningPage, /min-w-0/);
  assert.match(learningPage, /break-words/);
  assert.match(learningPage, /data-mobile-source-contract=\{card.dispatchMode\}/);
  assert.match(learningPage, /<MentorHome/);
  assert.match(mobileLearning, /getLearningActivityRoute/);
  assert.match(mobileLearning, /sourceOwnershipPreserved: true/);
  assert.match(globalStyles, /max-width: 100vw/);
  assert.match(globalStyles, /overflow-x: clip/);
});
