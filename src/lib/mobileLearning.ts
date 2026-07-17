import {
  getLearningActivityPrimaryActionLabel,
  getLearningActivityRoute,
  getNewestReadyLearningActivity,
  type LearningActivityRunnerRow,
} from "./learning/activityRunner";
import type { ConfidenceIntelligenceSnapshot } from "./learning/confidenceIntelligence";
import type { MentorHomeMission } from "./learning/mentorHome";
import type { WeeklyMentorReview } from "./learning/weeklyMentorReview";
import type { PlatformModule } from "./platform/types";

export type MobileLearningQuickActionCard = {
  id: string;
  source: PlatformModule;
  title: string;
  summary: string;
  href: string;
  actionLabel: string;
  metadata: string[];
  dispatchMode:
    | "mentor-contract-route"
    | "learning-activity-route"
    | "mentor-review-contract"
    | "confidence-reflection-contract";
  sourceOwnershipPreserved: true;
};

function compactMetadata(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value));
}

export function buildMobileLearningQuickActionCards({
  mission,
  confidence,
  review,
  activities,
}: {
  mission: MentorHomeMission;
  confidence: ConfidenceIntelligenceSnapshot;
  review: WeeklyMentorReview;
  activities: LearningActivityRunnerRow[];
}): MobileLearningQuickActionCard[] {
  const openActivity = getNewestReadyLearningActivity(activities);
  const confidenceSignal =
    confidence.dimensions.find((dimension) => dimension.id === "confidence") ||
    confidence.dimensions.find((dimension) => dimension.level !== "steady") ||
    confidence.dimensions[0];
  const reviewNeedsAttention =
    review.missingData ||
    confidence.dimensions.some((dimension) =>
      ["developing", "review-due", "insufficient-data"].includes(dimension.level)
    );

  const nextStep: MobileLearningQuickActionCard = {
    id: "mobile-learning-next-step",
    source: "learning",
    title: mission.missionTitle,
    summary: mission.recommendationReason,
    href: mission.primaryAction.href,
    actionLabel: mission.primaryAction.label,
    metadata: compactMetadata([
      mission.missionLabel,
      mission.durationLabel,
      mission.currentGoalLabel,
    ]),
    dispatchMode:
      openActivity && mission.primaryAction.href === getLearningActivityRoute(openActivity.id)
        ? "learning-activity-route"
        : "mentor-contract-route",
    sourceOwnershipPreserved: true,
  };

  const resume: MobileLearningQuickActionCard = {
    id: "mobile-learning-resume",
    source: "learning",
    title:
      mission.state === "resume"
        ? "Resume Mentor session"
        : openActivity
          ? "Continue ready activity"
          : "Open Mentor home",
    summary:
      mission.state === "resume"
        ? mission.primaryAction.detail
        : openActivity
          ? openActivity.session_recap ||
            "Continue the next assigned BeastLearning activity from its source route."
          : "No unfinished activity is waiting. Mentor Home will choose the next useful step.",
    href: openActivity ? getLearningActivityRoute(openActivity.id) : mission.primaryAction.href,
    actionLabel: openActivity
      ? getLearningActivityPrimaryActionLabel(openActivity.activity_type)
      : mission.primaryAction.label,
    metadata: compactMetadata([
      openActivity?.activity_type,
      openActivity ? `${openActivity.estimated_minutes || 15} minutes` : mission.durationLabel,
      openActivity?.status,
    ]),
    dispatchMode: openActivity ? "learning-activity-route" : "mentor-contract-route",
    sourceOwnershipPreserved: true,
  };

  const reviewReminder: MobileLearningQuickActionCard = {
    id: "mobile-learning-review-reminder",
    source: "learning",
    title: review.title,
    summary: reviewNeedsAttention ? review.nextWeekRecommendation : review.summary,
    href: "/dashboard/learning#weekly-review",
    actionLabel: review.missingData ? "Create review evidence" : "Review progress",
    metadata: compactMetadata([
      review.sessionsCompleted,
      review.studyTime,
      review.currentGoalProgress,
    ]),
    dispatchMode: "mentor-review-contract",
    sourceOwnershipPreserved: true,
  };

  const confidenceReflection: MobileLearningQuickActionCard = {
    id: "mobile-learning-confidence-reflection",
    source: "learning",
    title: "Confidence reflection",
    summary: confidenceSignal?.learnerLanguage || confidence.mentorSummary,
    href: "/dashboard/learning#mentor-progress",
    actionLabel:
      confidenceSignal?.level === "insufficient-data"
        ? "Add reflection"
        : "Review confidence",
    metadata: compactMetadata([
      confidenceSignal?.label,
      confidenceSignal?.level.replace(/-/g, " "),
      confidence.recommendation,
    ]),
    dispatchMode: "confidence-reflection-contract",
    sourceOwnershipPreserved: true,
  };

  return [nextStep, resume, reviewReminder, confidenceReflection];
}
