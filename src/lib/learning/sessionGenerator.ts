import type {
  GeneratedStudySessionPlan,
  MasteryProfile,
  WeaknessAnalysis,
} from "./types";

export function generateStudySession({
  mastery,
  weakness,
  availableMinutes,
}: {
  mastery: MasteryProfile;
  weakness: WeaknessAnalysis;
  availableMinutes: number;
}): GeneratedStudySessionPlan {
  const conceptId =
    weakness.lowMasteryConcepts[0] ||
    mastery.suggestedReviewTopics[0] ||
    mastery.concepts[0]?.conceptId ||
    "learning-foundation";

  return {
    conceptId,
    estimatedTime: `${availableMinutes} min`,
    warmUp: `Recall what you already know about ${conceptId}.`,
    review: `Review one missed example for ${conceptId}.`,
    newLearning: `Add one new rule or pattern connected to ${conceptId}.`,
    practice: `Complete a focused practice task for ${conceptId}.`,
    reflection: "Write what felt clear, confusing, and worth repeating.",
    confidenceCheck: "Rate confidence from 1-5 before planning the next session.",
  };
}
