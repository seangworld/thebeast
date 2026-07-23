import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildLearningHealthScore,
  LEARNING_HEALTH_SCORE_VERSION,
} from "../src/lib/learning/learningHealthScore";
import type { ConfidenceIntelligenceSnapshot } from "../src/lib/learning/confidenceIntelligence";

const confidence: ConfidenceIntelligenceSnapshot = {
  dimensions: [
    {
      id: "knowledge",
      label: "Knowledge",
      level: "strong",
      evidence: "Three completed attempts recorded strengths.",
      learnerLanguage: "Knowledge is strong.",
    },
    {
      id: "confidence",
      label: "Confidence",
      level: "steady",
      evidence: "Two reflections are available.",
      learnerLanguage: "Confidence is steady.",
    },
    {
      id: "retention",
      label: "Retention",
      level: "developing",
      evidence: "One review remains due.",
      learnerLanguage: "Retention is developing.",
    },
    {
      id: "consistency",
      label: "Consistency",
      level: "steady",
      evidence: "Three attempts create repeat evidence.",
      learnerLanguage: "Consistency is steady.",
    },
    {
      id: "speed",
      label: "Speed",
      level: "insufficient-data",
      evidence: "Speed is not scored.",
      learnerLanguage: "More evidence is needed.",
    },
  ],
  mentorSummary: "Learning evidence is available.",
  recommendation: "Complete the review.",
  missingData: false,
};

const progress = {
  activeGoalsCount: 1,
  currentStreakDays: 2,
  sessionsCompleted: 3,
  estimatedWeeklyStudyMinutes: 60,
  progressPercentage: 70,
  readinessScore: 80,
  weakArea: "Fractions",
  recommendedNextAction: "Review fractions.",
  snapshotTiles: [],
};

test("BL-405 calculates all seven disclosed educational factors", () => {
  const snapshot = buildLearningHealthScore({
    confidence,
    courses: [
      {
        id: "course",
        title: "Algebra",
        category: "Math",
        progress: 80,
        estimatedCompletion: "Soon",
        status: "In progress",
        priority: "High",
      },
    ],
    activities: [
      {
        id: "one",
        activity_type: "Lesson",
        title: "One",
        difficulty: "Adaptive",
        estimated_minutes: 20,
        xp: 10,
        status: "Completed",
        session_state: "complete",
      },
      {
        id: "two",
        activity_type: "Review",
        title: "Two",
        difficulty: "Adaptive",
        estimated_minutes: 20,
        xp: 10,
        status: "Completed",
        session_state: "review_due",
      },
    ],
    progress,
    previousScore: 68,
  });

  assert.equal(snapshot.version, LEARNING_HEALTH_SCORE_VERSION);
  assert.equal(snapshot.factors.length, 7);
  assert.equal(snapshot.availableWeight, 100);
  assert.equal(snapshot.score, 74);
  assert.equal(snapshot.previousScore, 68);
  assert.equal(snapshot.trend, "up");
  assert.equal(snapshot.change, 6);
  assert.ok(snapshot.factors.every((factor) => factor.explanation && factor.evidence));
  assert.match(snapshot.formula, /Missing factors are excluded/);
});

test("BL-405 excludes missing factors instead of treating them as zero", () => {
  const snapshot = buildLearningHealthScore({
    confidence: {
      dimensions: [],
      mentorSummary: "No evidence.",
      recommendation: "Complete a lesson.",
      missingData: true,
    },
    courses: [],
    activities: [],
    progress: { ...progress, progressPercentage: 0 },
  });

  assert.equal(snapshot.score, null);
  assert.equal(snapshot.previousScore, null);
  assert.equal(snapshot.trend, "unavailable");
  assert.equal(snapshot.availableWeight, 0);
  assert.ok(snapshot.factors.every((factor) => factor.score === null));
});

test("BL-405 establishes an honest baseline without inventing a previous score", () => {
  const snapshot = buildLearningHealthScore({
    confidence,
    courses: [],
    activities: [],
    progress,
  });
  assert.equal(snapshot.previousScore, null);
  assert.equal(snapshot.trend, "baseline");
  assert.match(snapshot.limitations[1], /No prior Learning Health Score snapshot/);
  assert.ok(snapshot.waysToImprove.length > 0);
});

test("BL-405 dashboard exposes score trend factors formula and improvement guidance", () => {
  const source = readFileSync(
    "src/app/dashboard/learning/LearningMissionControl.tsx",
    "utf8"
  );
  assert.match(source, /Previous score/);
  assert.match(source, /Trend/);
  assert.match(source, /How the score is calculated/);
  assert.match(source, /model\.health\.factors/);
  assert.match(source, /Ways to improve/);
  assert.match(source, /model\.health\.limitations/);
});
