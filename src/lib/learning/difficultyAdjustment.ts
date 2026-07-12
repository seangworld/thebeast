import type { PracticeDifficulty } from "./practiceTemplates";

export type DifficultyAdjustmentSignal = {
  conceptId: string;
  subject?: string;
  currentDifficulty: PracticeDifficulty;
  checkScore?: number;
  practiceScore?: number;
  recencyScore?: number;
  attempts: number;
  hintsUsed: number;
};

export type DifficultyAdjustment = {
  conceptId: string;
  subject?: string;
  previousDifficulty: PracticeDifficulty;
  recommendedDifficulty: PracticeDifficulty;
  direction: "easier" | "hold" | "harder";
  reason: string;
};

const difficultyOrder: PracticeDifficulty[] = [
  "introductory",
  "developing",
  "challenge",
];

function clampPercent(value: number | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function moveDifficulty(
  currentDifficulty: PracticeDifficulty,
  offset: -1 | 0 | 1
) {
  const currentIndex = Math.max(0, difficultyOrder.indexOf(currentDifficulty));
  const nextIndex = Math.max(
    0,
    Math.min(difficultyOrder.length - 1, currentIndex + offset)
  );

  return difficultyOrder[nextIndex];
}

export function adjustLearningDifficulty({
  conceptId,
  subject,
  currentDifficulty,
  checkScore,
  practiceScore,
  recencyScore,
  attempts,
  hintsUsed,
}: DifficultyAdjustmentSignal): DifficultyAdjustment {
  const check = clampPercent(checkScore);
  const practice = clampPercent(practiceScore);
  const recency = clampPercent(recencyScore);
  const supportLoad = attempts > 0 ? hintsUsed / attempts : hintsUsed;
  const successScore = Math.round(check * 0.45 + practice * 0.4 + recency * 0.15);
  const struggling = successScore < 60 || supportLoad >= 0.75;
  const succeeding = successScore >= 85 && supportLoad <= 0.35;
  const offset = succeeding ? 1 : struggling ? -1 : 0;
  const recommendedDifficulty = moveDifficulty(currentDifficulty, offset);
  const direction =
    recommendedDifficulty === currentDifficulty
      ? "hold"
      : offset > 0
        ? "harder"
        : "easier";

  return {
    conceptId,
    subject,
    previousDifficulty: currentDifficulty,
    recommendedDifficulty,
    direction,
    reason:
      direction === "harder"
        ? "Recent success is strong with low support, so the next practice can increase challenge."
        : direction === "easier"
          ? "Recent evidence shows struggle or high support, so the next practice should reduce difficulty."
          : "Evidence is mixed or already at the boundary, so the next practice should hold difficulty.",
  };
}
