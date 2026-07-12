export type LearningContentSourceKind = "curated" | "generated" | "fixture";

export type LearningContentMetadata = {
  version: string;
  sourceKind: LearningContentSourceKind;
  sourceId: string;
  sourceLabel: string;
  authoredBy: "beastlearning" | "ai-coach" | "fixture";
  updatedAt: string;
};

export const learningContentVersion = "2026.07.12-bl23";

export function createLearningContentMetadata({
  sourceKind,
  sourceId,
  sourceLabel,
  authoredBy,
}: {
  sourceKind: LearningContentSourceKind;
  sourceId: string;
  sourceLabel: string;
  authoredBy: LearningContentMetadata["authoredBy"];
}): LearningContentMetadata {
  return {
    version: learningContentVersion,
    sourceKind,
    sourceId,
    sourceLabel,
    authoredBy,
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
      metadata.updatedAt.trim()
  );
}
