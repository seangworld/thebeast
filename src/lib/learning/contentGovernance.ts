import type {
  LearningBuiltCourse,
  LearningLessonModel,
  LearningRecommendation,
  LearningStudyGuide,
} from "./types";

export type LearningContentStatus =
  | "implemented"
  | "planned"
  | "requires-review";

export type LearningContentReviewArea =
  | "accuracy"
  | "age-appropriateness"
  | "accessibility"
  | "safety";

export type LearningContentStatusLabel = {
  contentId: string;
  contentType: "course" | "lesson" | "study-guide" | "recommendation";
  status: LearningContentStatus;
  rationale: string;
};

export type LearningContentReviewRequirement = {
  area: LearningContentReviewArea;
  required: true;
  standard: string;
};

export type LearningContentQualityReviewItem = {
  area: LearningContentReviewArea;
  reviewer: "beastlearning" | "admin" | "owner";
  status: "approved" | "requires-changes";
  notes: string;
  reviewedAt: string;
};

export type LearningContentQualityReview = {
  contentId: string;
  contentType: "lesson" | "assessment" | "study-guide" | "recommendation";
  items: LearningContentQualityReviewItem[];
};

export type LearningContentQualityReviewResult = {
  contentId: string;
  complete: boolean;
  approved: boolean;
  missingAreas: LearningContentReviewArea[];
  blockedAreas: LearningContentReviewArea[];
};

export type LearningStarterPathStandard = {
  id: string;
  standard: string;
  required: true;
};

export const learningContentReviewRequirements: LearningContentReviewRequirement[] = [
  {
    area: "accuracy",
    required: true,
    standard:
      "Claims must map to implemented lesson, guide, quiz, practice, or recommendation content.",
  },
  {
    area: "age-appropriateness",
    required: true,
    standard:
      "Language and examples must fit the intended learner context without adult-only assumptions.",
  },
  {
    area: "accessibility",
    required: true,
    standard:
      "Content must remain usable as text and not depend only on color, motion, or hidden context.",
  },
  {
    area: "safety",
    required: true,
    standard:
      "Learning content must avoid school-compliance, accredited outcome, therapy, or guaranteed-result claims.",
  },
];

export const learningStarterPathStandards: LearningStarterPathStandard[] = [
  {
    id: "implemented-source",
    required: true,
    standard:
      "Starter paths may claim only subjects, lessons, and activities represented in implemented data.",
  },
  {
    id: "review-before-public-copy",
    required: true,
    standard:
      "Public copy must wait for source evidence and SEANGWORLD publishing approval.",
  },
  {
    id: "status-visible",
    required: true,
    standard:
      "Implemented, planned, and requires-review content states must be visible in release evidence.",
  },
];

export const thirdPartyLearningSiteDirection = {
  status: "planned" as const,
  planningOnly: true,
  rule:
    "Third-party learning sites may be discussed as planning context only; no integration exists until owner-approved implementation scope is recorded.",
};

export function buildRequiredContentQualityReview({
  contentId,
  contentType,
  reviewer = "beastlearning",
}: {
  contentId: string;
  contentType: LearningContentQualityReview["contentType"];
  reviewer?: LearningContentQualityReviewItem["reviewer"];
}): LearningContentQualityReview {
  return {
    contentId,
    contentType,
    items: learningContentReviewRequirements.map((requirement) => ({
      area: requirement.area,
      reviewer,
      status: "requires-changes",
      notes: requirement.standard,
      reviewedAt: "2026-07-12",
    })),
  };
}

export function evaluateContentQualityReview(
  review: LearningContentQualityReview
): LearningContentQualityReviewResult {
  const reviewedAreas = new Set(review.items.map((item) => item.area));
  const missingAreas = learningContentReviewRequirements
    .map((requirement) => requirement.area)
    .filter((area) => !reviewedAreas.has(area));
  const blockedAreas = review.items
    .filter((item) => item.status !== "approved")
    .map((item) => item.area);

  return {
    contentId: review.contentId,
    complete: missingAreas.length === 0,
    approved: missingAreas.length === 0 && blockedAreas.length === 0,
    missingAreas,
    blockedAreas,
  };
}

export function getCourseContentStatus(
  course: Pick<LearningBuiltCourse, "id" | "modules" | "completed">
): LearningContentStatusLabel {
  const activities = course.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) =>
      lesson.topics.flatMap((topic) => topic.activities)
    )
  );
  const hasIncompleteActivities = activities.some((activity) => !activity.completed);

  return {
    contentId: course.id,
    contentType: "course",
    status: course.completed
      ? "implemented"
      : hasIncompleteActivities
        ? "requires-review"
        : "planned",
    rationale: course.completed
      ? "Course content is represented as completed implementation data."
      : "Course contains implemented structure with remaining review or completion work.",
  };
}

export function getLessonContentStatus(
  lesson: Pick<LearningLessonModel, "id" | "completionStatus">
): LearningContentStatusLabel {
  return {
    contentId: lesson.id,
    contentType: "lesson",
    status:
      lesson.completionStatus === "Completed"
        ? "implemented"
        : "requires-review",
    rationale:
      lesson.completionStatus === "Completed"
        ? "Lesson has completed implementation evidence."
        : "Lesson is available but still needs review before broad claims.",
  };
}

export function getStudyGuideContentStatus(
  guide: Pick<LearningStudyGuide, "id" | "importantFacts" | "reviewChecklist">
): LearningContentStatusLabel {
  const hasReviewEvidence =
    guide.importantFacts.length > 0 && guide.reviewChecklist.length > 0;

  return {
    contentId: guide.id,
    contentType: "study-guide",
    status: hasReviewEvidence ? "implemented" : "requires-review",
    rationale: hasReviewEvidence
      ? "Study guide has fact and review-checklist evidence."
      : "Study guide needs source facts and review checklist before publication claims.",
  };
}

export function getRecommendationContentStatus(
  recommendation: Pick<LearningRecommendation, "id" | "reason" | "completed">
): LearningContentStatusLabel {
  return {
    contentId: recommendation.id,
    contentType: "recommendation",
    status: recommendation.reason ? "implemented" : "requires-review",
    rationale: recommendation.reason
      ? "Recommendation includes a rule-based reason."
      : "Recommendation needs an explicit reason before surfaced claims.",
  };
}
