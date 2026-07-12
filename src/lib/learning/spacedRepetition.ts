import { learningFlashcards } from "./flashcards";
import type { SpacedRepetitionItem, SpacedRepetitionSchedule } from "./types";
import { getBeastDateKey } from "../runtimeDate";

export type MasteryDecayReviewInput = {
  conceptId: string;
  itemId?: string;
  masteryPercent: number;
  lastStudiedAt: string;
};

export type ForgottenSkillReviewInput = MasteryDecayReviewInput & {
  previouslyMastered: boolean;
  masteryFloorPercent?: number;
};

export type ForgottenSkillReview = SpacedRepetitionItem & {
  reason: "mastery-decay" | "overdue-review";
  decayedMasteryPercent: number;
};

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

export function buildSpacedRepetitionSchedule(
  today = getBeastDateKey()
): SpacedRepetitionSchedule {
  return {
    today,
    items: spacedRepetitionItems,
    overdueItems: spacedRepetitionItems.filter((item) => item.nextReview < today),
    dueTodayItems: spacedRepetitionItems.filter((item) => item.nextReview === today),
  };
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(currentDate: string, previousDate: string) {
  const current = Date.parse(`${currentDate}T00:00:00Z`);
  const previous = Date.parse(`${previousDate}T00:00:00Z`);
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  return Math.max(0, Math.round((current - previous) / 86400000));
}

function priorityFromMastery(value: number): SpacedRepetitionItem["priority"] {
  if (value < 50) return "High";
  if (value < 75) return "Medium";
  return "Low";
}

function masteryLabelFromPercent(value: number): SpacedRepetitionItem["mastery"] {
  if (value < 45) return "new";
  if (value < 75) return "learning";
  return "review";
}

function reviewIntervalFromMastery(value: number) {
  if (value < 40) return 0;
  if (value < 60) return 1;
  if (value < 80) return 3;
  return 7;
}

export function generateMasteryDecayReviewSchedule({
  concepts,
  today = getBeastDateKey(),
}: {
  concepts: MasteryDecayReviewInput[];
  today?: string;
}): SpacedRepetitionSchedule {
  const items = concepts.map((concept) => {
    const daysSinceStudy = daysBetween(today, concept.lastStudiedAt);
    const decayedMastery = Math.max(
      0,
      Math.min(100, Math.round(concept.masteryPercent - daysSinceStudy * 2))
    );
    const reviewIntervalDays = reviewIntervalFromMastery(decayedMastery);

    return {
      id: `review-${concept.conceptId}`,
      itemType: "lesson" as const,
      itemId: concept.itemId || concept.conceptId,
      firstReview: concept.lastStudiedAt,
      nextReview: addDays(today, reviewIntervalDays),
      reviewIntervalDays,
      mastery: masteryLabelFromPercent(decayedMastery),
      priority: priorityFromMastery(decayedMastery),
    };
  });

  return {
    today,
    items,
    overdueItems: items.filter((item) => item.nextReview < today),
    dueTodayItems: items.filter((item) => item.nextReview === today),
  };
}

export function detectForgottenSkillReviews({
  concepts,
  today = getBeastDateKey(),
}: {
  concepts: ForgottenSkillReviewInput[];
  today?: string;
}): ForgottenSkillReview[] {
  return concepts
    .filter((concept) => concept.previouslyMastered)
    .map((concept) => {
      const daysSinceStudy = daysBetween(today, concept.lastStudiedAt);
      const decayedMastery = Math.max(
        0,
        Math.min(100, Math.round(concept.masteryPercent - daysSinceStudy * 2))
      );
      const masteryFloor = concept.masteryFloorPercent ?? 80;
      const reviewIntervalDays = reviewIntervalFromMastery(decayedMastery);
      const nextReview = addDays(concept.lastStudiedAt, reviewIntervalDays);
      const reason: ForgottenSkillReview["reason"] =
        decayedMastery < masteryFloor ? "mastery-decay" : "overdue-review";

      return {
        id: `forgotten-${concept.conceptId}`,
        itemType: "lesson" as const,
        itemId: concept.itemId || concept.conceptId,
        firstReview: concept.lastStudiedAt,
        nextReview,
        reviewIntervalDays,
        mastery: masteryLabelFromPercent(decayedMastery),
        priority: priorityFromMastery(decayedMastery),
        reason,
        decayedMasteryPercent: decayedMastery,
      };
    })
    .filter(
      (review) =>
        review.reason === "mastery-decay" || review.nextReview <= today
    )
    .sort((a, b) => {
      const priorityOrder = { High: 0, Medium: 1, Low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
}

export function getFlashcardsDueForReview(today = getBeastDateKey()) {
  const dueIds = new Set(
    spacedRepetitionItems
      .filter((item) => item.itemType === "flashcard" && item.nextReview <= today)
      .map((item) => item.itemId)
  );

  return learningFlashcards.filter((card) => dueIds.has(card.id));
}
