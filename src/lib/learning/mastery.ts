import type { ConceptMasteryInput, MasteryProfile } from "./types";
import type { LearnerSkillEvidence } from "./learnerSkillModel";

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

export type MasteryScoringInput = {
  conceptId: string;
  evidence: LearnerSkillEvidence[];
  currentDate: string;
};

export type MasteryScoringResult = {
  conceptId: string;
  checkScore: number;
  practiceScore: number;
  recencyScore: number;
  masteryPercent: number;
  confidence: "low" | "medium" | "high";
};

function averageScore(values: number[]) {
  return values.length
    ? clamp(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
}

function daysBetween(currentDate: string, observedAt: string) {
  const current = Date.parse(`${currentDate}T00:00:00Z`);
  const observed = Date.parse(`${observedAt}T00:00:00Z`);
  if (!Number.isFinite(current) || !Number.isFinite(observed)) return 30;
  return Math.max(0, Math.round((current - observed) / 86400000));
}

export function calculateEvidenceMasteryScore({
  conceptId,
  evidence,
  currentDate,
}: MasteryScoringInput): MasteryScoringResult {
  const checkKinds = new Set<LearnerSkillEvidence["kind"]>([
    "placement",
    "lesson-check",
    "quiz",
  ]);
  const practiceKinds = new Set<LearnerSkillEvidence["kind"]>([
    "guided-practice",
    "reflection",
    "review",
  ]);
  const checkScore = averageScore(
    evidence
      .filter((item) => checkKinds.has(item.kind))
      .map((item) => item.scorePercent ?? 0)
  );
  const practiceScore = averageScore(
    evidence
      .filter((item) => practiceKinds.has(item.kind))
      .map((item) => item.scorePercent ?? 0)
  );
  const newestEvidence = evidence
    .slice()
    .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
  const recencyScore = newestEvidence
    ? clamp(100 - daysBetween(currentDate, newestEvidence.observedAt) * 5)
    : 0;
  const masteryPercent = clamp(checkScore * 0.45 + practiceScore * 0.35 + recencyScore * 0.2);

  return {
    conceptId,
    checkScore,
    practiceScore,
    recencyScore,
    masteryPercent,
    confidence: confidenceFrom(masteryPercent),
  };
}
