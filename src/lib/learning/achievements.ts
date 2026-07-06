import type {
  LearningAchievementCatalogItem,
  LearningAchievementUnlock,
  LearningProgressSignals,
} from "./types";

export const learningAchievementCatalog: LearningAchievementCatalogItem[] = [
  {
    id: "first-study-session",
    title: "First Study Session",
    description: "Complete your first BeastLearning study session.",
    trigger: "first_session",
    threshold: 1,
  },
  {
    id: "seven-day-streak",
    title: "Study Streak",
    description: "Build a 7-day study rhythm.",
    trigger: "study_streak",
    threshold: 7,
  },
  {
    id: "five-sessions-completed",
    title: "Sessions Completed",
    description: "Complete 5 focused learning sessions.",
    trigger: "sessions_completed",
    threshold: 5,
  },
  {
    id: "first-goal-created",
    title: "Goal Setter",
    description: "Create your first learning goal.",
    trigger: "goals_created",
    threshold: 1,
  },
  {
    id: "goal-completed",
    title: "Goal Finisher",
    description: "Complete a learning goal.",
    trigger: "goals_completed",
    threshold: 1,
  },
  {
    id: "path-progress",
    title: "Path Builder",
    description: "Reach 40% progress on a learning path.",
    trigger: "path_progress",
    threshold: 40,
  },
  {
    id: "skills-mastered-placeholder",
    title: "Skills Mastered",
    description: "Earned as mastered skills accumulate.",
    trigger: "skills_mastered",
    threshold: 1,
  },
  {
    id: "founding-student",
    title: "Founding Student",
    description: "Recognizes early BeastLearning beta participation.",
    trigger: "founding_student",
    threshold: 1,
  },
];

export function buildLearningAchievementUnlocks({
  progress,
  goalsCreated,
  goalsCompleted,
  masteredSkills,
  foundingStudent,
}: {
  progress: LearningProgressSignals;
  goalsCreated: number;
  goalsCompleted: number;
  masteredSkills: number;
  foundingStudent: boolean;
}): LearningAchievementUnlock[] {
  return learningAchievementCatalog.map((achievement) => {
    const valueByTrigger: Record<LearningAchievementCatalogItem["trigger"], number> = {
      first_session: progress.sessionsCompleted,
      study_streak: progress.currentStreakDays,
      sessions_completed: progress.sessionsCompleted,
      goals_created: goalsCreated,
      goals_completed: goalsCompleted,
      path_progress: progress.progressPercentage,
      skills_mastered: masteredSkills,
      founding_student: foundingStudent ? 1 : 0,
    };
    const currentValue = valueByTrigger[achievement.trigger];

    return {
      ...achievement,
      progress: Math.min(currentValue, achievement.threshold),
      unlocked: currentValue >= achievement.threshold,
    };
  });
}
