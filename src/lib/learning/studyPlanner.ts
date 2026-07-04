import type { StudyPlanner } from "./types";

export const mockStudyPlanner: StudyPlanner = {
  weeklyRhythm: [
    "Monday: Foundation review",
    "Wednesday: Guided practice",
    "Friday: Weak area checkpoint",
  ],
  upcomingBlocks: [
    {
      id: "security-review-block",
      title: "Authentication review",
      when: "Today",
      duration: "35 min",
      module: "Learning",
    },
    {
      id: "networking-practice-block",
      title: "Subnetting practice",
      when: "Tomorrow",
      duration: "25 min",
      module: "Learning",
    },
  ],
  milestones: [
    {
      id: "domain-one-review",
      title: "Finish first Security+ domain review",
      targetDate: "This week",
      status: "in-progress",
    },
    {
      id: "weak-area-checkpoint",
      title: "Review weakest course area",
      targetDate: "Next week",
      status: "planned",
    },
  ],
  examsAndDeadlines: [
    {
      id: "exam-date-placeholder",
      title: "Exam date placeholder",
      targetDate: "Not scheduled",
      status: "placeholder",
    },
  ],
  placeholderActions: ["Schedule study time", "Add exam date", "Create reminder"],
};
