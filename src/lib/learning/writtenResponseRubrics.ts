import type { AssessmentResponseKind } from "./assessmentQuestionTypes";

export type WrittenResponseRubricCriterion = {
  id: string;
  label: string;
  description: string;
  maxPoints: number;
  matchPhrases: string[];
  feedbackWhenPresent: string;
  feedbackWhenMissing: string;
};

export type WrittenResponseRubricLevel = {
  id: "complete" | "partial" | "needs-review";
  label: string;
  minPercent: number;
  feedback: string;
};

export type WrittenResponseRubric = {
  id: string;
  title: string;
  applicableResponseKinds: Array<Extract<AssessmentResponseKind, "written" | "step-response">>;
  criteria: WrittenResponseRubricCriterion[];
  levels: WrittenResponseRubricLevel[];
};

export type WrittenResponseCriterionResult = {
  criterionId: string;
  label: string;
  earnedPoints: number;
  maxPoints: number;
  met: boolean;
  feedback: string;
};

export type WrittenResponseRubricResult = {
  rubricId: string;
  earnedPoints: number;
  maxPoints: number;
  percent: number;
  level: WrittenResponseRubricLevel;
  criteria: WrittenResponseCriterionResult[];
  feedback: string[];
};

export const writtenResponseRubrics: WrittenResponseRubric[] = [
  {
    id: "explain-support-reflect",
    title: "Explain, support, and reflect",
    applicableResponseKinds: ["written", "step-response"],
    criteria: [
      {
        id: "answers-prompt",
        label: "Answers the prompt",
        description: "The response directly addresses the requested question, action, or step.",
        maxPoints: 2,
        matchPhrases: ["because", "the answer", "the step", "i would", "this means"],
        feedbackWhenPresent: "The response addresses the prompt.",
        feedbackWhenMissing: "Answer the prompt directly before adding extra detail.",
      },
      {
        id: "uses-evidence",
        label: "Uses evidence",
        description: "The response includes an example, signal, calculation, observation, or supporting detail.",
        maxPoints: 2,
        matchPhrases: ["for example", "evidence", "signal", "detail", "shows", "since"],
        feedbackWhenPresent: "The response includes support for the answer.",
        feedbackWhenMissing: "Add one concrete example, signal, or supporting detail.",
      },
      {
        id: "explains-reasoning",
        label: "Explains reasoning",
        description: "The response connects the answer and evidence with a reasoned explanation.",
        maxPoints: 2,
        matchPhrases: ["so", "therefore", "that means", "which means", "as a result"],
        feedbackWhenPresent: "The response explains why the evidence matters.",
        feedbackWhenMissing: "Explain why the support leads to the answer.",
      },
      {
        id: "names-next-step",
        label: "Names a next step",
        description: "The response identifies a follow-up, correction, review, or confidence boundary.",
        maxPoints: 1,
        matchPhrases: ["next", "review", "check", "try", "revise", "practice"],
        feedbackWhenPresent: "The response names a useful next step.",
        feedbackWhenMissing: "Name one next step or review target.",
      },
    ],
    levels: [
      {
        id: "complete",
        label: "Complete",
        minPercent: 85,
        feedback: "Strong response. The learner answered, supported, and reflected well enough to continue.",
      },
      {
        id: "partial",
        label: "Partial credit",
        minPercent: 50,
        feedback: "Partial response. The learner has usable evidence but needs targeted feedback before mastery is assumed.",
      },
      {
        id: "needs-review",
        label: "Needs review",
        minPercent: 0,
        feedback: "Needs review. The learner should revise with a direct answer, support, reasoning, and a next step.",
      },
    ],
  },
];

export function getWrittenResponseRubricById(rubricId: string) {
  return writtenResponseRubrics.find((rubric) => rubric.id === rubricId);
}

function responseContainsAnyPhrase(response: string, phrases: string[]) {
  const normalized = response.toLowerCase();
  return phrases.some((phrase) => normalized.includes(phrase.toLowerCase()));
}

export function evaluateWrittenResponseRubric({
  rubric,
  response,
}: {
  rubric: WrittenResponseRubric;
  response: string;
}): WrittenResponseRubricResult {
  const criteria = rubric.criteria.map((criterion) => {
    const met = responseContainsAnyPhrase(response, criterion.matchPhrases);

    return {
      criterionId: criterion.id,
      label: criterion.label,
      earnedPoints: met ? criterion.maxPoints : 0,
      maxPoints: criterion.maxPoints,
      met,
      feedback: met ? criterion.feedbackWhenPresent : criterion.feedbackWhenMissing,
    };
  });
  const earnedPoints = criteria.reduce((sum, criterion) => sum + criterion.earnedPoints, 0);
  const maxPoints = criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  const percent = maxPoints === 0 ? 100 : Math.round((earnedPoints / maxPoints) * 100);
  const level =
    rubric.levels
      .slice()
      .sort((a, b) => b.minPercent - a.minPercent)
      .find((candidate) => percent >= candidate.minPercent) || rubric.levels[rubric.levels.length - 1];

  return {
    rubricId: rubric.id,
    earnedPoints,
    maxPoints,
    percent,
    level,
    criteria,
    feedback: [level.feedback, ...criteria.map((criterion) => criterion.feedback)],
  };
}

export function rubricSupportsResponseKind({
  rubric,
  responseKind,
}: {
  rubric: WrittenResponseRubric;
  responseKind: AssessmentResponseKind;
}) {
  return rubric.applicableResponseKinds.includes(
    responseKind as Extract<AssessmentResponseKind, "written" | "step-response">
  );
}
