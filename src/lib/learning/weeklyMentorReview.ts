import type { ConfidenceIntelligenceSnapshot } from "./confidenceIntelligence";
import type { LearningActivityRunnerRow } from "./activityRunner";
import type { LearningCourse, LearningGoal, LearningSession } from "./types";

export type MeaningfulLearningAchievement = {
  id: string;
  title: string;
  message: string;
  basis: string;
};

export type WeeklyMentorReview = {
  title: string;
  summary: string;
  sessionsCompleted: string;
  studyTime: string;
  strengths: string[];
  weakAreas: string[];
  confidenceDirection: string;
  currentGoalProgress: string;
  nextWeekRecommendation: string;
  missingData: boolean;
};

type WeeklyReviewInput = {
  activities: LearningActivityRunnerRow[];
  sessions: LearningSession[];
  goals: LearningGoal[];
  courses: LearningCourse[];
  confidence: ConfidenceIntelligenceSnapshot;
};

function parseDuration(value: string) {
  return Number(value.match(/(\d+)/)?.[1] || 0);
}

export function buildMeaningfulLearningAchievements({
  activities,
  courses,
}: {
  activities: LearningActivityRunnerRow[];
  courses: LearningCourse[];
}): MeaningfulLearningAchievement[] {
  const achievements = new Map<string, MeaningfulLearningAchievement>();
  const completed = activities.filter((activity) => activity.status === "Completed");
  const recovered = completed.find(
    (activity) =>
      (activity.session_strengths?.length || 0) > 0 &&
      !(activity.session_weak_concepts?.length || 0)
  );
  const difficultRemediation = completed.find(
    (activity) =>
      activity.reflection_option === "Hard" &&
      (activity.session_strengths?.length || 0) > 0
  );
  const domainComplete = courses.find((course) => course.progress >= 100);
  const retentionImproved = completed.find(
    (activity) =>
      activity.session_state !== "review_due" &&
      activity.session_recap?.toLowerCase().includes("retention")
  );

  if (domainComplete) {
    achievements.set(`domain-${domainComplete.id}`, {
      id: `domain-${domainComplete.id}`,
      title: "Curriculum domain completed",
      message: `You completed ${domainComplete.title}.`,
      basis: "Course progress reached 100%.",
    });
  }

  if (recovered) {
    achievements.set(`recovered-${recovered.id}`, {
      id: `recovered-${recovered.id}`,
      title: "Weak area recovered",
      message: `You turned ${recovered.title} into a steadier skill signal.`,
      basis: "Session outcome recorded strengths without current weak concepts.",
    });
  }

  if (difficultRemediation) {
    achievements.set(`remediation-${difficultRemediation.id}`, {
      id: `remediation-${difficultRemediation.id}`,
      title: "Difficult remediation completed",
      message: `You returned after a hard session and completed ${difficultRemediation.title}.`,
      basis: "Reflection marked the session hard and session strengths were saved.",
    });
  }

  if (retentionImproved) {
    achievements.set(`retention-${retentionImproved.id}`, {
      id: `retention-${retentionImproved.id}`,
      title: "Retention improved",
      message: `${retentionImproved.title} no longer needs immediate retention review.`,
      basis: "Saved session outcome did not remain review due.",
    });
  }

  return Array.from(achievements.values()).slice(0, 4);
}

export function buildWeeklyMentorReview({
  activities,
  sessions,
  goals,
  courses,
  confidence,
}: WeeklyReviewInput): WeeklyMentorReview {
  const completedSessions = sessions.filter((session) => session.status === "Completed");
  const completedActivities = activities.filter((activity) => activity.status === "Completed");
  const totalMinutes = completedSessions.reduce(
    (total, session) => total + parseDuration(session.duration),
    0
  );
  const strengths = completedActivities.flatMap(
    (activity) => activity.session_strengths || []
  );
  const weakAreas = completedActivities.flatMap(
    (activity) => activity.session_weak_concepts || []
  );
  const activeGoal = goals.find((goal) => goal.status === "Active") || goals[0];
  const activeCourse = courses.find((course) => course.status !== "Completed") || courses[0];
  const missingData =
    completedSessions.length === 0 && completedActivities.length === 0 && goals.length === 0;
  const confidenceSignal =
    confidence.dimensions.find((dimension) => dimension.id === "confidence")
      ?.learnerLanguage || "No confidence signal is available yet.";
  const nextWeekRecommendation = missingData
    ? "Complete one guided session so your Mentor has real evidence for next week."
    : weakAreas.length > 0
      ? `Start next week by reinforcing ${weakAreas[0]}.`
      : confidence.recommendation;

  return {
    title: "Weekly Mentor Review",
    summary: missingData
      ? "I do not have enough saved learning evidence for a real weekly trend yet."
      : `This week has ${completedActivities.length} completed learning activity record${completedActivities.length === 1 ? "" : "s"}.`,
    sessionsCompleted: `${completedSessions.length} completed session${completedSessions.length === 1 ? "" : "s"}`,
    studyTime: totalMinutes > 0 ? `${totalMinutes} minutes saved` : "No saved study time yet",
    strengths:
      strengths.length > 0
        ? Array.from(new Set(strengths)).slice(0, 3)
        : ["No specific strength signal is saved yet."],
    weakAreas:
      weakAreas.length > 0
        ? Array.from(new Set(weakAreas)).slice(0, 3)
        : ["No specific weak area is saved yet."],
    confidenceDirection: confidenceSignal,
    currentGoalProgress: activeGoal
      ? `${activeGoal.title}: ${activeGoal.progress}%`
      : activeCourse
        ? `${activeCourse.title}: ${activeCourse.progress}%`
        : "No active goal progress is available yet.",
    nextWeekRecommendation,
    missingData,
  };
}
