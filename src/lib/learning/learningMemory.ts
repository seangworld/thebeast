import type { LearningMemory } from "./types";

export const mockLearningMemory: LearningMemory = {
  recentlyStudied: ["identity-verification", "role-based-access", "functions"],
  recentlyMastered: ["linear-equations"],
  frequentlyMissed: ["quadratic-equations", "role-based-access"],
  favoriteSubjects: ["Cybersecurity", "Math foundations"],
  preferredSessionLength: "35 min",
  learningPace: "Focused: 5 sessions per week",
  studyHistory: [
    { date: "2026-07-01", conceptId: "identity-verification", minutes: 35 },
    { date: "2026-07-02", conceptId: "role-based-access", minutes: 25 },
    { date: "2026-07-03", conceptId: "functions", minutes: 20 },
  ],
};
