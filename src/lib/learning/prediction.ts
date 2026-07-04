import type { LearningMemory, MasteryProfile, ProgressPrediction } from "./types";

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function predictLearningProgress({
  mastery,
  memory,
  weeklyStudyMinutes,
  now = new Date("2026-07-03T12:00:00.000Z"),
}: {
  mastery: MasteryProfile;
  memory: LearningMemory;
  weeklyStudyMinutes: number;
  now?: Date;
}): ProgressPrediction {
  const studyConsistency = Math.min(100, memory.studyHistory.length * 20);
  const readiness = Math.min(100, Math.round((mastery.overallMasteryPercent + studyConsistency) / 2));
  const likelihoodOfSuccess = Math.min(
    100,
    Math.round(readiness + weeklyStudyMinutes / 20 - mastery.weakConcepts.length * 5)
  );
  const remainingPercent = Math.max(0, 100 - mastery.overallMasteryPercent);
  const weeks = Math.max(1, Math.ceil(remainingPercent / Math.max(5, weeklyStudyMinutes / 30)));
  const completionDate = new Date(now);
  completionDate.setDate(completionDate.getDate() + weeks * 7);

  return {
    estimatedCompletionDate: formatDate(completionDate),
    likelihoodOfSuccess,
    readiness,
    scheduleHealth:
      weeklyStudyMinutes >= 90 && studyConsistency >= 60
        ? "strong"
        : weeklyStudyMinutes >= 60
          ? "steady"
          : "at-risk",
    studyConsistency,
  };
}
