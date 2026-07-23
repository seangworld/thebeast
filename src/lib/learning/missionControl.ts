import type { LearningActivityRunnerRow } from "./activityRunner";
import type { ConfidenceIntelligenceSnapshot } from "./confidenceIntelligence";
import type { LearningTimelineEvent } from "./learningTimeline";
import type { MentorHomeMission } from "./mentorHome";
import type { LearningCourse, LearningProgressSignals } from "./types";
import type {
  MeaningfulLearningAchievement,
  WeeklyMentorReview,
} from "./weeklyMentorReview";

export type LearningHealthFactor = {
  label: string;
  value: number;
  maximum: number;
  detail: string;
};

export type LearningMissionControlModel = {
  healthScore: number;
  healthLabel: string;
  healthFactors: LearningHealthFactor[];
  mission: MentorHomeMission;
  weekly: WeeklyMentorReview;
  courses: LearningCourse[];
  recentActivity: LearningTimelineEvent[];
  upcomingReviews: LearningActivityRunnerRow[];
  achievements: MeaningfulLearningAchievement[];
  knowledgeGrowth: {
    headline: string;
    detail: string;
    dimensions: ConfidenceIntelligenceSnapshot["dimensions"];
  };
};

type Input = {
  mission: MentorHomeMission;
  progress: LearningProgressSignals;
  weekly: WeeklyMentorReview;
  courses: LearningCourse[];
  activities: LearningActivityRunnerRow[];
  timeline: LearningTimelineEvent[];
  achievements: MeaningfulLearningAchievement[];
  confidence: ConfidenceIntelligenceSnapshot;
};

function clamp(value: number, maximum: number) {
  return Math.max(0, Math.min(maximum, Math.round(value)));
}

export function buildLearningMissionControl(input: Input): LearningMissionControlModel {
  const factors: LearningHealthFactor[] = [
    {
      label: "Course progress",
      value: clamp(input.progress.progressPercentage * 0.5, 50),
      maximum: 50,
      detail: `${input.progress.progressPercentage}% progress in the current course`,
    },
    {
      label: "Active goals",
      value: clamp(input.progress.activeGoalsCount * 10, 20),
      maximum: 20,
      detail: `${input.progress.activeGoalsCount} active learning goal${input.progress.activeGoalsCount === 1 ? "" : "s"}`,
    },
    {
      label: "Completed sessions",
      value: clamp(input.progress.sessionsCompleted * 5, 20),
      maximum: 20,
      detail: `${input.progress.sessionsCompleted} completed session${input.progress.sessionsCompleted === 1 ? "" : "s"}`,
    },
    {
      label: "Consistency",
      value: clamp(input.progress.currentStreakDays * 2, 10),
      maximum: 10,
      detail: `${input.progress.currentStreakDays}-day recorded streak`,
    },
  ];
  const healthScore = factors.reduce((sum, factor) => sum + factor.value, 0);
  const knowledge = input.confidence.dimensions.find(({ id }) => id === "knowledge");

  return {
    healthScore,
    healthLabel:
      healthScore >= 80
        ? "Strong momentum"
        : healthScore >= 55
          ? "Building steadily"
          : healthScore > 0
            ? "Early momentum"
            : "Baseline needed",
    healthFactors: factors,
    mission: input.mission,
    weekly: input.weekly,
    courses: input.courses
      .filter(({ status }) => status !== "Completed")
      .sort((a, b) => b.progress - a.progress)
      .slice(0, 4),
    recentActivity: input.timeline.slice(0, 5),
    upcomingReviews: input.activities
      .filter(({ session_state }) => session_state === "review_due")
      .slice(0, 4),
    achievements: input.achievements.slice(0, 4),
    knowledgeGrowth: {
      headline:
        knowledge?.level === "insufficient-data"
          ? "Complete a session to establish your baseline"
          : knowledge?.learnerLanguage || "Knowledge evidence will appear as you learn.",
      detail: knowledge?.evidence || "No completed knowledge evidence yet.",
      dimensions: input.confidence.dimensions,
    },
  };
}
