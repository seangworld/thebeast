import { findCareer } from "./careers";
import { findCertification } from "./certificationCatalog";
import { curriculumConceptLibrary } from "./concepts";
import type { GeneratedCurriculumPath } from "./types";

export function generateCurriculumLearningPath({
  goal,
  careerId,
  certificationId,
  subjectId,
  interest,
}: {
  goal: string;
  careerId: string;
  certificationId: string;
  subjectId: string;
  interest: string;
}): GeneratedCurriculumPath {
  const career = findCareer(careerId);
  const certification = findCertification(certificationId);
  const conceptSequence = certification?.recommendedConceptIds.length
    ? certification.recommendedConceptIds
    : curriculumConceptLibrary.slice(0, 4).map((concept) => concept.id);

  return {
    id: `${goal.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-path`,
    goal,
    careerId,
    certificationId,
    subjectId,
    interest,
    recommendedCurriculum: career?.recommendedCourseIds || [],
    recommendedSequence: conceptSequence,
    estimatedTimeline: certification?.estimatedPrepTime || "6-10 weeks",
    milestones: [
      `Confirm ${career?.title || "career"} direction.`,
      `Complete ${certification?.title || "starter"} concept sequence.`,
      `Build one ${interest} portfolio proof.`,
      "Run mastery review before completion.",
    ],
  };
}
