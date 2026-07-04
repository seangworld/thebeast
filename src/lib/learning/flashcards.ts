import type { LearningFlashcard } from "./types";

export const learningFlashcards: LearningFlashcard[] = [
  {
    id: "flashcard-rbac",
    front: "What does RBAC stand for?",
    back: "Role-Based Access Control.",
    category: "Cybersecurity",
    difficulty: "Beginner",
    tags: ["Security+", "access control"],
    mastery: "learning",
    reviewSchedulePlaceholder: "Due today",
  },
  {
    id: "flashcard-mfa",
    front: "Name the three common authentication factor categories.",
    back: "Something you know, something you have, and something you are.",
    category: "Cybersecurity",
    difficulty: "Intermediate",
    tags: ["Security+", "authentication"],
    mastery: "review",
    reviewSchedulePlaceholder: "Due tomorrow",
  },
  {
    id: "flashcard-quadratic",
    front: "What is the standard form of a quadratic equation?",
    back: "ax^2 + bx + c = 0.",
    category: "Math",
    difficulty: "Beginner",
    tags: ["algebra", "quadratics"],
    mastery: "new",
    reviewSchedulePlaceholder: "First review pending",
  },
];

export function getDueFlashcards() {
  return learningFlashcards.filter((card) =>
    ["new", "learning", "review"].includes(card.mastery)
  );
}
