import type { LearningSpecialist, LearningSpecialistRole } from "./types";

export const learningSpecialists: LearningSpecialist[] = [
  { id: "tutor", role: "Tutor", description: "Explains concepts step by step.", available: false },
  { id: "general-academic-tutor", role: "General Academic Tutor", description: "Supports broad academic lessons when no specialist is a better fit.", available: true },
  { id: "study-coach", role: "Study Coach", description: "Helps plan study rhythm.", available: false },
  { id: "homework-coach", role: "Homework Coach", description: "Guides homework with hints and reasoning.", available: false },
  { id: "mentor", role: "Mentor", description: "Supports path planning and long-term goals.", available: false },
  { id: "career-mentor", role: "Career Mentor", description: "Connects learning to career direction.", available: false },
  { id: "parent-assistant", role: "Parent Assistant", description: "Helps guardians support learners.", available: false },
  { id: "certification-coach", role: "Certification Coach", description: "Organizes exam prep.", available: false },
  { id: "certification-tutor", role: "Certification Tutor", description: "Teaches certification-aligned objectives and practice.", available: true },
  { id: "reading-coach", role: "Reading Coach", description: "Supports reading comprehension.", available: false },
  { id: "writing-coach", role: "Writing Coach", description: "Supports writing practice.", available: false },
  { id: "language-coach", role: "Language Coach", description: "Supports language practice.", available: false },
  { id: "math-tutor", role: "Math Tutor", description: "Teaches math concepts, practice steps, and error repair.", available: true },
  { id: "science-tutor", role: "Science Tutor", description: "Teaches science concepts, models, and evidence-based reasoning.", available: true },
  { id: "math-coach", role: "Math Coach", description: "Guides math practice and reasoning.", available: false },
  { id: "science-coach", role: "Science Coach", description: "Supports science concepts and labs.", available: false },
  { id: "coding-coach", role: "Coding Coach", description: "Guides programming practice.", available: false },
  { id: "trade-instructor", role: "Trade Instructor", description: "Supports trade skill practice.", available: false },
  { id: "interview-coach", role: "Interview Coach", description: "Prepares career interview practice.", available: false },
  { id: "motivation-coach", role: "Motivation Coach", description: "Encourages steady progress.", available: false },
];

export function routeMockLearningSpecialist(role: LearningSpecialistRole) {
  const specialist = learningSpecialists.find((item) => item.role === role);

  return {
    role,
    response:
      specialist?.description ||
      "This specialist will become available as Beast learns more about the learner.",
    status: "mocked-preview" as const,
  };
}
