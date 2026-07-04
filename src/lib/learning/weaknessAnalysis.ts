import type { LearningMemory, MasteryProfile, WeaknessAnalysis } from "./types";

export function analyzeLearningWeaknesses({
  mastery,
  memory,
}: {
  mastery: MasteryProfile;
  memory: LearningMemory;
}): WeaknessAnalysis {
  const lowMasteryConcepts = mastery.concepts
    .filter((concept) => concept.masteryPercent < 45)
    .map((concept) => concept.conceptId);
  const neglectedTopics = mastery.concepts
    .filter((concept) => !memory.recentlyStudied.includes(concept.conceptId))
    .slice(0, 3)
    .map((concept) => concept.conceptId);
  const slowProgressConcepts = mastery.concepts
    .filter((concept) => concept.masteryPercent > 0 && concept.masteryPercent < 60)
    .map((concept) => concept.conceptId);

  return {
    neglectedTopics,
    repeatedReviewNeeds: memory.frequentlyMissed,
    lowMasteryConcepts,
    slowProgressConcepts,
    inconsistentStudyHabits: memory.studyHistory.length < 4,
    improvementSuggestions: [
      ...lowMasteryConcepts.map((concept) => `Schedule a review block for ${concept}.`),
      ...memory.frequentlyMissed.map((concept) => `Practice missed concept: ${concept}.`),
      memory.studyHistory.length < 4 ? "Add one more study block this week." : "Keep the current rhythm.",
    ],
  };
}
