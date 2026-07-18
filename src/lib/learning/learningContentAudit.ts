import type { DynamicLessonGenerationInput, DynamicLessonGenerationResult } from "./dynamicLessonGenerator";

export type LearningArtifactKind = "generated_lesson" | "generated_assessment";
export type LearningArtifactReviewDecision = "requires-review" | "approved" | "rejected";

export type LearningArtifactReview = {
  decision: LearningArtifactReviewDecision;
  reviewedAt?: string;
  reviewedBy?: string;
  note?: string;
};

export type LearningArtifactAuditRecord = {
  id: string;
  generationId: string;
  artifactId: string;
  artifactKind: LearningArtifactKind;
  parentLessonId?: string;
  courseId: string;
  authorityMappingId?: string;
  objectiveIds: string[];
  contentVersion: string;
  sourceId: string;
  sourceLabel: string;
  authoredBy: "ai-coach";
  generatedAt: string;
  generationMode: string;
  learnerLevel: string;
  goal: string;
  meaning: string;
  evidenceRefs: string[];
  review: LearningArtifactReview;
};

export type LearningContentAuditBundle = {
  generationId: string;
  lesson: LearningArtifactAuditRecord;
  assessments: LearningArtifactAuditRecord[];
  productionEligible: boolean;
  issues: string[];
};

const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/;

function hasDateTime(value?: string) {
  return Boolean(value && DATE_TIME.test(value) && !Number.isNaN(Date.parse(value)));
}

export function validateLearningArtifactAudit(record: LearningArtifactAuditRecord): string[] {
  const issues: string[] = [];
  if (!record.id.trim() || !record.generationId.trim() || !record.artifactId.trim()) issues.push("Learning artifact audit records require trace identifiers.");
  if (!record.courseId.trim()) issues.push(`Learning artifact ${record.artifactId} requires a course id.`);
  if (!record.contentVersion.trim() || !record.sourceId.trim() || !record.sourceLabel.trim()) issues.push(`Learning artifact ${record.artifactId} requires complete source metadata.`);
  if (!hasDateTime(record.generatedAt)) issues.push(`Learning artifact ${record.artifactId} has invalid generation timestamp.`);
  if (!record.meaning.trim()) issues.push(`Learning artifact ${record.artifactId} must explain what the generated content means.`);
  if (record.artifactKind === "generated_assessment" && !record.parentLessonId?.trim()) issues.push(`Generated assessment ${record.artifactId} requires a parent lesson trace.`);
  if (record.artifactKind === "generated_assessment" && !record.meaning.toLowerCase().includes("not an accredited assessment")) {
    issues.push(`Generated assessment ${record.artifactId} must preserve the non-accredited assessment boundary.`);
  }
  if (record.review.decision !== "requires-review") {
    if (!record.review.reviewedBy?.trim() || !hasDateTime(record.review.reviewedAt) || !record.review.note?.trim()) {
      issues.push(`Reviewed learning artifact ${record.artifactId} requires reviewer, timestamp, and note.`);
    }
  }
  return issues;
}

export function buildLearningContentAuditBundle(input: {
  generationId: string;
  generatedAt: string;
  request: DynamicLessonGenerationInput;
  result: DynamicLessonGenerationResult;
}): LearningContentAuditBundle {
  const lesson = input.result.lesson;
  const base = {
    generationId: input.generationId,
    courseId: input.request.courseId,
    ...(input.result.alignment.authorityMappingId ? { authorityMappingId: input.result.alignment.authorityMappingId } : {}),
    objectiveIds: [...input.result.alignment.objectiveIds],
    generatedAt: input.generatedAt,
    generationMode: input.request.mode ?? "lesson",
    learnerLevel: String(input.request.learnerLevel),
    goal: input.request.goal.trim(),
    evidenceRefs: [
      ...(input.result.alignment.authorityMappingId ? [input.result.alignment.authorityMappingId] : []),
      ...input.result.alignment.objectiveIds,
    ],
    review: { decision: "requires-review" as const },
  };
  const lessonRecord: LearningArtifactAuditRecord = {
    ...base,
    id: `${input.generationId}:lesson:${lesson.id}`,
    artifactId: lesson.id,
    artifactKind: "generated_lesson",
    contentVersion: lesson.contentMetadata.version,
    sourceId: lesson.contentMetadata.sourceId,
    sourceLabel: lesson.contentMetadata.sourceLabel,
    authoredBy: "ai-coach",
    meaning: `${lesson.learningObjective} ${input.result.alignment.boundary}`,
  };
  const assessments = lesson.quizQuestions.map((question) => ({
    ...base,
    id: `${input.generationId}:assessment:${question.id}`,
    artifactId: question.id,
    artifactKind: "generated_assessment" as const,
    parentLessonId: lesson.id,
    contentVersion: question.contentMetadata.version,
    sourceId: question.contentMetadata.sourceId,
    sourceLabel: question.contentMetadata.sourceLabel,
    authoredBy: "ai-coach" as const,
    meaning: `This generated check reviews the lesson objective using: ${question.prompt} It is formative evidence, not an accredited assessment.`,
  }));
  const records = [lessonRecord, ...assessments];
  const issues = records.flatMap(validateLearningArtifactAudit);

  return {
    generationId: input.generationId,
    lesson: lessonRecord,
    assessments,
    productionEligible: issues.length === 0 && records.every((record) => record.review.decision === "approved"),
    issues,
  };
}

export function recordLearningArtifactReview(
  record: LearningArtifactAuditRecord,
  review: Required<Pick<LearningArtifactReview, "decision" | "reviewedAt" | "reviewedBy" | "note">>
): LearningArtifactAuditRecord {
  if (review.decision === "requires-review") throw new Error("A completed artifact review must approve or reject the artifact.");
  const reviewed = {
    ...record,
    review: {
      decision: review.decision,
      reviewedAt: review.reviewedAt,
      reviewedBy: review.reviewedBy.trim(),
      note: review.note.trim(),
    },
  };
  const issues = validateLearningArtifactAudit(reviewed);
  if (issues.length) throw new Error(issues.join(" "));
  return reviewed;
}

export function auditBundleCanBecomeProduction(bundle: LearningContentAuditBundle) {
  const records = [bundle.lesson, ...bundle.assessments];
  return records.length > 1 && records.every((record) => record.review.decision === "approved" && validateLearningArtifactAudit(record).length === 0);
}

export const LEARNING_CONTENT_AUDIT_BOUNDARIES = {
  autonomousApproval: false,
  runtimeEnforcement: false,
  generatedInstructionRequiresReview: true,
  generatedAssessmentsRequireReview: true,
  assessmentMeaningMustRemainReviewable: true,
} as const;
