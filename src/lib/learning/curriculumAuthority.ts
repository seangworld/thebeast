import type { LearningContentMetadata } from "./contentVersioning";

export type CurriculumAuthorityType =
  | "certification_objectives"
  | "state_standard"
  | "common_core"
  | "college_curriculum"
  | "khan_academy_mapping"
  | "open_educational_resource"
  | "internal_proving_ground"
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
  domainId?: string;
  title: string;
  authorityObjectiveId: string;
  parentObjectiveId?: string;
  description: string;
};

export type CurriculumAuthorityDomain = {
  id: string;
  authoritySourceId: string;
  domainCode: string;
  title: string;
  weightPercent: number;
  objectiveIds: string[];
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
  whyItExists: string;
  prerequisiteObjectiveIds: string[];
  prerequisiteSummary: string;
  knowledgeCheckIds: string[];
  progressWeightPercent: number;
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
    id: "comptia-security-plus-sy0-701",
    authorityType: "certification_objectives",
    publisher: "CompTIA",
    title: "CompTIA Security+",
    version: "SY0-701 / V7",
    effectiveDate: "2023-11-07",
    canonicalSource: "https://www.comptia.org/en-us/certifications/security/",
    approvalStatus: "approved_for_production",
    notes:
      "Official CompTIA Security+ objective authority. BeastLearning stores objective IDs and short paraphrased labels only; it must not copy CompTIA objective text.",
  },
  {
    id: "state-math-readiness-standard",
    authorityType: "state_standard",
    publisher: "State education authority",
    title: "State Math Readiness Standard",
    version: "state-selected",
    effectiveDate: "state-selected",
    canonicalSource: "state-standard://selected-state/math-readiness",
    approvalStatus: "candidate",
    notes:
      "Template authority for state-specific standards. A selected state's official standards, version, and source URL must replace this before production use.",
  },
  {
    id: "common-core-math-expressions",
    authorityType: "common_core",
    publisher: "Common Core State Standards Initiative",
    title: "Common Core Math Expressions Alignment",
    version: "CCSS.Math.Content.6.EE",
    effectiveDate: "2010-06-02",
    canonicalSource: "https://www.thecorestandards.org/Math/",
    approvalStatus: "candidate",
    notes:
      "Common Core alignment stores standard identifiers and paraphrased labels only. Production use requires approved source review.",
  },
  {
    id: "openstax-prealgebra-oer",
    authorityType: "open_educational_resource",
    publisher: "OpenStax",
    title: "Prealgebra 2e",
    version: "2e",
    effectiveDate: "2020-03-25",
    canonicalSource: "https://openstax.org/details/books/prealgebra-2e",
    approvalStatus: "candidate",
    notes:
      "Open educational resource alignment for pre-algebra examples. Lesson text remains generated or curated separately from the source.",
  },
  {
    id: "college-algebra-curriculum-reference",
    authorityType: "college_curriculum",
    publisher: "BeastLearning",
    title: "College Algebra Curriculum Reference",
    version: "2026.07.12-reference",
    effectiveDate: "2026-07-12",
    canonicalSource: "college-curriculum://approved-syllabus/college-algebra",
    approvalStatus: "candidate",
    notes:
      "Reference slot for an approved institutional syllabus or department curriculum map. It is not production authority until a real source is attached.",
  },
  {
    id: "beastlearning-internal-proving-ground",
    authorityType: "internal_proving_ground",
    publisher: "BeastLearning",
    title: "Internal Proving-Ground Curriculum",
    version: "2026.07.12",
    effectiveDate: "2026-07-12",
    canonicalSource: "internal://beastlearning/proving-ground",
    approvalStatus: "approved_for_testing",
    notes:
      "Internal proving-ground records validate generic curriculum behavior without becoming production authority.",
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

export const curriculumAuthorityDomains: CurriculumAuthorityDomain[] = [
  {
    id: "security-plus-domain-1",
    authoritySourceId: "comptia-security-plus-sy0-701",
    domainCode: "1.0",
    title: "Security foundations and core concepts",
    weightPercent: 12,
    objectiveIds: [],
  },
  {
    id: "security-plus-domain-2",
    authoritySourceId: "comptia-security-plus-sy0-701",
    domainCode: "2.0",
    title: "Threats, weaknesses, and mitigations",
    weightPercent: 22,
    objectiveIds: [],
  },
  {
    id: "security-plus-domain-3",
    authoritySourceId: "comptia-security-plus-sy0-701",
    domainCode: "3.0",
    title: "Security architecture",
    weightPercent: 18,
    objectiveIds: ["security-plus-3-2-secure-infrastructure"],
  },
  {
    id: "security-plus-domain-4",
    authoritySourceId: "comptia-security-plus-sy0-701",
    domainCode: "4.0",
    title: "Security operations",
    weightPercent: 28,
    objectiveIds: [
      "security-plus-4-6-iam",
      "security-plus-4-8-incident-response",
      "security-plus-4-9-investigation-data",
    ],
  },
  {
    id: "security-plus-domain-5",
    authoritySourceId: "comptia-security-plus-sy0-701",
    domainCode: "5.0",
    title: "Security governance, risk, and oversight",
    weightPercent: 20,
    objectiveIds: [],
  },
];

export const curriculumAuthorityObjectives: CurriculumObjective[] = [
  {
    id: "state-math-expression-equivalence",
    authoritySourceId: "state-math-readiness-standard",
    authorityObjectiveId: "state.math.expression-equivalence",
    title: "Use properties to recognize and create equivalent expressions.",
    description:
      "State-standard placeholder for expression-equivalence readiness. A selected state's exact standard code must replace this before production use.",
  },
  {
    id: "common-core-6-ee-a-3",
    authoritySourceId: "common-core-math-expressions",
    authorityObjectiveId: "CCSS.Math.Content.6.EE.A.3",
    title: "Use properties to generate equivalent expressions.",
    description:
      "Paraphrased Common Core alignment for building equivalent expressions with properties.",
  },
  {
    id: "common-core-6-ee-a-4",
    authoritySourceId: "common-core-math-expressions",
    authorityObjectiveId: "CCSS.Math.Content.6.EE.A.4",
    title: "Identify when expressions are equivalent.",
    description:
      "Paraphrased Common Core alignment for testing whether expressions stay equal for the same values.",
  },
  {
    id: "openstax-prealgebra-expressions",
    authoritySourceId: "openstax-prealgebra-oer",
    authorityObjectiveId: "openstax.prealgebra.expressions",
    title: "Simplify expressions by combining matching terms.",
    description:
      "OER alignment for simplifying expressions while keeping lesson content separately generated or curated.",
  },
  {
    id: "college-algebra-linear-equations",
    authoritySourceId: "college-algebra-curriculum-reference",
    authorityObjectiveId: "college-algebra.linear-equations",
    title: "Solve and justify one-variable linear equations.",
    description:
      "College-curriculum reference for linear-equation solving and explanation.",
  },
  {
    id: "internal-proving-ground-learning-transfer",
    authoritySourceId: "beastlearning-internal-proving-ground",
    authorityObjectiveId: "internal.transfer.generic-lesson-engine",
    title: "Validate that the lesson engine transfers across unrelated subjects.",
    description:
      "Internal proving-ground objective for subject-independent lesson, practice, and mastery behavior.",
  },
  {
    id: "security-plus-3-2-secure-infrastructure",
    authoritySourceId: "comptia-security-plus-sy0-701",
    domainId: "security-plus-domain-3",
    authorityObjectiveId: "SY0-701-3.2",
    title: "Apply secure infrastructure principles",
    description:
      "Paraphrased alignment for applying security principles to enterprise infrastructure.",
  },
  {
    id: "security-plus-4-6-iam",
    authoritySourceId: "comptia-security-plus-sy0-701",
    domainId: "security-plus-domain-4",
    authorityObjectiveId: "SY0-701-4.6",
    title: "Implement and maintain identity and access management",
    description:
      "Paraphrased alignment for authentication, authorization, roles, and account access operations.",
  },
  {
    id: "security-plus-4-8-incident-response",
    authoritySourceId: "comptia-security-plus-sy0-701",
    domainId: "security-plus-domain-4",
    authorityObjectiveId: "SY0-701-4.8",
    title: "Use incident-response activities appropriately",
    description:
      "Paraphrased alignment for recognizing when access-control evidence supports response decisions.",
  },
  {
    id: "security-plus-4-9-investigation-data",
    authoritySourceId: "comptia-security-plus-sy0-701",
    domainId: "security-plus-domain-4",
    authorityObjectiveId: "SY0-701-4.9",
    title: "Use investigation data sources",
    description:
      "Paraphrased alignment for using identity, access, and system evidence during investigation.",
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
    authoritySourceId: "comptia-security-plus-sy0-701",
    objectiveIds: [
      "security-plus-3-2-secure-infrastructure",
      "security-plus-4-6-iam",
      "security-plus-4-8-incident-response",
      "security-plus-4-9-investigation-data",
    ],
    totalObjectiveCount: 28,
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
      "state-math-expression-equivalence",
      "common-core-6-ee-a-3",
      "common-core-6-ee-a-4",
      "openstax-prealgebra-expressions",
      "objective-identify-like-terms",
      "objective-combine-like-terms",
    ],
  }),
  buildCourseAuthorityMapping({
    id: "authority-algebra-expansion",
    courseId: "algebra-expansion-course",
    authoritySourceId: "beastlearning-algebra-fixture",
    objectiveIds: [
      "college-algebra-linear-equations",
      "objective-isolate-variable",
      "objective-check-equation-solution",
    ],
  }),
  buildCourseAuthorityMapping({
    id: "authority-spanish-greeting",
    courseId: "spanish-greeting-course",
    authoritySourceId: "beastlearning-spanish-fixture",
    objectiveIds: [
      "internal-proving-ground-learning-transfer",
      "objective-spanish-greeting",
    ],
  }),
  buildCourseAuthorityMapping({
    id: "authority-college-algebra",
    courseId: "college-algebra-course",
    authoritySourceId: "beastlearning-college-algebra-fixture",
    objectiveIds: [
      "college-algebra-linear-equations",
      "objective-linear-equations",
    ],
  }),
];

export const lessonObjectiveAlignments: LessonObjectiveAlignment[] = [
  {
    id: "alignment-identity-verification",
    lessonId: "identity-verification-lesson",
    courseId: "security-plus-foundations-course",
    objectiveIds: ["security-plus-4-6-iam"],
    whyItExists:
      "Learners need identity and access vocabulary before the Tutor asks them to reason about permissions, roles, or access evidence.",
    prerequisiteObjectiveIds: [],
    prerequisiteSummary: "No prior Security+ objective is required.",
    knowledgeCheckIds: ["objective-identity-proofing", "objective-auth-factors"],
    progressWeightPercent: 35,
    coveragePercent: 25,
    productionAligned: true,
  },
  {
    id: "alignment-rbac",
    lessonId: "rbac-lesson",
    courseId: "security-plus-foundations-course",
    objectiveIds: [
      "security-plus-3-2-secure-infrastructure",
      "security-plus-4-6-iam",
      "security-plus-4-8-incident-response",
      "security-plus-4-9-investigation-data",
    ],
    whyItExists:
      "Role-based access control connects identity management to secure operations, response, and investigation decisions.",
    prerequisiteObjectiveIds: ["security-plus-4-6-iam"],
    prerequisiteSummary:
      "The learner should first understand identity, authentication, and authorization basics.",
    knowledgeCheckIds: ["objective-rbac"],
    progressWeightPercent: 65,
    coveragePercent: 100,
    productionAligned: true,
  },
  {
    id: "alignment-certification-foundation",
    lessonId: "sample-certification-foundation",
    courseId: "cybersecurity-certification-prep-course",
    objectiveIds: ["objective-certification-baseline"],
    whyItExists:
      "The Mentor needs a baseline before recommending a certification plan or first lesson.",
    prerequisiteObjectiveIds: [],
    prerequisiteSummary: "No prerequisite objective is required.",
    knowledgeCheckIds: ["quiz-cert-plan-1"],
    progressWeightPercent: 100,
    coveragePercent: 100,
    productionAligned: false,
  },
  {
    id: "alignment-pre-algebra-combining-like-terms",
    lessonId: "pre-algebra-combining-like-terms",
    courseId: "pre-algebra-foundations-course",
    objectiveIds: [
      "state-math-expression-equivalence",
      "common-core-6-ee-a-3",
      "common-core-6-ee-a-4",
      "openstax-prealgebra-expressions",
      "objective-identify-like-terms",
      "objective-combine-like-terms",
    ],
    whyItExists:
      "Combining like terms prepares learners to simplify expressions before solving equations.",
    prerequisiteObjectiveIds: ["objective-identify-like-terms"],
    prerequisiteSummary:
      "The learner should recognize matching variable parts before combining coefficients.",
    knowledgeCheckIds: ["quiz-like-terms-1", "quiz-like-terms-2"],
    progressWeightPercent: 100,
    coveragePercent: 100,
    productionAligned: false,
  },
  {
    id: "alignment-algebra-linear-equations",
    lessonId: "algebra-linear-equations",
    courseId: "algebra-expansion-course",
    objectiveIds: [
      "college-algebra-linear-equations",
      "objective-isolate-variable",
      "objective-check-equation-solution",
    ],
    whyItExists:
      "Linear equations are a bridge from expression work into algebraic reasoning and verification.",
    prerequisiteObjectiveIds: ["objective-combine-like-terms"],
    prerequisiteSummary:
      "The learner should simplify expressions and understand equality before solving equations.",
    knowledgeCheckIds: ["quiz-linear-equations-1", "quiz-linear-equations-2"],
    progressWeightPercent: 100,
    coveragePercent: 100,
    productionAligned: false,
  },
  {
    id: "alignment-spanish-greetings",
    lessonId: "sample-spanish-greetings",
    courseId: "spanish-greeting-course",
    objectiveIds: [
      "internal-proving-ground-learning-transfer",
      "objective-spanish-greeting",
    ],
    whyItExists:
      "The language fixture proves the same lesson engine can teach conversational practice outside math and certification prep.",
    prerequisiteObjectiveIds: [],
    prerequisiteSummary: "No prerequisite objective is required.",
    knowledgeCheckIds: ["quiz-spanish-1"],
    progressWeightPercent: 100,
    coveragePercent: 100,
    productionAligned: false,
  },
  {
    id: "alignment-college-algebra-linear-equations",
    lessonId: "linear-equations-lesson",
    courseId: "college-algebra-course",
    objectiveIds: [
      "college-algebra-linear-equations",
      "objective-linear-equations",
    ],
    whyItExists:
      "The college-algebra lesson gives the Tutor a standards-aware target for solving and explaining linear equations.",
    prerequisiteObjectiveIds: ["objective-combine-like-terms"],
    prerequisiteSummary:
      "The learner should be comfortable simplifying expressions before solving college-algebra equations.",
    knowledgeCheckIds: ["linear-practice"],
    progressWeightPercent: 100,
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

export function getAuthorityTypesForCourse(courseId: string) {
  const objectiveSourceIds = new Set(
    getObjectivesForCourse(courseId).map((objective) => objective.authoritySourceId)
  );

  return Array.from(
    new Set(
      curriculumAuthoritySources
        .filter((source) => objectiveSourceIds.has(source.id))
        .map((source) => source.authorityType)
    )
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
  totalObjectiveCount,
}: {
  id: string;
  courseId: string;
  authoritySourceId: string;
  objectiveIds: string[];
  totalObjectiveCount?: number;
}): CourseAuthorityMapping {
  const source = curriculumAuthoritySources.find(
    (candidate) => candidate.id === authoritySourceId
  );
  const mappedObjectiveCount = objectiveIds.length;
  const resolvedTotalObjectiveCount = Math.max(
    totalObjectiveCount || mappedObjectiveCount,
    mappedObjectiveCount,
    1
  );
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
      totalObjectiveCount: resolvedTotalObjectiveCount,
      percent: Math.round((mappedObjectiveCount / resolvedTotalObjectiveCount) * 100),
      status: productionTeachable
        ? mappedObjectiveCount === resolvedTotalObjectiveCount
          ? "complete"
          : "partial"
        : "fixture_only",
    },
    productionTeachable,
  };
}
