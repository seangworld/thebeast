import type { LearningQuiz } from "./types";

export const learningQuizzes: LearningQuiz[] = [
  {
    id: "security-access-quiz",
    title: "Access Control Check",
    subject: "Cybersecurity",
    attempts: 1,
    score: 72,
    reviewRequired: true,
    questions: [
      {
        id: "rbac-multiple-choice",
        type: "multiple choice",
        prompt: "Which model assigns permissions through roles?",
        options: ["DAC", "RBAC", "MAC", "ABAC"],
        answerPlaceholder: "RBAC",
      },
      {
        id: "least-privilege-true-false",
        type: "true/false",
        prompt: "Least privilege means giving every user administrator access.",
        options: ["True", "False"],
        answerPlaceholder: "False",
      },
      {
        id: "auth-fill-blank",
        type: "fill in blank",
        prompt: "A password is something you ____.",
        answerPlaceholder: "know",
      },
    ],
  },
];

export function getQuizzesRequiringReview() {
  return learningQuizzes.filter((quiz) => quiz.reviewRequired);
}
