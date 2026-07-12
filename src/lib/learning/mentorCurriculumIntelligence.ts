import {
  curriculumAuthorityDomains,
  curriculumAuthorityObjectives,
  getCourseAuthorityMapping,
  getCurriculumAuthoritySource,
  lessonObjectiveAlignments,
  type CurriculumObjective,
} from "./curriculumAuthority";

export type MentorCurriculumIntelligenceInput = {
  courseId: string;
  demonstratedObjectiveIds: string[];
  demonstratedObjectiveCount?: number;
  targetDomainCode?: string;
  reviewObjectiveIds?: string[];
  includeObjectiveIds?: boolean;
};

export type MentorCurriculumIntelligence = {
  courseId: string;
  authorityTitle: string;
  officialCoveragePercent: number;
  completedObjectiveCount: number;
  totalObjectiveCount: number;
  skippedLessonMessages: string[];
  readinessMessages: string[];
  reviewMessages: string[];
  coverageMessage: string;
};

function sentenceFromSlug(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (first) => first.toUpperCase());
}

function objectiveById(objectiveId: string) {
  return curriculumAuthorityObjectives.find((objective) => objective.id === objectiveId);
}

function mentorObjectiveName(
  objective: CurriculumObjective | undefined,
  includeObjectiveIds: boolean
) {
  if (!objective) return "that objective";
  return includeObjectiveIds
    ? `${objective.title} (${objective.authorityObjectiveId})`
    : objective.title;
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function percent(completed: number, total: number) {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

export function buildMentorCurriculumIntelligence({
  courseId,
  demonstratedObjectiveIds,
  demonstratedObjectiveCount,
  targetDomainCode,
  reviewObjectiveIds = [],
  includeObjectiveIds = false,
}: MentorCurriculumIntelligenceInput): MentorCurriculumIntelligence {
  const mapping = getCourseAuthorityMapping(courseId);
  const source = mapping
    ? getCurriculumAuthoritySource(mapping.authoritySourceId)
    : undefined;
  const demonstrated = new Set(demonstratedObjectiveIds);
  const completedObjectiveCount =
    demonstratedObjectiveCount ?? demonstratedObjectiveIds.length;
  const totalObjectiveCount = mapping?.coverage.totalObjectiveCount ?? 0;
  const officialCoveragePercent = percent(completedObjectiveCount, totalObjectiveCount);
  const authorityTitle = source?.title || sentenceFromSlug(courseId);

  const courseLessons = lessonObjectiveAlignments.filter(
    (alignment) => alignment.courseId === courseId
  );
  const skippedLessonMessages = courseLessons
    .filter((alignment) =>
      alignment.objectiveIds.every((objectiveId) => demonstrated.has(objectiveId))
    )
    .map((alignment) => {
      const lessonName = sentenceFromSlug(alignment.lessonId);
      const objectiveNames = alignment.objectiveIds
        .map((objectiveId) =>
          mentorObjectiveName(objectiveById(objectiveId), includeObjectiveIds)
        )
        .join(", ");
      return `I skipped ${lessonName} because you've already demonstrated ${objectiveNames}.`;
    });

  const targetDomain = targetDomainCode
    ? curriculumAuthorityDomains.find(
        (domain) =>
          domain.authoritySourceId === mapping?.authoritySourceId &&
          domain.domainCode === targetDomainCode
      )
    : undefined;
  const earlierDomainObjectives = targetDomain
    ? curriculumAuthorityDomains
        .filter(
          (domain) =>
            domain.authoritySourceId === targetDomain.authoritySourceId &&
            Number.parseFloat(domain.domainCode) <
              Number.parseFloat(targetDomain.domainCode)
        )
        .flatMap((domain) => domain.objectiveIds)
    : [];
  const missingEarlierObjectives = unique(earlierDomainObjectives).filter(
    (objectiveId) => !demonstrated.has(objectiveId)
  );
  const readinessMessages =
    targetDomain && missingEarlierObjectives.length
      ? [
          `Before we move into ${targetDomain.title}, you still need ${missingEarlierObjectives
            .map((objectiveId) =>
              mentorObjectiveName(objectiveById(objectiveId), includeObjectiveIds)
            )
            .join(", ")}.`,
        ]
      : [];

  const reviewMessages = reviewObjectiveIds.map((objectiveId) => {
    const objective = objectiveById(objectiveId);
    return `I recommend reviewing ${mentorObjectiveName(
      objective,
      includeObjectiveIds
    )} before taking the final assessment.`;
  });

  return {
    courseId,
    authorityTitle,
    officialCoveragePercent,
    completedObjectiveCount,
    totalObjectiveCount,
    skippedLessonMessages,
    readinessMessages,
    reviewMessages,
    coverageMessage: `You've completed ${officialCoveragePercent}% of the official ${authorityTitle} objectives.`,
  };
}
