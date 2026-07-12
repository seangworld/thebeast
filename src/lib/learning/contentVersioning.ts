export type LearningContentSourceKind = "curated" | "generated" | "fixture";

export type LearningContentReviewStatus =
  | "approved"
  | "requires-review"
  | "rejected";

export type LearningContentMetadata = {
  version: string;
  sourceKind: LearningContentSourceKind;
  sourceId: string;
  sourceLabel: string;
  authoredBy: "beastlearning" | "ai-coach" | "fixture";
  reviewStatus: LearningContentReviewStatus;
  updatedAt: string;
};

export const learningContentVersion = "2026.07.12-bl23";

export function createLearningContentMetadata({
  sourceKind,
  sourceId,
  sourceLabel,
  authoredBy,
  reviewStatus,
}: {
  sourceKind: LearningContentSourceKind;
  sourceId: string;
  sourceLabel: string;
  authoredBy: LearningContentMetadata["authoredBy"];
  reviewStatus?: LearningContentReviewStatus;
}): LearningContentMetadata {
  return {
    version: learningContentVersion,
    sourceKind,
    sourceId,
    sourceLabel,
    authoredBy,
    reviewStatus: reviewStatus || (sourceKind === "generated" ? "requires-review" : "approved"),
    updatedAt: "2026-07-12",
  };
}

export function contentMetadataIsComplete(metadata: LearningContentMetadata) {
  return Boolean(
    metadata.version.trim() &&
      metadata.sourceKind &&
      metadata.sourceId.trim() &&
      metadata.sourceLabel.trim() &&
      metadata.authoredBy &&
      metadata.reviewStatus &&
      metadata.updatedAt.trim()
  );
}

export function contentRequiresReview(metadata: LearningContentMetadata) {
  return metadata.sourceKind === "generated" || metadata.reviewStatus === "requires-review";
}

export function contentCanBePublished(metadata: LearningContentMetadata) {
  return !contentRequiresReview(metadata) && metadata.reviewStatus === "approved";
}

export function generatedContentHasReviewStatus(metadata: LearningContentMetadata) {
  return metadata.sourceKind !== "generated" || metadata.reviewStatus === "requires-review";
}
