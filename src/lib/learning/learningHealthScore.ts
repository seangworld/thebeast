import type { LearningActivityRunnerRow } from "./activityRunner";
import type { ConfidenceIntelligenceSnapshot } from "./confidenceIntelligence";
import type { LearningCourse, LearningProgressSignals } from "./types";

export const LEARNING_HEALTH_SCORE_VERSION = "BL-405.v1";

export type LearningHealthFactorId =
  | "knowledge"
  | "confidence"
  | "retention"
  | "consistency"
  | "course-completion"
  | "review-completion"
  | "mission-progress";

export type LearningHealthFactor = {
  id: LearningHealthFactorId;
  label: string;
  weight: number;
  score: number | null;
  contribution: number | null;
  explanation: string;
  evidence: string;
  improvement: string;
};

export type LearningHealthScoreSnapshot = {
  version: typeof LEARNING_HEALTH_SCORE_VERSION;
  score: number | null;
  previousScore: number | null;
  trend: "up" | "down" | "steady" | "baseline" | "unavailable";
  change: number | null;
  label: string;
  factors: LearningHealthFactor[];
  availableWeight: number;
  formula: string;
  waysToImprove: string[];
  limitations: string[];
};

type Input = {
  confidence: ConfidenceIntelligenceSnapshot;
  courses: readonly LearningCourse[];
  activities: readonly LearningActivityRunnerRow[];
  progress: LearningProgressSignals;
  previousScore?: number | null;
};

const dimensionScores = {
  strong: 100,
  steady: 75,
  developing: 50,
  "review-due": 35,
  "insufficient-data": null,
} as const;

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function dimensionScore(
  confidence: ConfidenceIntelligenceSnapshot,
  id: "knowledge" | "confidence" | "retention" | "consistency"
) {
  const dimension = confidence.dimensions.find((item) => item.id === id);
  return {
    score: dimension ? dimensionScores[dimension.level] : null,
    evidence: dimension?.evidence || "No supporting learning evidence is available yet.",
  };
}

export function buildLearningHealthScore({
  confidence,
  courses,
  activities,
  progress,
  previousScore = null,
}: Input): LearningHealthScoreSnapshot {
  const completedActivities = activities.filter(
    ({ status }) => status === "Completed"
  );
  const reviewDue = completedActivities.filter(
    ({ session_state }) => session_state === "review_due"
  ).length;
  const averageCourseProgress =
    courses.length > 0
      ? clamp(
          courses.reduce((sum, course) => sum + course.progress, 0) /
            courses.length
        )
      : null;
  const reviewScore =
    completedActivities.length > 0
      ? clamp(
          ((completedActivities.length - reviewDue) /
            completedActivities.length) *
            100
        )
      : null;
  const knowledge = dimensionScore(confidence, "knowledge");
  const confidenceFactor = dimensionScore(confidence, "confidence");
  const retention = dimensionScore(confidence, "retention");
  const consistency = dimensionScore(confidence, "consistency");

  const factorInputs: Omit<LearningHealthFactor, "contribution">[] = [
    {
      id: "knowledge",
      label: "Knowledge",
      weight: 20,
      score: knowledge.score,
      explanation: "Uses the shared confidence engine's knowledge level from completed learning evidence.",
      evidence: knowledge.evidence,
      improvement: "Complete a focused lesson and demonstrate the concept again.",
    },
    {
      id: "confidence",
      label: "Confidence",
      weight: 15,
      score: confidenceFactor.score,
      explanation: "Uses saved learner reflections and keeps confidence separate from mastery.",
      evidence: confidenceFactor.evidence,
      improvement: "Add an honest reflection after the next lesson so confidence can be compared with performance.",
    },
    {
      id: "retention",
      label: "Retention",
      weight: 15,
      score: retention.score,
      explanation: "Uses repeat learning and review evidence from the shared confidence engine.",
      evidence: retention.evidence,
      improvement: "Complete the next due review and recall the concept without relying on notes.",
    },
    {
      id: "consistency",
      label: "Consistency",
      weight: 15,
      score: consistency.score,
      explanation: "Requires more than one completed attempt before consistency is scored.",
      evidence: consistency.evidence,
      improvement: "Complete another planned session to establish a repeatable learning rhythm.",
    },
    {
      id: "course-completion",
      label: "Course completion",
      weight: 15,
      score: averageCourseProgress,
      explanation: "Uses the average progress saved across current BeastEducation courses.",
      evidence:
        averageCourseProgress === null
          ? "No course progress records are available."
          : `${averageCourseProgress}% average progress across ${courses.length} course${courses.length === 1 ? "" : "s"}.`,
      improvement: "Continue the active course lesson that advances your current goal.",
    },
    {
      id: "review-completion",
      label: "Review completion",
      weight: 10,
      score: reviewScore,
      explanation: "Compares completed activities with completed activities still marked review due.",
      evidence:
        reviewScore === null
          ? "No completed activities are available for review scoring."
          : `${reviewDue} of ${completedActivities.length} completed activit${completedActivities.length === 1 ? "y is" : "ies are"} still marked review due.`,
      improvement: "Clear the highest-priority item in your review queue.",
    },
    {
      id: "mission-progress",
      label: "Mission progress",
      weight: 10,
      score:
        courses.length > 0 || progress.progressPercentage > 0
          ? clamp(progress.progressPercentage)
          : null,
      explanation: "Uses the progress percentage for the course currently leading the Mentor mission.",
      evidence:
        courses.length > 0 || progress.progressPercentage > 0
          ? `${clamp(progress.progressPercentage)}% progress in the current mission course.`
          : "No active mission progress is available.",
      improvement: "Complete the current Mentor mission before adding another learning objective.",
    },
  ];

  const availableWeight = factorInputs.reduce(
    (sum, factor) => sum + (factor.score === null ? 0 : factor.weight),
    0
  );
  const factors: LearningHealthFactor[] = factorInputs.map((factor) => ({
    ...factor,
    contribution:
      factor.score === null || availableWeight === 0
        ? null
        : Math.round(
            ((factor.score * factor.weight) / availableWeight) * 100
          ) / 100,
  }));
  const score =
    availableWeight === 0
      ? null
      : clamp(
          factors.reduce(
            (sum, factor) => sum + (factor.contribution || 0),
            0
          )
        );
  const normalizedPrevious =
    previousScore === null ? null : clamp(previousScore);
  const change =
    score === null || normalizedPrevious === null
      ? null
      : score - normalizedPrevious;
  const trend =
    score === null
      ? "unavailable"
      : change === null
        ? "baseline"
        : change > 0
          ? "up"
          : change < 0
            ? "down"
            : "steady";
  const waysToImprove = factors
    .filter((factor) => factor.score !== null && factor.score < 80)
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .slice(0, 3)
    .map((factor) => `${factor.label}: ${factor.improvement}`);

  return {
    version: LEARNING_HEALTH_SCORE_VERSION,
    score,
    previousScore: normalizedPrevious,
    trend,
    change,
    label:
      score === null
        ? "More learning evidence needed"
        : score >= 80
          ? "Strong learning health"
          : score >= 60
            ? "Building steadily"
            : "Needs focused support",
    factors,
    availableWeight,
    formula:
      "Score = sum(factor score × factor weight) ÷ sum(available factor weights). Missing factors are excluded rather than scored as zero.",
    waysToImprove:
      waysToImprove.length > 0
        ? waysToImprove
        : ["Continue the current Mentor mission and preserve your learning rhythm."],
    limitations: [
      "This is an educational wellness score, not a grade, IQ measure, credential, admissions prediction, or guarantee.",
      previousScore === null
        ? "No prior Learning Health Score snapshot is stored, so this score establishes the baseline."
        : "The previous score must come from the same versioned calculation.",
    ],
  };
}
