import { findCertification } from "./certificationCatalog";
import {
  curriculumAuthorityDomains,
  getCourseAuthorityMapping,
  getCurriculumAuthoritySource,
  getObjectivesForCourse,
} from "./curriculumAuthority";
import { learningPracticeExams } from "./practiceExams";

export type CertificationObjectiveEvidence = {
  objectiveId: string;
  masteryPercent: number;
  confidencePercent?: number;
  lastPracticeScorePercent?: number;
};

export type CertificationDomainReadiness = {
  domainId: string;
  domainCode: string;
  title: string;
  weightPercent: number;
  objectiveIds: string[];
  readinessPercent: number;
  weak: boolean;
  evidenceSummary: string;
};

export type AdaptiveCertificationPracticeSection = {
  domainId: string;
  title: string;
  questionCount: number;
  targetObjectiveIds: string[];
  reason: string;
};

export type CertificationIntelligenceResult = {
  certificationId: string;
  certificationTitle: string;
  courseId: string;
  authorityTitle: string;
  authorityCoveragePercent: number;
  readinessPercent: number;
  examReady: boolean;
  readinessLabel: "not-ready" | "targeted-review" | "practice-exam-ready" | "exam-ready";
  weakDomains: CertificationDomainReadiness[];
  domainReadiness: CertificationDomainReadiness[];
  adaptivePracticeExam: {
    examId: string;
    title: string;
    timed: boolean;
    durationMinutes: number;
    sections: AdaptiveCertificationPracticeSection[];
  };
  targetedReview: string[];
  mentorSummary: string;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  return values.length
    ? clamp(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
}

function scoreObjective(evidence?: CertificationObjectiveEvidence) {
  if (!evidence) return 0;

  return clamp(
    evidence.masteryPercent * 0.55 +
      (evidence.confidencePercent ?? evidence.masteryPercent) * 0.25 +
      (evidence.lastPracticeScorePercent ?? evidence.masteryPercent) * 0.2
  );
}

function readinessLabel({
  readinessPercent,
  examReady,
  weakDomains,
}: {
  readinessPercent: number;
  examReady: boolean;
  weakDomains: CertificationDomainReadiness[];
}): CertificationIntelligenceResult["readinessLabel"] {
  if (examReady) return "exam-ready";
  if (readinessPercent >= 80 && weakDomains.length <= 1) return "practice-exam-ready";
  if (readinessPercent >= 55) return "targeted-review";
  return "not-ready";
}

export function buildCertificationIntelligence({
  certificationId = "comptia-security-plus",
  courseId = "security-plus-foundations-course",
  objectiveEvidence,
}: {
  certificationId?: string;
  courseId?: string;
  objectiveEvidence: CertificationObjectiveEvidence[];
}): CertificationIntelligenceResult {
  const certification = findCertification(certificationId);
  const mapping = getCourseAuthorityMapping(courseId);
  const authority = mapping
    ? getCurriculumAuthoritySource(mapping.authoritySourceId)
    : undefined;
  const mappedObjectives = getObjectivesForCourse(courseId);
  const objectiveIds = new Set(mappedObjectives.map((objective) => objective.id));
  const evidenceByObjective = new Map(
    objectiveEvidence.map((evidence) => [evidence.objectiveId, evidence])
  );
  const domains = curriculumAuthorityDomains.filter(
    (domain) => domain.authoritySourceId === mapping?.authoritySourceId
  );
  const domainReadiness = domains.map((domain) => {
    const mappedDomainObjectiveIds = domain.objectiveIds.filter((id) =>
      objectiveIds.has(id)
    );
    const objectiveScores = mappedDomainObjectiveIds.map((id) =>
      scoreObjective(evidenceByObjective.get(id))
    );
    const readinessPercent = average(objectiveScores);
    const weak = mappedDomainObjectiveIds.length === 0 || readinessPercent < 75;

    return {
      domainId: domain.id,
      domainCode: domain.domainCode,
      title: domain.title,
      weightPercent: domain.weightPercent,
      objectiveIds: mappedDomainObjectiveIds,
      readinessPercent,
      weak,
      evidenceSummary:
        mappedDomainObjectiveIds.length === 0
          ? "No mapped objective evidence is available yet."
          : `${mappedDomainObjectiveIds.length} mapped objective${mappedDomainObjectiveIds.length === 1 ? "" : "s"} averaged ${readinessPercent}%.`,
    };
  });
  const readinessPercent = clamp(
    domainReadiness.reduce(
      (sum, domain) =>
        sum + domain.readinessPercent * (domain.weightPercent / 100),
      0
    )
  );
  const weakDomains = domainReadiness.filter((domain) => domain.weak);
  const authorityCoveragePercent = mapping?.coverage.percent ?? 0;
  const examReady =
    readinessPercent >= 85 &&
    weakDomains.length === 0 &&
    authorityCoveragePercent >= 80;
  const practiceExam = learningPracticeExams.find((exam) =>
    exam.title.toLowerCase().includes("security+")
  ) || learningPracticeExams[0];
  const reviewDomains = weakDomains.length > 0 ? weakDomains : domainReadiness.slice(0, 2);
  const adaptiveSections = reviewDomains.map((domain) => ({
    domainId: domain.domainId,
    title: domain.title,
    questionCount: Math.max(5, Math.round(domain.weightPercent / 2)),
    targetObjectiveIds: domain.objectiveIds,
    reason: domain.objectiveIds.length
      ? `Target this ${domain.weightPercent}% domain because readiness is ${domain.readinessPercent}%.`
      : `Add diagnostic questions for this ${domain.weightPercent}% domain because mapped evidence is missing.`,
  }));
  const label = readinessLabel({ readinessPercent, examReady, weakDomains });
  const targetedReview = reviewDomains.map((domain) =>
    domain.objectiveIds.length
      ? `Review ${domain.title}: ${domain.objectiveIds.join(", ")}.`
      : `Map and diagnose ${domain.title} before claiming exam readiness.`
  );

  return {
    certificationId,
    certificationTitle: certification?.title || certificationId,
    courseId,
    authorityTitle: authority?.title || mapping?.publisher || "Certification authority",
    authorityCoveragePercent,
    readinessPercent,
    examReady,
    readinessLabel: label,
    weakDomains,
    domainReadiness,
    adaptivePracticeExam: {
      examId: practiceExam.id,
      title: practiceExam.title,
      timed: practiceExam.timed,
      durationMinutes: practiceExam.durationMinutes,
      sections: adaptiveSections,
    },
    targetedReview,
    mentorSummary: examReady
      ? `You look exam-ready for ${certification?.title || certificationId}. Keep one light review before scheduling.`
      : `You are not exam-ready yet. Current readiness is ${readinessPercent}%, and ${weakDomains.length} weighted domain${weakDomains.length === 1 ? "" : "s"} need targeted review.`,
  };
}
