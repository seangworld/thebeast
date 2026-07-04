import { mockLearningMemory } from "./learningMemory";
import type { StudyHabitsSnapshot } from "./types";

function mostCommonWeekday(dates: string[]) {
  const counts = dates.reduce<Record<string, number>>((acc, date) => {
    const day = new Date(`${date}T12:00:00.000Z`).toLocaleDateString("en-US", {
      weekday: "long",
      timeZone: "UTC",
    });
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Not enough data";
}

export function buildStudyHabitsSnapshot(): StudyHabitsSnapshot {
  const sessions = mockLearningMemory.studyHistory;
  const totalMinutes = sessions.reduce((sum, session) => sum + session.minutes, 0);
  const averageMinutes = sessions.length ? Math.round(totalMinutes / sessions.length) : 0;

  return {
    preferredStudyTimes: ["Morning focus block", "Evening review"],
    averageSessionLength: `${averageMinutes || 30} min`,
    consistency: Math.min(100, sessions.length * 20),
    weeklyMomentum: 72,
    monthlyMomentum: 58,
    bestLearningDay: mostCommonWeekday(sessions.map((session) => session.date)),
    favoriteSubjects: mockLearningMemory.favoriteSubjects,
  };
}
