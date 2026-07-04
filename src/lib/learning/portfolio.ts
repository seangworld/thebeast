import type {
  LearnerPortfolio,
  LearningCertificate,
  LearningGoal,
  LearningProgressSignals,
} from "./types";

export function buildLearnerPortfolio({
  learnerName,
  goals,
  progress,
  certificates,
  achievementCount,
}: {
  learnerName: string;
  goals: LearningGoal[];
  progress: LearningProgressSignals;
  certificates: LearningCertificate[];
  achievementCount: number;
}): LearnerPortfolio {
  return {
    learnerName,
    activeGoals: goals.filter((goal) => goal.status === "Active").length,
    completedGoals: goals.filter((goal) => goal.status === "Completed").length,
    currentFocus: progress.weakArea,
    studyStreak: `${progress.currentStreakDays} days`,
    hoursStudied: `${(progress.estimatedWeeklyStudyMinutes / 60).toFixed(1)} this week`,
    achievements: achievementCount,
    certificates: certificates.length,
    skillsPlaceholder: ["Study rhythm", "Self-review", "Foundational practice"],
    externalCertificationsPlaceholder: ["External certifications reserved"],
    recommendedNextAction: progress.recommendedNextAction,
  };
}
