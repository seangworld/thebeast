import type { SampleCurriculumScope } from "./sampleContentRegistry";

export type DiagnosticConfidence = "low" | "medium" | "high";

export type DiagnosticPlacementQuestion = {
  id: string;
  conceptId: string;
  prompt: string;
};

export type DiagnosticPlacementResponse = {
  questionId: string;
  answer: string;
  confidence?: string;
};

export type DiagnosticAnswerEvidence = {
  questionId: string;
  conceptId: string;
  correct: boolean;
  answered: boolean;
  confidence: DiagnosticConfidence;
  scorePercent: number;
  reason: string;
};

export type DiagnosticConceptStatus =
  | "mastered"
  | "partial"
  | "prerequisite-gap"
  | "misconception"
  | "unknown";

export type DiagnosticConceptResult = {
  conceptId: string;
  status: DiagnosticConceptStatus;
  masteryPercent: number;
  confidence: DiagnosticConfidence;
  prerequisiteIds: string[];
  blocksConceptIds: string[];
  evidence: DiagnosticAnswerEvidence[];
  why: string;
};

export type DiagnosticIntelligenceResult = {
  adaptiveReadinessLevel: "start-here" | "guided-review" | "ready-for-lesson";
  partialMasteryConceptIds: string[];
  prerequisiteGapConceptIds: string[];
  misconceptionConceptIds: string[];
  dependencyBlockedConceptIds: string[];
  primaryFocusConceptId: string;
  conceptDiagnostics: DiagnosticConceptResult[];
  rootCauses: string[];
  mentorExplanation: string;
  recommendedAction: "begin-lesson" | "review-prerequisite" | "repair-misconception" | "confirm-confidence";
};

function normalizeConfidence(value?: string): DiagnosticConfidence {
  const normalized = (value || "").trim().toLowerCase();

  if (
    normalized.includes("guess") ||
    normalized.includes("not sure") ||
    normalized.includes("unsure") ||
    normalized.includes("low") ||
    normalized.includes("still building")
  ) {
    return "low";
  }

  if (
    normalized.includes("confident") ||
    normalized.includes("ready") ||
    normalized.includes("high") ||
    normalized.includes("sure")
  ) {
    return "high";
  }

  return "medium";
}

function scoreEvidence(correct: boolean, answered: boolean, confidence: DiagnosticConfidence) {
  if (correct && confidence === "high") return 100;
  if (correct && confidence === "medium") return 88;
  if (correct) return 72;
  if (!answered) return 0;
  if (confidence === "high") return 18;
  if (confidence === "medium") return 32;
  return 40;
}

function average(values: number[]) {
  return values.length
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
}

function confidenceFromScore(value: number): DiagnosticConfidence {
  if (value >= 80) return "high";
  if (value >= 45) return "medium";
  return "low";
}

function statusFromEvidence(
  evidence: DiagnosticAnswerEvidence[],
  prerequisiteIds: string[]
): DiagnosticConceptStatus {
  if (!evidence.length) return "unknown";

  const masteryPercent = average(evidence.map((item) => item.scorePercent));
  const anyCorrect = evidence.some((item) => item.correct);
  const anyConfidentMiss = evidence.some((item) => !item.correct && item.answered && item.confidence === "high");

  if (anyConfidentMiss) return "misconception";
  if (masteryPercent >= 85) return "mastered";
  if (anyCorrect || masteryPercent >= 35) return "partial";
  if (prerequisiteIds.length > 0) return "prerequisite-gap";
  return "unknown";
}

function getPrerequisitesForConcept(conceptId: string, scope?: SampleCurriculumScope) {
  if (!scope) return [];

  const objectivePrerequisites = scope.objectives
    .filter((objective) => objective.conceptId === conceptId || objective.id === conceptId)
    .flatMap((objective) => objective.prerequisiteIds);
  const lessonPrerequisites = scope.lessons
    .filter((lesson) => lesson.conceptIds.includes(conceptId) || lesson.objectiveIds.includes(conceptId))
    .flatMap((lesson) => lesson.prerequisiteIds);

  return Array.from(new Set([...objectivePrerequisites, ...lessonPrerequisites]));
}

function getBlockedConcepts(conceptId: string, scope?: SampleCurriculumScope) {
  if (!scope) return [];

  const objectiveBlocks = scope.objectives
    .filter((objective) => objective.prerequisiteIds.includes(conceptId))
    .map((objective) => objective.conceptId);
  const lessonBlocks = scope.lessons
    .filter((lesson) => lesson.prerequisiteIds.includes(conceptId))
    .flatMap((lesson) => lesson.conceptIds);

  return Array.from(new Set([...objectiveBlocks, ...lessonBlocks].filter((id) => id !== conceptId)));
}

function buildWhy({
  conceptId,
  status,
  evidence,
  blocksConceptIds,
}: {
  conceptId: string;
  status: DiagnosticConceptStatus;
  evidence: DiagnosticAnswerEvidence[];
  blocksConceptIds: string[];
}) {
  if (status === "mastered") {
    return `${conceptId} looks ready from this placement evidence.`;
  }

  if (status === "misconception") {
    return `The answer missed ${conceptId} while confidence was high, so the Mentor should repair a likely misconception before adding harder work.`;
  }

  if (status === "partial") {
    const lowConfidenceCorrect = evidence.some((item) => item.correct && item.confidence !== "high");
    return lowConfidenceCorrect
      ? `The answer was correct, but confidence was not solid yet. Treat ${conceptId} as partial mastery and confirm it with one more check.`
      : `${conceptId} shows some evidence, but not enough for independent mastery yet.`;
  }

  if (status === "prerequisite-gap") {
    return `${conceptId} is blocking ${blocksConceptIds.length ? blocksConceptIds.join(", ") : "the next lesson"}, so review the prerequisite before the main lesson.`;
  }

  return `There is not enough evidence to know why ${conceptId} is difficult yet. Ask a smaller diagnostic question.`;
}

function actionFrom(status: DiagnosticConceptStatus): DiagnosticIntelligenceResult["recommendedAction"] {
  if (status === "misconception") return "repair-misconception";
  if (status === "prerequisite-gap") return "review-prerequisite";
  if (status === "partial") return "confirm-confidence";
  return "begin-lesson";
}

export function buildDiagnosticIntelligence({
  subject,
  questions,
  responses,
  correctConceptIds,
  scope,
}: {
  subject: string;
  questions: DiagnosticPlacementQuestion[];
  responses: DiagnosticPlacementResponse[];
  correctConceptIds: string[];
  scope?: SampleCurriculumScope;
}): DiagnosticIntelligenceResult {
  const responseByQuestion = new Map(
    responses.map((response) => [response.questionId, response])
  );
  const correctConceptSet = new Set(correctConceptIds);
  const evidence = questions.map((question) => {
    const response = responseByQuestion.get(question.id);
    const answered = Boolean(response?.answer.trim());
    const correct = correctConceptSet.has(question.conceptId);
    const confidence = normalizeConfidence(response?.confidence);
    const scorePercent = scoreEvidence(correct, answered, confidence);

    return {
      questionId: question.id,
      conceptId: question.conceptId,
      correct,
      answered,
      confidence,
      scorePercent,
      reason: correct
        ? confidence === "high"
          ? "Correct and confident."
          : "Correct, but confidence still needs confirmation."
        : confidence === "high"
          ? "Incorrect with high confidence, which suggests a misconception."
          : "Incorrect or incomplete with limited confidence, which suggests a prerequisite gap or shaky recall.",
    };
  });
  const conceptIds = Array.from(new Set(questions.map((question) => question.conceptId)));
  const conceptDiagnostics = conceptIds.map((conceptId) => {
    const conceptEvidence = evidence.filter((item) => item.conceptId === conceptId);
    const prerequisiteIds = getPrerequisitesForConcept(conceptId, scope);
    const missingPrerequisites = prerequisiteIds.filter((id) => !correctConceptSet.has(id));
    const blocksConceptIds = getBlockedConcepts(conceptId, scope);
    const status = statusFromEvidence(conceptEvidence, missingPrerequisites);
    const masteryPercent = average(conceptEvidence.map((item) => item.scorePercent));
    const confidence = confidenceFromScore(masteryPercent);

    return {
      conceptId,
      status,
      masteryPercent,
      confidence,
      prerequisiteIds: missingPrerequisites,
      blocksConceptIds,
      evidence: conceptEvidence,
      why: buildWhy({ conceptId, status, evidence: conceptEvidence, blocksConceptIds }),
    };
  });
  const partialMasteryConceptIds = conceptDiagnostics
    .filter((concept) => concept.status === "partial")
    .map((concept) => concept.conceptId);
  const prerequisiteGapConceptIds = conceptDiagnostics
    .filter((concept) => concept.status === "prerequisite-gap")
    .map((concept) => concept.conceptId);
  const misconceptionConceptIds = conceptDiagnostics
    .filter((concept) => concept.status === "misconception")
    .map((concept) => concept.conceptId);
  const dependencyBlockedConceptIds = Array.from(
    new Set(
      conceptDiagnostics.flatMap((concept) =>
        concept.status === "mastered" ? [] : concept.blocksConceptIds
      )
    )
  );
  const strugglingConcepts = conceptDiagnostics.filter((concept) => concept.status !== "mastered");
  const primaryFocus =
    strugglingConcepts.find((concept) => concept.status === "misconception") ||
    strugglingConcepts.find((concept) => concept.status === "prerequisite-gap") ||
    strugglingConcepts.find((concept) => concept.status === "partial") ||
    conceptDiagnostics[0];
  const adaptiveReadinessLevel =
    misconceptionConceptIds.length > 0 || prerequisiteGapConceptIds.length > 0
      ? "start-here"
      : partialMasteryConceptIds.length > 0
        ? "guided-review"
        : "ready-for-lesson";
  const rootCauses = strugglingConcepts.length
    ? strugglingConcepts.map((concept) => concept.why)
    : [`Placement for ${subject} did not show a struggle pattern yet.`];

  return {
    adaptiveReadinessLevel,
    partialMasteryConceptIds,
    prerequisiteGapConceptIds,
    misconceptionConceptIds,
    dependencyBlockedConceptIds,
    primaryFocusConceptId: primaryFocus?.conceptId || questions[0]?.conceptId || "placement",
    conceptDiagnostics,
    rootCauses,
    mentorExplanation:
      adaptiveReadinessLevel === "ready-for-lesson"
        ? `Placement shows readiness for ${subject}. I did not find a prerequisite blocker.`
        : `I found why ${subject} may feel hard: ${rootCauses[0]}`,
    recommendedAction: actionFrom(primaryFocus?.status || "mastered"),
  };
}
