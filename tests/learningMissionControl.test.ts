import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildLearningMissionControl } from "../src/lib/learning/missionControl";

test("BL-401 builds a transparent health score from saved learning signals", () => {
  const model = buildLearningMissionControl({
    mission: {
      state: "next_activity",
      greeting: "Good morning.",
      missionTitle: "Review compound interest",
      missionLabel: "Recommended next",
      durationLabel: "20 minutes",
      recommendationReason: "A saved review signal is ready.",
      currentGoalLabel: "Build financial literacy",
      recentProgressLabel: "One session completed",
      weakAreaLabel: "Compound interest",
      nextAfterLabel: "Apply the concept",
      journeyProgressLabel: "One of four milestones complete",
      journeyRemainingLabel: "Three remain",
      journeyMilestoneLabel: "Explain compounding",
      journeyUnlockLabel: "Practice",
      primaryAction: { label: "Start review", href: "/review", detail: "Continue" },
      secondaryActions: [],
      hasSufficientLearnerData: true,
    },
    progress: {
      activeGoalsCount: 1,
      currentStreakDays: 3,
      sessionsCompleted: 2,
      estimatedWeeklyStudyMinutes: 40,
      progressPercentage: 60,
      readinessScore: 92,
      weakArea: "Compound interest",
      recommendedNextAction: "Review",
      snapshotTiles: [],
    },
    weekly: {
      title: "Weekly review",
      summary: "Two sessions completed.",
      sessionsCompleted: "2 completed sessions",
      studyTime: "40 minutes saved",
      strengths: ["Recall"],
      weakAreas: ["Compounding"],
      confidenceDirection: "Steady",
      currentGoalProgress: "Financial literacy: 60%",
      nextWeekRecommendation: "Review compounding.",
      missingData: false,
    },
    courses: [],
    activities: [],
    timeline: [],
    achievements: [],
    confidence: {
      dimensions: [],
      mentorSummary: "Steady",
      recommendation: "Continue",
      missingData: false,
    },
  });

  assert.equal(model.healthScore, 56);
  assert.deepEqual(model.healthFactors.map(({ label }) => label), [
    "Course progress",
    "Active goals",
    "Completed sessions",
    "Consistency",
  ]);
});

test("BL-401 renders every requested responsive mission-control surface", () => {
  const source = readFileSync(
    "src/app/dashboard/learning/LearningMissionControl.tsx",
    "utf8"
  );
  const page = readFileSync("src/app/dashboard/learning/page.tsx", "utf8");

  for (const label of [
    "Learning Health Score",
    "Current Mission",
    "Weekly Progress",
    "Current Courses",
    "Recent Activity",
    "Upcoming Reviews",
    "Achievements",
    "Knowledge Growth",
  ]) {
    assert.match(source, new RegExp(label));
  }
  assert.match(source, /Talk with your Mentor/);
  assert.match(source, /sm:grid-cols-2/);
  assert.match(source, /lg:grid-cols-2/);
  assert.match(source, /xl:grid-cols-3/);
  assert.match(page, /<LearningMissionControl model=\{missionControl\} \/>/);
});
