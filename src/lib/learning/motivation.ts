import type {
  LearningProgressSignals,
  MotivationSnapshot,
  StudyHabitsSnapshot,
} from "./types";

export function buildMotivationSnapshot({
  progress,
  habits,
}: {
  progress: LearningProgressSignals;
  habits: StudyHabitsSnapshot;
}): MotivationSnapshot {
  const streakMessage =
    progress.currentStreakDays >= 7
      ? `${progress.currentStreakDays} days in a row. Protect the rhythm.`
      : "One short session keeps the streak alive.";

  return {
    dailyEncouragement: `Start with ${progress.weakArea}. Keep it small and specific.`,
    nextMilestone: progress.recommendedNextAction,
    celebrationMessage:
      progress.progressPercentage >= 40
        ? "You crossed the first real path-building checkpoint."
        : "You are building the foundation one session at a time.",
    streakReminder: streakMessage,
    goalReminder: `Your best learning day is ${habits.bestLearningDay}. Use that pattern again.`,
  };
}
