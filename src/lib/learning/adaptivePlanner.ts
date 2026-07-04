import type {
  AdaptivePlan,
  LearningGoal,
  LearningMemory,
  MasteryProfile,
  WeaknessAnalysis,
} from "./types";

export function buildAdaptiveLearningPlan({
  goals,
  mastery,
  memory,
  weakness,
  availableStudyMinutes,
  learningPace,
  completedWorkCount,
}: {
  goals: LearningGoal[];
  mastery: MasteryProfile;
  memory: LearningMemory;
  weakness: WeaknessAnalysis;
  availableStudyMinutes: number;
  learningPace: string;
  completedWorkCount: number;
}): AdaptivePlan {
  const primaryGoal = goals.find((goal) => goal.status === "Active") || goals[0];
  const reviewConcept = weakness.lowMasteryConcepts[0] || weakness.repeatedReviewNeeds[0] || memory.recentlyStudied[0];
  const newConcept = mastery.weakConcepts[1] || mastery.suggestedReviewTopics[0] || "next-concept";
  const sessionCount = Math.max(1, Math.floor(availableStudyMinutes / 30));

  return {
    updatedMilestones: [
      `Protect ${primaryGoal?.title || "current goal"} momentum.`,
      `Review ${reviewConcept}.`,
      `Complete ${sessionCount} focused session${sessionCount === 1 ? "" : "s"} this week.`,
    ],
    reorderedSessions: [reviewConcept, newConcept, ...memory.recentlyStudied].filter(Boolean),
    reviewSessions: weakness.repeatedReviewNeeds.slice(0, 3),
    nextRecommendedLesson: reviewConcept,
    estimatedCompletion:
      completedWorkCount > 3 && learningPace.includes("Focused")
        ? "4-6 weeks"
        : "6-10 weeks",
  };
}
