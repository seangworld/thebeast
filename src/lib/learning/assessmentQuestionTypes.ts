import type { AdaptiveQuizQuestion } from "./lessonEngine";

export type AssessmentResponseKind =
  | "multiple-choice"
  | "numeric"
  | "written"
  | "step-response";

export type AssessmentQuestionType = {
  id: string;
  label: string;
  responseKind: AssessmentResponseKind;
  learnerInput: "select-one" | "number" | "free-text" | "ordered-steps";
  supportsPartialCredit: boolean;
  requiresAnswerKey: true;
  requiresFeedback: true;
};

export const assessmentQuestionTypeRegistry: AssessmentQuestionType[] = [
  {
    id: "multiple-choice",
    label: "Multiple Choice",
    responseKind: "multiple-choice",
    learnerInput: "select-one",
    supportsPartialCredit: false,
    requiresAnswerKey: true,
    requiresFeedback: true,
  },
  {
    id: "numeric-response",
    label: "Numeric Response",
    responseKind: "numeric",
    learnerInput: "number",
    supportsPartialCredit: false,
    requiresAnswerKey: true,
    requiresFeedback: true,
  },
  {
    id: "written-response",
    label: "Written Response",
    responseKind: "written",
    learnerInput: "free-text",
    supportsPartialCredit: true,
    requiresAnswerKey: true,
    requiresFeedback: true,
  },
  {
    id: "step-response",
    label: "Step Response",
    responseKind: "step-response",
    learnerInput: "ordered-steps",
    supportsPartialCredit: true,
    requiresAnswerKey: true,
    requiresFeedback: true,
  },
];

export function getAssessmentQuestionTypeById(typeId: string) {
  return assessmentQuestionTypeRegistry.find((type) => type.id === typeId);
}

export function getAssessmentQuestionTypeForQuestion(
  question: Pick<AdaptiveQuizQuestion, "questionTypeId" | "options">
) {
  return getAssessmentQuestionTypeById(
    question.questionTypeId || (question.options.length > 0 ? "multiple-choice" : "written-response")
  );
}

export function questionSatisfiesAssessmentType(question: AdaptiveQuizQuestion) {
  const type = getAssessmentQuestionTypeForQuestion(question);

  return Boolean(
    type &&
      question.prompt.trim().length > 0 &&
      question.answer.trim().length > 0 &&
      question.explanation.trim().length > 0 &&
      (type.responseKind !== "multiple-choice" || question.options.length > 0)
  );
}

export function getAssessmentQuestionTypeCoverage(questions: AdaptiveQuizQuestion[]) {
  return Array.from(
    new Set(
      questions
        .map((question) => getAssessmentQuestionTypeForQuestion(question)?.responseKind)
        .filter(Boolean)
    )
  );
}
