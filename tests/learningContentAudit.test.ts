import assert from "node:assert/strict";
import test from "node:test";
import { generateDynamicLearningLesson } from "../src/lib/learning/dynamicLessonGenerator";
import {
  LEARNING_CONTENT_AUDIT_BOUNDARIES,
  auditBundleCanBecomeProduction,
  buildLearningContentAuditBundle,
  recordLearningArtifactReview,
  validateLearningArtifactAudit,
} from "../src/lib/learning/learningContentAudit";

const request = {
  goal: "Understand access control",
  courseId: "security-plus-foundations-course",
  courseTitle: "Security+ Foundations",
  learnerLevel: "Beginner" as const,
  mode: "lesson" as const,
};

function bundle() {
  return buildLearningContentAuditBundle({
    generationId: "generation-1",
    generatedAt: "2026-07-18T11:15:00-04:00",
    request,
    result: generateDynamicLearningLesson(request),
  });
}

test("BL-66 traces generated lessons and assessments to source curriculum and objectives", () => {
  const audit = bundle();
  assert.equal(audit.lesson.artifactKind, "generated_lesson");
  assert.equal(audit.lesson.courseId, request.courseId);
  assert.equal(audit.lesson.objectiveIds.length > 0, true);
  assert.equal(audit.lesson.evidenceRefs.length > 0, true);
  assert.equal(audit.assessments.length > 0, true);
  assert.equal(audit.assessments.every((record) => record.parentLessonId === audit.lesson.artifactId), true);
  assert.equal(audit.assessments.every((record) => /not an accredited assessment/.test(record.meaning)), true);
  assert.deepEqual(audit.issues, []);
});

test("BL-66 requires review before generated instruction or checks become production eligible", () => {
  const audit = bundle();
  assert.equal(audit.productionEligible, false);
  assert.equal(auditBundleCanBecomeProduction(audit), false);

  const reviewedLesson = recordLearningArtifactReview(audit.lesson, {
    decision: "approved",
    reviewedAt: "2026-07-18T11:20:00-04:00",
    reviewedBy: "curriculum-owner",
    note: "Instruction stays within the mapped objective.",
  });
  const reviewedAssessments = audit.assessments.map((record) => recordLearningArtifactReview(record, {
    decision: "approved",
    reviewedAt: "2026-07-18T11:21:00-04:00",
    reviewedBy: "assessment-owner",
    note: "The formative check matches the lesson objective and stated meaning.",
  }));
  assert.equal(auditBundleCanBecomeProduction({ ...audit, lesson: reviewedLesson, assessments: reviewedAssessments }), true);
});

test("BL-66 rejects incomplete review history and missing assessment meaning", () => {
  const assessment = bundle().assessments[0];
  const issues = validateLearningArtifactAudit({
    ...assessment,
    parentLessonId: "",
    meaning: "Generated score.",
    review: { decision: "approved" },
  });
  assert.ok(issues.some((issue) => /parent lesson trace/.test(issue)));
  assert.ok(issues.some((issue) => /non-accredited assessment boundary/.test(issue)));
  assert.ok(issues.some((issue) => /reviewer, timestamp, and note/.test(issue)));
});

test("BL-66 preserves human review boundaries without autonomous enforcement", () => {
  assert.deepEqual(LEARNING_CONTENT_AUDIT_BOUNDARIES, {
    autonomousApproval: false,
    runtimeEnforcement: false,
    generatedInstructionRequiresReview: true,
    generatedAssessmentsRequireReview: true,
    assessmentMeaningMustRemainReviewable: true,
  });
});
