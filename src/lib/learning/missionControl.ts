import type { LearningActivityRunnerRow } from "./activityRunner";
import type { ConfidenceIntelligenceSnapshot } from "./confidenceIntelligence";
import type { LearningTimelineEvent } from "./learningTimeline";
import type { MentorHomeMission } from "./mentorHome";
import type { LearningCourse, LearningProgressSignals } from "./types";
import {
  buildLearningHealthScore,
  type LearningHealthScoreSnapshot,
} from "./learningHealthScore";
import type {
  MeaningfulLearningAchievement,
  WeeklyMentorReview,
} from "./weeklyMentorReview";

export type LearningMissionControlModel = {
  health: LearningHealthScoreSnapshot;
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

export function buildLearningMissionControl(input: Input): LearningMissionControlModel {
  const knowledge = input.confidence.dimensions.find(({ id }) => id === "knowledge");

  return {
    health: buildLearningHealthScore({
      confidence: input.confidence,
      courses: input.courses,
      activities: input.activities,
      progress: input.progress,
    }),
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
