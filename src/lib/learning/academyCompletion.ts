import {
  generateLearningCertificateId,
} from "./certificates";
import type {
  LearnerPortfolioEntry,
  LearningCertificate,
} from "./types";

export type BeastAcademyFormalAssessmentScope =
  | "major_milestone"
  | "course_completion";

export type BeastAcademyCompletionStatus =
  | "passed"
  | "needs_remediation";

export type TutorLessonReadinessDecision = {
  checkType: "natural_lesson_check";
  decidedBy: "Tutor";
  readyToContinue: boolean;
  reason: string;
  nextAction: "continue" | "remediate";
  formalAssessmentRequired: false;
  artificialWaitingPeriod: false;
};

export type BeastAcademyCompletionRecord = {
  id: string;
  learnerName: string;
  pathName: string;
  completedAt: string;
  scope: BeastAcademyFormalAssessmentScope;
  status: BeastAcademyCompletionStatus;
  masteryPercent: number;
  requiredMasteryPercent: number;
  skillsDemonstrated: string[];
  evidence: string[];
};

export type BeastAcademyCompletionResult = {
  status: BeastAcademyCompletionStatus;
  completionRecord: BeastAcademyCompletionRecord;
  certificate?: LearningCertificate;
  portfolioEntry?: LearnerPortfolioEntry;
  mentorMessage: string;
  tutorAction: string;
  retestPolicy: {
    retestWhenReady: boolean;
    artificialWaitingPeriod: false;
  };
};

export const beastAcademyAssessmentPolicy = {
  knowledgeChecks: "natural_lesson_checks",
  formalAssessmentScopes: ["major_milestone", "course_completion"] as const,
  passingAwards: [
    "Beast Academy Certificate",
    "skills demonstrated",
    "completion record",
    "portfolio entry",
  ],
  failureFlow: [
    "Mentor explains why",
    "Tutor remediates",
    "Retest when ready",
  ],
  artificialWaitingPeriods: false,
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function decideTutorLessonReadiness({
  masteryEstimate,
  masteryThreshold,
  tutorReason,
}: {
  masteryEstimate: number;
  masteryThreshold: number;
  tutorReason?: string;
}): TutorLessonReadinessDecision {
  const readyToContinue = masteryEstimate >= masteryThreshold;

  return {
    checkType: "natural_lesson_check",
    decidedBy: "Tutor",
    readyToContinue,
    reason:
      tutorReason ||
      (readyToContinue
        ? "The learner has shown enough understanding in the lesson conversation to keep going."
        : "The learner needs one more supported practice loop before continuing."),
    nextAction: readyToContinue ? "continue" : "remediate",
    formalAssessmentRequired: false,
    artificialWaitingPeriod: false,
  };
}

export function evaluateBeastAcademyCompletion({
  learnerName,
  pathName,
  completedAt,
  scope,
  masteryPercent,
  requiredMasteryPercent = 80,
  skillsDemonstrated,
  evidence,
}: {
  learnerName: string;
  pathName: string;
  completedAt: string;
  scope: BeastAcademyFormalAssessmentScope;
  masteryPercent: number;
  requiredMasteryPercent?: number;
  skillsDemonstrated: string[];
  evidence: string[];
}): BeastAcademyCompletionResult {
  const passed = masteryPercent >= requiredMasteryPercent;
  const pathSlug = slugify(pathName);
  const dateSlug = slugify(completedAt);
  const completionRecord: BeastAcademyCompletionRecord = {
    id: `completion-${pathSlug}-${dateSlug}`,
    learnerName,
    pathName,
    completedAt,
    scope,
    status: passed ? "passed" : "needs_remediation",
    masteryPercent,
    requiredMasteryPercent,
    skillsDemonstrated,
    evidence,
  };

  if (!passed) {
    return {
      status: "needs_remediation",
      completionRecord,
      mentorMessage:
        `You are not blocked. Your result shows ${masteryPercent}% readiness, and ${requiredMasteryPercent}% is needed for this ${scope.replace("_", " ")}. Your Mentor will explain the gap and your Tutor will help you practice the exact skills that need another pass.`,
      tutorAction:
        "Remediate the missing skills, check understanding naturally during practice, and retest as soon as the learner is ready.",
      retestPolicy: {
        retestWhenReady: true,
        artificialWaitingPeriod: false,
      },
    };
  }

  const certificateId = generateLearningCertificateId({
    learnerName,
    pathName,
    completionDate: completedAt,
  });
  const portfolioEntryId = `portfolio-${pathSlug}-${dateSlug}`;
  const certificate: LearningCertificate = {
    id: `certificate-${pathSlug}-${dateSlug}`,
    learnerName,
    pathName,
    completionDate: completedAt,
    certificateId,
    certificateTitle: "Beast Academy Certificate",
    skillsDemonstrated,
    completionRecordId: completionRecord.id,
    portfolioEntryId,
    language:
      "Beast Academy Certificate of completion for an internal BeastEducation path. This is non-accredited and does not represent institutional credit.",
    verificationPlaceholder:
      "Verification confirms certificate ownership, demonstrated skills, and completion details.",
  };
  const portfolioEntry: LearnerPortfolioEntry = {
    id: portfolioEntryId,
    title: `${pathName} completion`,
    summary: `Completed with demonstrated skills: ${skillsDemonstrated.join(", ")}.`,
    completedAt,
    skillsDemonstrated,
    certificateId,
  };

  return {
    status: "passed",
    completionRecord,
    certificate,
    portfolioEntry,
    mentorMessage:
      "You earned this. Your Mentor will add the completion to your learning record and portfolio.",
    tutorAction:
      "Celebrate the demonstrated skills and hand the learner back to the Mentor for the next goal.",
    retestPolicy: {
      retestWhenReady: true,
      artificialWaitingPeriod: false,
    },
  };
}
