import type { LearningPracticeExam } from "./types";

export const learningPracticeExams: LearningPracticeExam[] = [
  {
    id: "security-plus-readiness-exam",
    title: "Security+ Readiness Exam",
    subject: "Cybersecurity",
    timed: true,
    durationMinutes: 90,
    completed: false,
    sections: [
      {
        id: "security-concepts-section",
        title: "General Security Concepts",
        questionPoolIds: ["rbac-multiple-choice", "least-privilege-true-false"],
        durationMinutes: 30,
      },
      {
        id: "identity-section",
        title: "Identity and Access",
        questionPoolIds: ["auth-fill-blank"],
        durationMinutes: 30,
      },
    ],
    result: {
      attempts: 0,
      bestScore: 0,
      reviewMode: false,
    },
  },
];

export function getPracticeExamFrameworkSummary() {
  const exam = learningPracticeExams[0];

  return {
    totalExams: learningPracticeExams.length,
    timedExams: learningPracticeExams.filter((item) => item.timed).length,
    sectionCount: exam?.sections.length || 0,
  };
}
