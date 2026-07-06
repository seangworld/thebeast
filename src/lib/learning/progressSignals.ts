import type {
  LearningAchievement,
  LearningCourse,
  LearningGoal,
  LearningPlan,
  LearningProgressSignals,
  LearningSession,
  StudySessionCommand,
} from "./types";

type LearningProgressInput = {
  goals: LearningGoal[];
  courses: LearningCourse[];
  plan: LearningPlan;
  sessions: LearningSession[];
  achievements: LearningAchievement[];
  studySession: StudySessionCommand;
};

function parseDurationMinutes(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

function formatStudyTime(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours.toFixed(0) : hours.toFixed(1)} hr`;
}

function getCurrentStreakDays(achievements: LearningAchievement[]) {
  const streakAchievement = achievements.find(
    (achievement) =>
      achievement.earned && achievement.title.toLowerCase().includes("streak")
  );
  const match = streakAchievement?.title.match(/(\d+)/);

  return match ? Number(match[1]) : 0;
}

function getWeakArea(courses: LearningCourse[]) {
  const lowestProgressCourse = [...courses].sort(
    (a, b) => a.progress - b.progress
  )[0];

  return lowestProgressCourse?.title || "No weak area identified yet";
}

export function buildLearningProgressSignals(
  input: LearningProgressInput
): LearningProgressSignals {
  const activeGoalsCount = input.goals.filter(
    (goal) => goal.status === "Active"
  ).length;
  const currentStreakDays = getCurrentStreakDays(input.achievements);
  const sessionsCompleted = input.sessions.filter(
    (session) => session.status === "Completed"
  ).length;
  const estimatedWeeklyStudyMinutes = input.sessions.reduce(
    (total, session) => total + parseDurationMinutes(session.duration),
    0
  );
  const currentCourse =
    input.courses.find((course) => course.id === input.plan.currentCourseId) ||
    input.courses[0];
  const progressPercentage = currentCourse?.progress || 0;
  const readinessScore = Math.min(
    100,
    progressPercentage +
      Math.min(currentStreakDays * 2, 14) +
      activeGoalsCount * 8 +
      sessionsCompleted * 8
  );
  const weakArea = getWeakArea(input.courses);
  const recommendedNextAction =
    sessionsCompleted > 0
      ? `Review ${weakArea} after ${input.studySession.currentFocus}.`
      : `Start today's ${input.studySession.estimatedTime} study session.`;

  return {
    activeGoalsCount,
    currentStreakDays,
    sessionsCompleted,
    estimatedWeeklyStudyMinutes,
    progressPercentage,
    readinessScore,
    weakArea,
    recommendedNextAction,
    snapshotTiles: [
      {
        id: "active-goals",
        label: "Active Goals",
        value: String(activeGoalsCount),
        detail: `${input.goals.length} total goals mapped`,
        icon: "AG",
        tone: "purple",
      },
      {
        id: "study-streak",
        label: "Study Streak",
        value: `${currentStreakDays} days`,
        detail: "Placeholder streak signal",
        icon: "ST",
        tone: "green",
      },
      {
        id: "sessions-completed",
        label: "Sessions Done",
        value: String(sessionsCompleted),
        detail: "Completed sessions this sample week",
        icon: "SD",
        tone: "blue",
      },
      {
        id: "weekly-study-time",
        label: "Weekly Study",
        value: formatStudyTime(estimatedWeeklyStudyMinutes),
        detail: `${input.plan.weeklySessionTarget} target sessions`,
        icon: "WT",
        tone: "yellow",
      },
      {
        id: "readiness-score",
        label: "Readiness",
        value: `${readinessScore}%`,
        detail: "Current readiness signal",
        icon: "RS",
        tone: "purple",
      },
    ],
  };
}
