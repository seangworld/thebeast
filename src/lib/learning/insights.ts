import type {
  GamificationProfile,
  LearnerInsight,
  LearningProgressSignals,
  StudyHabitsSnapshot,
} from "./types";

export function buildLearnerInsights({
  progress,
  habits,
  gamification,
}: {
  progress: LearningProgressSignals;
  habits: StudyHabitsSnapshot;
  gamification: GamificationProfile;
}): LearnerInsight[] {
  return [
    {
      id: "session-length",
      title: "Session length fit",
      detail: `You learn best in ${habits.averageSessionLength} sessions.`,
      tone: "positive",
    },
    {
      id: "consistency",
      title: "Consistency trend",
      detail:
        habits.weeklyMomentum >= habits.monthlyMomentum
          ? "Your consistency improved this week."
          : "Your weekly rhythm dipped below your monthly baseline.",
      tone: habits.weeklyMomentum >= habits.monthlyMomentum ? "positive" : "warning",
    },
    {
      id: "mastery",
      title: "Mastery progress",
      detail: `You have mastered ${Math.max(1, gamification.level - 1)} skill levels so far.`,
      tone: "neutral",
    },
    {
      id: "review-skip",
      title: "Review behavior",
      detail:
        progress.weakArea.toLowerCase().includes("review")
          ? "You tend to skip reviews when the work feels familiar."
          : "Reviews are ready before the next new lesson.",
      tone: "warning",
    },
  ];
}
