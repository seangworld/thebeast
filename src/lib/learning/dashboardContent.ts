import { getFavoriteBookmarks, learningBookmarks } from "./bookmarks";
import { builtLearningCourses } from "./courses";
import { learningResourceCollections } from "./collections";
import { getDueFlashcards } from "./flashcards";
import { getContinueStudyingLessons } from "./lessons";
import { getRecentLearningMaterials, learningLibraryMaterials } from "./library";
import { searchLearningContent } from "./search";
import { buildSpacedRepetitionSchedule } from "./spacedRepetition";
import type { LearningDashboardContent } from "./types";

export function buildLearningDashboardContent(
  today = "2026-07-04"
): LearningDashboardContent {
  const schedule = buildSpacedRepetitionSchedule(today);
  const recommendedResources = searchLearningContent({
    subject: "Cybersecurity",
    tag: "Security+",
  }).slice(0, 4);

  return {
    library: learningLibraryMaterials.filter((material) => !material.archived),
    recentMaterials: getRecentLearningMaterials(4),
    continueStudying: getContinueStudyingLessons(3),
    recommendedResources,
    flashcardsDue: getDueFlashcards().slice(0, 3),
    upcomingReview: [...schedule.overdueItems, ...schedule.dueTodayItems].slice(0, 4),
    bookmarkedItems: getFavoriteBookmarks().concat(learningBookmarks.filter((item) => !item.favorite).slice(0, 1)),
    studyCollections: learningResourceCollections,
    courseProgress: builtLearningCourses,
  };
}
