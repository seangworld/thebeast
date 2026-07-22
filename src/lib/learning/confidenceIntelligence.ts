import type { LearningActivityRunnerRow } from "./activityRunner";
import type { LearningCourse, LearningSession } from "./types";

export type ConfidenceDimensionLevel =
  | "insufficient-data"
  | "developing"
  | "steady"
  | "strong"
  | "review-due";

export type LearningConfidenceDimension = {
  id: "knowledge" | "confidence" | "consistency" | "speed" | "retention";
  label: string;
  level: ConfidenceDimensionLevel;
  evidence: string;
  learnerLanguage: string;
};

export type ConfidenceIntelligenceSnapshot = {
  dimensions: LearningConfidenceDimension[];
  mentorSummary: string;
  recommendation: string;
  missingData: boolean;
};

type ConfidenceInput = {
  activities: LearningActivityRunnerRow[];
  courses: LearningCourse[];
  sessions: LearningSession[];
  now?: Date;
};

function daysSince(value?: string | null, now = new Date()) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.round((now.getTime() - time) / 86_400_000));
}

function completedActivities(activities: LearningActivityRunnerRow[]) {
  return activities.filter((activity) => activity.status === "Completed");
}

function getReflectionEvidence(activities: LearningActivityRunnerRow[]) {
  return completedActivities(activities).filter(
    (activity) => activity.reflection_option || activity.reflection_note
  );
}

function buildDimension(
  dimension: LearningConfidenceDimension
): LearningConfidenceDimension {
  return dimension;
}

export function buildConfidenceIntelligenceSnapshot({
  activities,
  courses,
  sessions,
  now = new Date(),
}: ConfidenceInput): ConfidenceIntelligenceSnapshot {
  const completed = completedActivities(activities);
  const reflectionEvidence = getReflectionEvidence(activities);
  const weaknessCount = completed.reduce(
    (count, activity) => count + (activity.session_weak_concepts?.length || 0),
    0
  );
  const strengthCount = completed.reduce(
    (count, activity) => count + (activity.session_strengths?.length || 0),
    0
  );
  const guessedCount = reflectionEvidence.filter(
    (activity) =>
      activity.reflection_option === "I guessed" ||
      activity.reflection_confidence_adjustment === "lower-confidence"
  ).length;
  const frustratedCount = reflectionEvidence.filter(
    (activity) =>
      activity.reflection_option === "I'm frustrated" ||
      activity.reflection_confidence_adjustment === "reduce-pressure"
  ).length;
  const averageCourseProgress =
    courses.length > 0
      ? Math.round(
          courses.reduce((total, course) => total + course.progress, 0) / courses.length
        )
      : null;
  const completedDurations = sessions
    .filter((session) => session.status === "Completed")
    .map((session) => Number(session.duration.match(/(\d+)/)?.[1] || 0))
    .filter((duration) => duration > 0);
  const averageSessionMinutes =
    completedDurations.length > 0
      ? Math.round(
          completedDurations.reduce((total, duration) => total + duration, 0) /
            completedDurations.length
        )
      : null;
  const lastCompletedDays = daysSince(
    completed
      .sort((a, b) => {
        const aTime = new Date(a.completed_at || a.created_at || 0).getTime();
        const bTime = new Date(b.completed_at || b.created_at || 0).getTime();
        return bTime - aTime;
      })[0]?.completed_at,
    now
  );
  const missingData = activities.length === 0 && courses.length === 0 && sessions.length === 0;

  const dimensions: LearningConfidenceDimension[] = [
    buildDimension({
      id: "knowledge",
      label: "Knowledge",
      level:
        completed.length === 0 && averageCourseProgress === null
          ? "insufficient-data"
          : weaknessCount > strengthCount
            ? "developing"
            : averageCourseProgress !== null && averageCourseProgress >= 70
              ? "strong"
              : "steady",
      evidence:
        completed.length > 0
          ? `${completed.length} completed activity record${completed.length === 1 ? "" : "s"} and ${strengthCount} strength signal${strengthCount === 1 ? "" : "s"}.`
          : averageCourseProgress !== null
            ? `${averageCourseProgress}% average mapped course progress.`
            : "No completed learning evidence yet.",
      learnerLanguage:
        completed.length > 0
          ? "Your Guidance Counselor can use completed session evidence to judge what you understand."
          : "I need one completed session before I can say much about knowledge.",
    }),
    buildDimension({
      id: "confidence",
      label: "Confidence",
      level:
        reflectionEvidence.length === 0
          ? "insufficient-data"
          : guessedCount > 0 || frustratedCount > 0
            ? "developing"
            : "steady",
      evidence:
        reflectionEvidence.length > 0
          ? `${reflectionEvidence.length} reflection signal${reflectionEvidence.length === 1 ? "" : "s"}; ${guessedCount} guessed, ${frustratedCount} frustrated.`
          : "No reflection evidence yet.",
      learnerLanguage:
        guessedCount > 0
          ? "You may be getting some answers right before they feel secure."
          : frustratedCount > 0
            ? "Your Guidance Counselor should lower pressure and use smaller next steps."
            : reflectionEvidence.length > 0
              ? "Your confidence evidence is usable for the next recommendation."
              : "Reflection will help your Guidance Counselor tell confidence apart from correctness.",
    }),
    buildDimension({
      id: "consistency",
      label: "Consistency",
      level:
        completed.length < 2
          ? "insufficient-data"
          : weaknessCount > 0 && strengthCount > 0
            ? "developing"
            : "steady",
      evidence:
        completed.length >= 2
          ? `${completed.length} completed activities create repeat evidence.`
          : "Consistency needs more than one attempt.",
      learnerLanguage:
        completed.length >= 2
          ? "Your Guidance Counselor can start comparing performance across attempts."
          : "One more completed session will make consistency easier to judge.",
    }),
    buildDimension({
      id: "speed",
      label: "Speed",
      level:
        averageSessionMinutes === null
          ? "insufficient-data"
          : averageSessionMinutes > 35
            ? "developing"
            : "steady",
      evidence:
        averageSessionMinutes === null
          ? "No completed session durations yet."
          : `Completed sessions average about ${averageSessionMinutes} minutes.`,
      learnerLanguage:
        averageSessionMinutes === null
          ? "Speed is not being judged yet."
          : averageSessionMinutes > 35
            ? "You may be working slowly and carefully; speed will not dominate the recommendation."
            : "The session pace looks workable for the current activity context.",
    }),
    buildDimension({
      id: "retention",
      label: "Retention",
      level:
        lastCompletedDays === null
          ? "insufficient-data"
          : lastCompletedDays >= 7
            ? "review-due"
            : "steady",
      evidence:
        lastCompletedDays === null
          ? "No dated completed activity yet."
          : `Last completed activity was ${lastCompletedDays} day${lastCompletedDays === 1 ? "" : "s"} ago.`,
      learnerLanguage:
        lastCompletedDays === null
          ? "Retention needs time-based follow-up before I can judge it."
          : lastCompletedDays >= 7
            ? "This skill is due for a retention review."
            : "Retention is not overdue yet.",
    }),
  ];

  const priorityDimension =
    dimensions.find((dimension) => dimension.level === "review-due") ||
    dimensions.find((dimension) => dimension.level === "developing") ||
    dimensions.find((dimension) => dimension.level === "insufficient-data");

  return {
    dimensions,
    missingData,
    mentorSummary: missingData
      ? "I need a completed learning session before I can build confidence intelligence."
      : priorityDimension?.learnerLanguage ||
        "Your learning evidence is stable enough to keep moving.",
    recommendation:
      priorityDimension?.id === "retention"
        ? "Schedule a short retention review before adding new material."
        : priorityDimension?.id === "confidence"
          ? "Use a smaller check to separate understanding from guessing."
          : priorityDimension?.id === "consistency"
            ? "Repeat the skill once more so the Guidance Counselor can compare attempts."
            : "Continue the current Guidance Counselor mission.",
  };
}
