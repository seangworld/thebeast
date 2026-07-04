import type { GamificationProfile, LearningProgressSignals } from "./types";

export function calculateLearningLevel(xp: number) {
  return Math.max(1, Math.floor(xp / 500) + 1);
}

export function calculateNextLevelXp(level: number) {
  return level * 500;
}

export function buildGamificationProfile({
  progress,
  masteredConcepts,
}: {
  progress: LearningProgressSignals;
  masteredConcepts: number;
}): GamificationProfile {
  const xp =
    progress.sessionsCompleted * 120 +
    progress.currentStreakDays * 35 +
    progress.progressPercentage * 8 +
    masteredConcepts * 150;
  const level = calculateLearningLevel(xp);

  return {
    xp,
    level,
    nextLevelXp: calculateNextLevelXp(level),
    skillLevels: [
      { skill: "Security Foundations", level: 2, progress: 64 },
      { skill: "Study Rhythm", level: 3, progress: progress.currentStreakDays * 10 },
      { skill: "Review Discipline", level: 1, progress: 38 },
    ],
    journeyCompletion: progress.progressPercentage,
    milestoneCelebrations:
      progress.progressPercentage >= 40
        ? ["Path Builder milestone reached"]
        : ["First milestone in progress"],
    dailyGoal: "Complete one focused learning block.",
    weeklyGoal: `Complete ${Math.max(3, progress.sessionsCompleted + 2)} study sessions.`,
  };
}
