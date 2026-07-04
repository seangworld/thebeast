import type { LearningGoal, LearningJourney } from "./types";

export function buildLearningJourneys(goals: LearningGoal[]): LearningJourney[] {
  return goals.map((goal) => ({
    id: `${goal.id}-journey`,
    title: goal.title,
    active: goal.status === "Active",
    steps: [
      {
        id: `${goal.id}-goal`,
        kind: "goal",
        title: goal.target,
        status: "complete",
        progress: 100,
      },
      {
        id: `${goal.id}-milestone`,
        kind: "milestone",
        title: "First milestone",
        status: goal.progress >= 25 ? "complete" : "active",
        progress: Math.min(goal.progress * 2, 100),
      },
      {
        id: `${goal.id}-course`,
        kind: "course",
        title: `${goal.title} course path`,
        status: "active",
        progress: goal.progress,
      },
      {
        id: `${goal.id}-lesson`,
        kind: "lesson",
        title: "Next focused lesson",
        status: goal.progress >= 75 ? "complete" : "active",
        progress: Math.min(goal.progress + 15, 100),
      },
      {
        id: `${goal.id}-mastery`,
        kind: "mastery",
        title: "Mastery check",
        status: goal.progress >= 90 ? "active" : "upcoming",
        progress: Math.max(goal.progress - 10, 0),
      },
      {
        id: `${goal.id}-completion`,
        kind: "completion",
        title: "Completion record",
        status: goal.status === "Completed" ? "complete" : "upcoming",
        progress: goal.status === "Completed" ? 100 : 0,
      },
    ],
  }));
}
