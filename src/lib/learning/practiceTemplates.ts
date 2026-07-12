import type { AdaptivePracticeStep } from "./lessonEngine";

export type PracticeDifficulty = "introductory" | "developing" | "challenge";
export type PracticeFormat =
  | "short-response"
  | "worked-step"
  | "scenario"
  | "conversation";

export type PracticeTemplate = {
  id: string;
  title: string;
  purpose: string;
  format: PracticeFormat;
  difficulty: PracticeDifficulty;
  learnerSupport: "high" | "medium" | "low";
  requiresHint: true;
  requiresExpectedAnswer: true;
};

export const practiceTemplateLibrary: PracticeTemplate[] = [
  {
    id: "supported-recall",
    title: "Supported Recall",
    purpose: "Ask the learner for one small answer with a high-support hint.",
    format: "short-response",
    difficulty: "introductory",
    learnerSupport: "high",
    requiresHint: true,
    requiresExpectedAnswer: true,
  },
  {
    id: "worked-step",
    title: "Worked Step",
    purpose: "Ask the learner to complete one step in a procedure or reasoning chain.",
    format: "worked-step",
    difficulty: "developing",
    learnerSupport: "medium",
    requiresHint: true,
    requiresExpectedAnswer: true,
  },
  {
    id: "applied-scenario",
    title: "Applied Scenario",
    purpose: "Ask the learner to choose or describe a move in a realistic situation.",
    format: "scenario",
    difficulty: "developing",
    learnerSupport: "medium",
    requiresHint: true,
    requiresExpectedAnswer: true,
  },
  {
    id: "conversation-turn",
    title: "Conversation Turn",
    purpose: "Ask the learner to produce or interpret one conversational exchange.",
    format: "conversation",
    difficulty: "introductory",
    learnerSupport: "high",
    requiresHint: true,
    requiresExpectedAnswer: true,
  },
  {
    id: "independent-challenge",
    title: "Independent Challenge",
    purpose: "Ask the learner to complete a lower-support challenge attempt.",
    format: "short-response",
    difficulty: "challenge",
    learnerSupport: "low",
    requiresHint: true,
    requiresExpectedAnswer: true,
  },
];

export function getPracticeTemplateById(templateId: string) {
  return practiceTemplateLibrary.find((template) => template.id === templateId);
}

export function getPracticeTemplateForStep(step: AdaptivePracticeStep) {
  return getPracticeTemplateById(step.practiceTemplateId || "supported-recall");
}

export function getPracticeTemplateCoverage(step: AdaptivePracticeStep) {
  return {
    hasTemplate: Boolean(getPracticeTemplateForStep(step)),
    hasDifficulty: Boolean(step.difficulty || getPracticeTemplateForStep(step)?.difficulty),
    hasFormat: Boolean(step.format || getPracticeTemplateForStep(step)?.format),
    hasHint: step.hint.trim().length > 0,
    hasExpectedAnswer: step.expectedAnswer.trim().length > 0,
  };
}

export function practiceStepSatisfiesTemplate(step: AdaptivePracticeStep) {
  const coverage = getPracticeTemplateCoverage(step);

  return Object.values(coverage).every(Boolean);
}

export function lessonPracticeSatisfiesTemplates(steps: AdaptivePracticeStep[]) {
  return steps.length > 0 && steps.every(practiceStepSatisfiesTemplate);
}

export function getPracticeTemplateVariation(steps: AdaptivePracticeStep[]) {
  return {
    difficulties: Array.from(
      new Set(
        steps
          .map((step) => step.difficulty || getPracticeTemplateForStep(step)?.difficulty)
          .filter(Boolean)
      )
    ),
    formats: Array.from(
      new Set(
        steps
          .map((step) => step.format || getPracticeTemplateForStep(step)?.format)
          .filter(Boolean)
      )
    ),
  };
}
