import { learningFlashcards } from "./flashcards";
import type { SpacedRepetitionItem, SpacedRepetitionSchedule } from "./types";

export const spacedRepetitionItems: SpacedRepetitionItem[] = [
  {
    id: "review-rbac",
    itemType: "flashcard",
    itemId: "flashcard-rbac",
    firstReview: "2026-07-01",
    nextReview: "2026-07-04",
    reviewIntervalDays: 1,
    mastery: "learning",
    priority: "High",
  },
  {
    id: "review-mfa",
    itemType: "flashcard",
    itemId: "flashcard-mfa",
    firstReview: "2026-07-02",
    nextReview: "2026-07-05",
    reviewIntervalDays: 3,
    mastery: "review",
    priority: "Medium",
  },
  {
    id: "review-quadratic",
    itemType: "flashcard",
    itemId: "flashcard-quadratic",
    firstReview: "2026-07-03",
    nextReview: "2026-07-03",
    reviewIntervalDays: 1,
    mastery: "new",
    priority: "High",
  },
];

export function buildSpacedRepetitionSchedule(today = "2026-07-04"): SpacedRepetitionSchedule {
  return {
    today,
    items: spacedRepetitionItems,
    overdueItems: spacedRepetitionItems.filter((item) => item.nextReview < today),
    dueTodayItems: spacedRepetitionItems.filter((item) => item.nextReview === today),
  };
}

export function getFlashcardsDueForReview(today = "2026-07-04") {
  const dueIds = new Set(
    spacedRepetitionItems
      .filter((item) => item.itemType === "flashcard" && item.nextReview <= today)
      .map((item) => item.itemId)
  );

  return learningFlashcards.filter((card) => dueIds.has(card.id));
}
