import type { ConceptMasteryInput, MasteryProfile } from "./types";

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function confidenceFrom(value: number): "low" | "medium" | "high" {
  if (value >= 70) return "high";
  if (value >= 40) return "medium";
  return "low";
}

export function calculateMasteryProfile(inputs: ConceptMasteryInput[]): MasteryProfile {
  const concepts = inputs.map((input) => {
    const activityScore =
      input.completedSessions * 10 +
      input.completedGoals * 12 +
      input.completedMilestones * 8 +
      input.quizzesPlaceholder * 6 +
      input.practicePlaceholder * 5 +
      Math.min(input.studyStreakDays * 2, 12);
    const decay = Math.min(input.lastStudiedDaysAgo * 2, 20);
    const masteryPercent = clamp(activityScore - decay);

    return {
      conceptId: input.conceptId,
      masteryPercent,
      confidence: confidenceFrom(masteryPercent),
    };
  });
  const overallMasteryPercent = concepts.length
    ? clamp(concepts.reduce((sum, concept) => sum + concept.masteryPercent, 0) / concepts.length)
    : 0;
  const weakConcepts = concepts
    .filter((concept) => concept.masteryPercent < 45)
    .map((concept) => concept.conceptId);
  const strongestConcepts = concepts
    .filter((concept) => concept.masteryPercent >= 70)
    .map((concept) => concept.conceptId);

  return {
    overallMasteryPercent,
    confidence: confidenceFrom(overallMasteryPercent),
    concepts,
    weakConcepts,
    strongestConcepts,
    suggestedReviewTopics: weakConcepts.length ? weakConcepts : concepts.slice(0, 2).map((concept) => concept.conceptId),
  };
}
