import type { ParentDashboard } from "./types";

export const mockParentDashboard: ParentDashboard = {
  householdName: "Family learning overview",
  learners: [
    {
      learnerName: "Current learner",
      weeklyStudyActivity: "3 planned blocks, 1 completed",
      activeGoals: ["Security+"],
      achievements: ["Study Streak"],
      suggestedEncouragement: "Celebrate the steady streak before adding more work.",
      areasNeedingAttention: ["Spanish Daily Practice"],
      nextRecommendedParentAction:
        "Ask what made the last session easier and help protect the next study block.",
    },
    {
      learnerName: "Family member",
      weeklyStudyActivity: "Learning activity will appear after this learner starts a plan.",
      activeGoals: ["8th Grade Math"],
      achievements: ["Coming next"],
      suggestedEncouragement: "Keep the next check-in calm, short, and specific.",
      areasNeedingAttention: ["Algebra foundations"],
      nextRecommendedParentAction:
        "Identify the next assignment or confusing topic before the study session.",
    },
  ],
};
