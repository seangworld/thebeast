import type { LearningContentMetadata } from "./contentVersioning";

export type CurriculumAuthorityType =
  | "certification_objectives"
  | "state_standard"
  | "college_curriculum"
  | "khan_academy_mapping"
  | "open_educational_resource"
  | "fixture"
  | "generated_provisional";

export type CurriculumAuthorityApprovalStatus =
  | "approved_for_production"
  | "approved_for_testing"
  | "candidate"
  | "deprecated";

export type CurriculumAuthoritySource = {
  id: string;
  authorityType: CurriculumAuthorityType;
  publisher: string;
  title: string;
  version: string;
  effectiveDate: string;
  canonicalSource: string;
  approvalStatus: CurriculumAuthorityApprovalStatus;
  notes: string;
};

export type CurriculumObjective = {
  id: string;
  authoritySourceId: string;
  title: string;
  authorityObjectiveId: string;
  parentObjectiveId?: string;
  description: string;
};

export type CourseAuthorityCoverage = {
  mappedObjectiveCount: number;
  totalObjectiveCount: number;
  percent: number;
  status: "complete" | "partial" | "fixture_only" | "unmapped";
};

export type CourseAuthorityMapping = {
  id: string;
  courseId: string;
  authoritySourceId: string;
  authorityType: CurriculumAuthorityType;
  publisher: string;
  version: string;
  effectiveDate: string;
  canonicalSource: string;
  objectiveIds: string[];
  coverage: CourseAuthorityCoverage;
  productionTeachable: boolean;
};

export type LessonObjectiveAlignment = {
  id: string;
  lessonId: string;
  courseId: string;
  objectiveIds: string[];
  coveragePercent: number;
  productionAligned: boolean;
};

export type GeneratedContentProvenance = {
  id: string;
  contentId: string;
  courseId: string;
  generatedFrom: "learner_goal" | "mentor_plan" | "tutor_session";
  authorityMappingId?: string;
  reviewStatus: LearningContentMetadata["reviewStatus"];
  productionEligible: boolean;
};

export type CurriculumLifecycleState =
  | "Draft"
  | "Generated"
  | "Reviewed"
  | "Authority Mapped"
  | "Approved"
  | "Published"
  | "Retired";

export type CourseCurriculumLifecycleRecord = {
  id: string;
  courseId: string;
  state: CurriculumLifecycleState;
  authorityMappingId?: string;
  testingOnly: boolean;
  updatedAt: string;
  notes: string;
};

export const curriculumLifecycleOrder: CurriculumLifecycleState[] = [
  "Draft",
  "Generated",
  "Reviewed",
  "Authority Mapped",
  "Approved",
  "Published",
  "Retired",
];

export const curriculumAuthoritySources: CurriculumAuthoritySource[] = [
  {
    id: "beastlearning-security-plus-fixture",
    authorityType: "fixture",
    publisher: "BeastLearning",
    title: "Security+ Foundations Fixture",
    version: "2026.07.12-fixture",
    effectiveDate: "2026-07-12",
    canonicalSource: "fixture://beastlearning/security-plus-foundations",
    approvalStatus: "approved_for_testing",
    notes:
      "Internal fixture for architecture and test coverage. It is not an official CompTIA objective source.",
  },
  {
    id: "beastlearning-certification-prep-fixture",
    authorityType: "fixture",
    publisher: "BeastLearning",
    title: "Certification Preparation Fixture",
    version: "2026.07.12-fixture",
    effectiveDate: "2026-07-12",
    canonicalSource: "fixture://beastlearning/certification-preparation",
    approvalStatus: "approved_for_testing",
    notes:
      "Internal fixture for generic certification-prep behavior. Official objectives must be mapped before production curriculum use.",
  },
  {
    id: "beastlearning-pre-algebra-fixture",
    authorityType: "fixture",
    publisher: "BeastLearning",
    title: "Pre-Algebra Proving-Ground Fixture",
    version: "2026.07.12-fixture",
    effectiveDate: "2026-07-12",
    canonicalSource: "fixture://beastlearning/pre-algebra-proving-ground",
    approvalStatus: "approved_for_testing",
    notes:
      "Internal proving-ground content for prerequisite, objective, practice, and mastery architecture.",
  },
  {
    id: "beastlearning-algebra-fixture",
    authorityType: "fixture",
    publisher: "BeastLearning",
    title: "Algebra Expansion Fixture",
    version: "2026.07.12-fixture",
    effectiveDate: "2026-07-12",
    canonicalSource: "fixture://beastlearning/algebra-expansion",
    approvalStatus: "approved_for_testing",
    notes:
      "Internal fixture that follows the Pre-Algebra proving-ground pattern.",
  },
  {
    id: "beastlearning-spanish-fixture",
    authorityType: "fixture",
    publisher: "BeastLearning",
    title: "Spanish Greeting Practice Fixture",
    version: "2026.07.12-fixture",
    effectiveDate: "2026-07-12",
    canonicalSource: "fixture://beastlearning/spanish-greeting-practice",
    approvalStatus: "approved_for_testing",
    notes:
      "Internal fixture for language-practice engine coverage. It is not a production language curriculum source.",
  },
  {
    id: "beastlearning-college-algebra-fixture",
    authorityType: "fixture",
    publisher: "BeastLearning",
    title: "College Algebra Notes Fixture",
    version: "2026.07.12-fixture",
    effectiveDate: "2026-07-12",
    canonicalSource: "fixture://beastlearning/college-algebra-notes",
    approvalStatus: "approved_for_testing",
    notes:
      "Internal fixture for legacy built-course and resource-map coverage. It is not a college syllabus or OER authority.",
  },
];

export const curriculumAuthorityObjectives: CurriculumObjective[] = [
  {
    id: "objective-identity-proofing",
    authoritySourceId: "beastlearning-security-plus-fixture",
    authorityObjectiveId: "fixture.security.identity-proofing",
    title: "Differentiate identity proofing and authentication.",
    description: "Fixture objective for identity and access teaching behavior.",
  },
  {
    id: "objective-auth-factors",
    authoritySourceId: "beastlearning-security-plus-fixture",
    authorityObjectiveId: "fixture.security.auth-factors",
    title: "Classify knowledge, possession, and inherence factors.",
    description: "Fixture objective for authentication-factor classification.",
  },
  {
    id: "objective-rbac",
    authoritySourceId: "beastlearning-security-plus-fixture",
    authorityObjectiveId: "fixture.security.rbac",
    title: "Map users to roles and roles to permissions.",
    description: "Fixture objective for role-based access control.",
  },
  {
    id: "objective-certification-baseline",
    authoritySourceId: "beastlearning-certification-prep-fixture",
    authorityObjectiveId: "fixture.certification.baseline",
    title: "Identify the current credential goal, baseline, and first readiness gap.",
    description: "Fixture objective for generic certification preparation.",
  },
  {
    id: "objective-identify-like-terms",
    authoritySourceId: "beastlearning-pre-algebra-fixture",
    authorityObjectiveId: "fixture.pre-algebra.identify-like-terms",
    title: "Identify terms with the same variable part.",
    description: "Fixture objective for Pre-Algebra grouping behavior.",
  },
  {
    id: "objective-combine-like-terms",
    authoritySourceId: "beastlearning-pre-algebra-fixture",
    authorityObjectiveId: "fixture.pre-algebra.combine-like-terms",
    title: "Combine coefficients while preserving the matching variable part.",
    description: "Fixture objective for Pre-Algebra simplification behavior.",
  },
  {
    id: "objective-isolate-variable",
    authoritySourceId: "beastlearning-algebra-fixture",
    authorityObjectiveId: "fixture.algebra.isolate-variable",
    title: "Isolate a variable using one inverse operation.",
    description: "Fixture objective for one-step equation solving.",
  },
  {
    id: "objective-check-equation-solution",
    authoritySourceId: "beastlearning-algebra-fixture",
    authorityObjectiveId: "fixture.algebra.check-solution",
    title: "Check a one-step equation solution by substitution.",
    description: "Fixture objective for equation-solution verification.",
  },
  {
    id: "objective-spanish-greeting",
    authoritySourceId: "beastlearning-spanish-fixture",
    authorityObjectiveId: "fixture.spanish.greeting",
    title: "Practice a simple greeting exchange with pronunciation and meaning checks.",
    description: "Fixture objective for conversation-practice behavior.",
  },
  {
    id: "objective-linear-equations",
    authoritySourceId: "beastlearning-college-algebra-fixture",
    authorityObjectiveId: "fixture.college-algebra.linear-equations",
    title: "Solve and explain one-variable linear equations.",
    description: "Fixture objective for legacy college algebra course records.",
  },
];

export const courseAuthorityMappings: CourseAuthorityMapping[] = [
  buildCourseAuthorityMapping({
    id: "authority-security-plus-foundations",
    courseId: "security-plus-foundations-course",
    authoritySourceId: "beastlearning-security-plus-fixture",
    objectiveIds: [
      "objective-identity-proofing",
      "objective-auth-factors",
      "objective-rbac",
    ],
  }),
  buildCourseAuthorityMapping({
    id: "authority-cybersecurity-certification-prep",
    courseId: "cybersecurity-certification-prep-course",
    authoritySourceId: "beastlearning-certification-prep-fixture",
    objectiveIds: ["objective-certification-baseline"],
  }),
  buildCourseAuthorityMapping({
    id: "authority-pre-algebra-foundations",
    courseId: "pre-algebra-foundations-course",
    authoritySourceId: "beastlearning-pre-algebra-fixture",
    objectiveIds: [
      "objective-identify-like-terms",
      "objective-combine-like-terms",
    ],
  }),
  buildCourseAuthorityMapping({
    id: "authority-algebra-expansion",
    courseId: "algebra-expansion-course",
    authoritySourceId: "beastlearning-algebra-fixture",
    objectiveIds: [
      "objective-isolate-variable",
      "objective-check-equation-solution",
    ],
  }),
  buildCourseAuthorityMapping({
    id: "authority-spanish-greeting",
    courseId: "spanish-greeting-course",
    authoritySourceId: "beastlearning-spanish-fixture",
    objectiveIds: ["objective-spanish-greeting"],
  }),
  buildCourseAuthorityMapping({
    id: "authority-college-algebra",
    courseId: "college-algebra-course",
    authoritySourceId: "beastlearning-college-algebra-fixture",
    objectiveIds: ["objective-linear-equations"],
  }),
];

export const lessonObjectiveAlignments: LessonObjectiveAlignment[] = [
  {
    id: "alignment-identity-verification",
    lessonId: "identity-verification-lesson",
    courseId: "security-plus-foundations-course",
    objectiveIds: ["objective-identity-proofing", "objective-auth-factors"],
    coveragePercent: 67,
    productionAligned: false,
  },
  {
    id: "alignment-rbac",
    lessonId: "rbac-lesson",
    courseId: "security-plus-foundations-course",
    objectiveIds: ["objective-rbac"],
    coveragePercent: 33,
    productionAligned: false,
  },
  {
    id: "alignment-certification-foundation",
    lessonId: "sample-certification-foundation",
    courseId: "cybersecurity-certification-prep-course",
    objectiveIds: ["objective-certification-baseline"],
    coveragePercent: 100,
    productionAligned: false,
  },
  {
    id: "alignment-pre-algebra-combining-like-terms",
    lessonId: "pre-algebra-combining-like-terms",
    courseId: "pre-algebra-foundations-course",
    objectiveIds: [
      "objective-identify-like-terms",
      "objective-combine-like-terms",
    ],
    coveragePercent: 100,
    productionAligned: false,
  },
  {
    id: "alignment-algebra-linear-equations",
    lessonId: "algebra-linear-equations",
    courseId: "algebra-expansion-course",
    objectiveIds: [
      "objective-isolate-variable",
      "objective-check-equation-solution",
    ],
    coveragePercent: 100,
    productionAligned: false,
  },
  {
    id: "alignment-spanish-greetings",
    lessonId: "sample-spanish-greetings",
    courseId: "spanish-greeting-course",
    objectiveIds: ["objective-spanish-greeting"],
    coveragePercent: 100,
    productionAligned: false,
  },
  {
    id: "alignment-college-algebra-linear-equations",
    lessonId: "linear-equations-lesson",
    courseId: "college-algebra-course",
    objectiveIds: ["objective-linear-equations"],
    coveragePercent: 100,
    productionAligned: false,
  },
];

export const courseCurriculumLifecycleRecords: CourseCurriculumLifecycleRecord[] = [
  {
    id: "lifecycle-security-plus-foundations",
    courseId: "security-plus-foundations-course",
    state: "Authority Mapped",
    authorityMappingId: "authority-security-plus-foundations",
    testingOnly: true,
    updatedAt: "2026-07-12",
    notes:
      "Fixture content has internal objective mapping but is not approved or published as production curriculum.",
  },
  {
    id: "lifecycle-cybersecurity-certification-prep",
    courseId: "cybersecurity-certification-prep-course",
    state: "Authority Mapped",
    authorityMappingId: "authority-cybersecurity-certification-prep",
    testingOnly: true,
    updatedAt: "2026-07-12",
    notes:
      "Generic certification fixture requires official provider objectives before publication.",
  },
  {
    id: "lifecycle-pre-algebra-foundations",
    courseId: "pre-algebra-foundations-course",
    state: "Authority Mapped",
    authorityMappingId: "authority-pre-algebra-foundations",
    testingOnly: true,
    updatedAt: "2026-07-12",
    notes:
      "Proving-ground lesson has fixture objective mapping but is not production curriculum.",
  },
  {
    id: "lifecycle-algebra-expansion",
    courseId: "algebra-expansion-course",
    state: "Authority Mapped",
    authorityMappingId: "authority-algebra-expansion",
    testingOnly: true,
    updatedAt: "2026-07-12",
    notes:
      "Algebra fixture follows the proving-ground pattern and remains testing-only.",
  },
  {
    id: "lifecycle-spanish-greeting",
    courseId: "spanish-greeting-course",
    state: "Authority Mapped",
    authorityMappingId: "authority-spanish-greeting",
    testingOnly: true,
    updatedAt: "2026-07-12",
    notes:
      "Spanish greeting fixture verifies engine behavior and is not a production language curriculum.",
  },
  {
    id: "lifecycle-college-algebra",
    courseId: "college-algebra-course",
    state: "Authority Mapped",
    authorityMappingId: "authority-college-algebra",
    testingOnly: true,
    updatedAt: "2026-07-12",
    notes:
      "Legacy college algebra fixture is mapped for testing and requires a real source before publication.",
  },
];

export function buildGeneratedContentProvenance({
  contentId,
  courseId,
  generatedFrom = "learner_goal",
  authorityMappingId,
  reviewStatus,
}: {
  contentId: string;
  courseId: string;
  generatedFrom?: GeneratedContentProvenance["generatedFrom"];
  authorityMappingId?: string;
  reviewStatus: LearningContentMetadata["reviewStatus"];
}): GeneratedContentProvenance {
  const mapping = authorityMappingId
    ? getCourseAuthorityMappingById(authorityMappingId)
    : getCourseAuthorityMapping(courseId);
  const productionEligible = Boolean(
    mapping &&
      mapping.productionTeachable &&
      reviewStatus === "approved"
  );

  return {
    id: `provenance-${contentId}`,
    contentId,
    courseId,
    generatedFrom,
    authorityMappingId: mapping?.id,
    reviewStatus,
    productionEligible,
  };
}

export function createGeneratedCurriculumLifecycleRecord({
  courseId,
  updatedAt = "2026-07-12",
}: {
  courseId: string;
  updatedAt?: string;
}): CourseCurriculumLifecycleRecord {
  return {
    id: `lifecycle-${courseId}`,
    courseId,
    state: "Generated",
    testingOnly: true,
    updatedAt,
    notes:
      "Generated curriculum must be reviewed, authority mapped, approved, and published before the Tutor may teach it by default.",
  };
}

export function getCurriculumAuthoritySource(sourceId: string) {
  return curriculumAuthoritySources.find((source) => source.id === sourceId);
}

export function getCourseAuthorityMapping(courseId: string) {
  return courseAuthorityMappings.find((mapping) => mapping.courseId === courseId);
}

export function getCourseAuthorityMappingById(mappingId: string) {
  return courseAuthorityMappings.find((mapping) => mapping.id === mappingId);
}

export function getCourseCurriculumLifecycle(courseId: string) {
  return courseCurriculumLifecycleRecords.find(
    (record) => record.courseId === courseId
  );
}

export function getLessonObjectiveAlignment(lessonId: string) {
  return lessonObjectiveAlignments.find((alignment) => alignment.lessonId === lessonId);
}

export function getObjectivesForCourse(courseId: string) {
  const mapping = getCourseAuthorityMapping(courseId);
  if (!mapping) return [];

  return curriculumAuthorityObjectives.filter((objective) =>
    mapping.objectiveIds.includes(objective.id)
  );
}

export function courseCanBeProductionTeachable(courseId: string) {
  const mapping = getCourseAuthorityMapping(courseId);
  if (!mapping) return false;

  const source = getCurriculumAuthoritySource(mapping.authoritySourceId);
  return Boolean(
    mapping.productionTeachable &&
      source?.approvalStatus === "approved_for_production"
  );
}

export function generatedContentCanBecomeProductionCurriculum(
  provenance: GeneratedContentProvenance
) {
  return provenance.productionEligible;
}

export function courseIsPublished(courseId: string) {
  const lifecycle = getCourseCurriculumLifecycle(courseId);
  return lifecycle?.state === "Published";
}

export function tutorCanTeachCourseByDefault(courseId: string) {
  return courseIsPublished(courseId) && courseCanBeProductionTeachable(courseId);
}

export function adminCanOverrideCourseForTesting(courseId: string) {
  const lifecycle =
    getCourseCurriculumLifecycle(courseId) ||
    createGeneratedCurriculumLifecycleRecord({ courseId });

  return lifecycle.state !== "Retired" && lifecycle.testingOnly;
}

export function resolveTutorCurriculumAccess({
  courseId,
  adminOverride = false,
}: {
  courseId: string;
  adminOverride?: boolean;
}) {
  const lifecycle =
    getCourseCurriculumLifecycle(courseId) ||
    createGeneratedCurriculumLifecycleRecord({ courseId });
  const defaultAllowed = tutorCanTeachCourseByDefault(courseId);
  const adminOverrideAllowed =
    adminOverride && adminCanOverrideCourseForTesting(courseId);

  return {
    courseId,
    lifecycleState: lifecycle.state,
    defaultAllowed,
    adminOverrideAllowed,
    canTeach: defaultAllowed || adminOverrideAllowed,
    reason: defaultAllowed
      ? "Published curriculum is available for default Tutor teaching."
      : adminOverrideAllowed
      ? "Admin testing override allows this non-published curriculum."
      : "Tutor default teaching requires Published curriculum.",
  };
}

export function getCourseAuthorityGaps(courseIds: string[]) {
  return courseIds
    .map((courseId) => {
      const mapping = getCourseAuthorityMapping(courseId);
      if (!mapping) {
        return {
          courseId,
          issue: "missing_authority_mapping",
        };
      }
      if (!mapping.productionTeachable) {
        return {
          courseId,
          issue: "not_production_teachable",
        };
      }
      return undefined;
    })
    .filter(Boolean) as Array<{ courseId: string; issue: string }>;
}

function buildCourseAuthorityMapping({
  id,
  courseId,
  authoritySourceId,
  objectiveIds,
}: {
  id: string;
  courseId: string;
  authoritySourceId: string;
  objectiveIds: string[];
}): CourseAuthorityMapping {
  const source = curriculumAuthoritySources.find(
    (candidate) => candidate.id === authoritySourceId
  );
  const mappedObjectiveCount = objectiveIds.length;
  const totalObjectiveCount = Math.max(mappedObjectiveCount, 1);
  const productionTeachable = source?.approvalStatus === "approved_for_production";

  return {
    id,
    courseId,
    authoritySourceId,
    authorityType: source?.authorityType || "fixture",
    publisher: source?.publisher || "Unknown",
    version: source?.version || "unknown",
    effectiveDate: source?.effectiveDate || "unknown",
    canonicalSource: source?.canonicalSource || "unknown",
    objectiveIds,
    coverage: {
      mappedObjectiveCount,
      totalObjectiveCount,
      percent: Math.round((mappedObjectiveCount / totalObjectiveCount) * 100),
      status: productionTeachable ? "complete" : "fixture_only",
    },
    productionTeachable,
  };
}
