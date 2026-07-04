import type { LearningSpecialist, LearningSpecialistRole } from "./types";

export const learningSpecialists: LearningSpecialist[] = [
  { id: "tutor", role: "Tutor", description: "Explains concepts step by step.", available: false },
  { id: "study-coach", role: "Study Coach", description: "Helps plan study rhythm.", available: false },
  { id: "guidance-counselor", role: "Guidance Counselor", description: "Supports future path planning.", available: false },
  { id: "parent-assistant", role: "Parent Assistant", description: "Helps guardians support learners.", available: false },
  { id: "certification-coach", role: "Certification Coach", description: "Organizes exam prep.", available: false },
  { id: "reading-coach", role: "Reading Coach", description: "Supports reading comprehension.", available: false },
  { id: "writing-coach", role: "Writing Coach", description: "Supports writing practice.", available: false },
  { id: "language-coach", role: "Language Coach", description: "Supports language practice.", available: false },
];

export function routeMockLearningSpecialist(role: LearningSpecialistRole) {
  const specialist = learningSpecialists.find((item) => item.role === role);

  return {
    role,
    response:
      specialist?.description ||
      "Specialist placeholder is reserved for future BeastLearning intelligence.",
    status: "mocked-preview" as const,
  };
}
