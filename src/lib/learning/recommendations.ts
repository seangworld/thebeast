import type { LearningProgressSignals, LearningRecommendation } from "./types";

type LearningRecommendationInput = {
  progress: LearningProgressSignals;
  currentPlanTitle: string;
  activeGoalsCount: number;
  currentFocus: string;
};

function createLearningRecommendation(
  recommendation: Omit<
    LearningRecommendation,
    "module" | "confidence" | "dismissible" | "completed"
  > & {
    dismissible?: boolean;
    completed?: boolean;
  }
): LearningRecommendation {
  return {
    ...recommendation,
    module: "learning",
    confidence: "reserved",
    dismissible: recommendation.dismissible ?? true,
    completed: recommendation.completed ?? false,
  };
}

export function buildLearningRecommendations(
  input: LearningRecommendationInput
): LearningRecommendation[] {
  return [
    createLearningRecommendation({
      id: "learning-continue-current-plan",
      priority: "High",
      severity: "info",
      title: `Continue ${input.currentPlanTitle}.`,
      summary: `${input.progress.progressPercentage}% progress is mapped for the current learning path.`,
      reason: "A current plan exists and has measurable progress.",
      recommendedAction: "Continue the next planned study block.",
      estimatedBenefit: "Keeps momentum attached to the active learning path.",
      actionUrl: "/dashboard/learning",
    }),
    createLearningRecommendation({
      id: "learning-review-weak-area",
      priority: "High",
      severity: "warning",
      title: `Review ${input.progress.weakArea}.`,
      summary: `${input.progress.weakArea} is the lowest-progress course area in the current sample data.`,
      reason: "The rule-based progress signal selects the course with the lowest mapped progress.",
      recommendedAction: `Spend one focused review block on ${input.progress.weakArea}.`,
      estimatedBenefit: "Reduces the most visible learning gap.",
      actionUrl: "/dashboard/learning",
    }),
    createLearningRecommendation({
      id: "learning-start-short-session",
      priority: "Medium",
      severity: "info",
      title: "Start a short study session.",
      summary: `${input.currentFocus} is ready as today's focused command card.`,
      reason: "A short session is available and can be completed locally.",
      recommendedAction: "Use the Today's Study Session card.",
      estimatedBenefit: "Turns planning into a concrete study action.",
      actionUrl: "/dashboard/learning",
    }),
    createLearningRecommendation({
      id: "learning-add-goal",
      priority: input.activeGoalsCount > 0 ? "Low" : "Medium",
      severity: "info",
      title: "Add another learning goal.",
      summary:
        input.activeGoalsCount > 0
          ? `${input.activeGoalsCount} active goal is already in motion.`
          : "No active goal is currently selected.",
      reason: "Clear goals help Beast understand what matters next.",
      recommendedAction: "Use the Learning Goal Builder to draft the next goal.",
      estimatedBenefit: "Improves the next recommendations Beast can make.",
      actionUrl: "/dashboard/learning",
    }),
    createLearningRecommendation({
      id: "learning-upload-material-placeholder",
      priority: "Low",
      severity: "info",
      title: "Upload study material later.",
      summary: "Add study materials so Beast can connect lessons to the sources you already use.",
      reason: "Learning will eventually benefit from notes, references, PDFs, and course files.",
      recommendedAction: "Keep study material organized until uploads come online.",
      estimatedBenefit: "Gives Beast better context for lesson and review suggestions.",
      actionUrl: "/dashboard/uploads",
    }),
    createLearningRecommendation({
      id: "learning-schedule-study-time-placeholder",
      priority: "Low",
      severity: "info",
      title: "Schedule study time later.",
      summary: "Protect time on your calendar so learning stays consistent.",
      reason: "Consistent study rhythm improves follow-through, but no calendar changes are made yet.",
      recommendedAction: "Use the weekly rhythm as a planning guide for now.",
      estimatedBenefit: "Keeps your learning plan connected to your available time.",
      actionUrl: "/dashboard/calendar",
    }),
    createLearningRecommendation({
      id: "learning-explore-related-path",
      priority: "Medium",
      severity: "info",
      title: "Explore a related learning path.",
      summary: `A related path can build around ${input.progress.weakArea} once the current plan is stable.`,
      reason: "The weakest area is a useful starting point for adjacent skills and course discovery.",
      recommendedAction: "Review courses connected to the weak area.",
      estimatedBenefit: "Makes the next learning path easier to plan.",
      actionUrl: "/dashboard/learning",
    }),
  ];
}
