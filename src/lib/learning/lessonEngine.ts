import {
  normalizeLearningActivityType,
  type LearningActivityRunnerRow,
  type LearningActivityType,
} from "./activityRunner";
import {
  getSampleLearningContentRecordForActivityTitle,
} from "./sampleContentRegistry";

export { combiningLikeTermsLesson } from "./sampleContentRegistry";

export type LessonEnginePhaseKind =
  | "assessment"
  | "lesson"
  | "practice"
  | "quiz"
  | "coach"
  | "reflection"
  | "mastery"
  | "recommendation";

export type LessonEnginePhase = {
  id: LessonEnginePhaseKind;
  label: string;
  title: string;
  prompt: string;
  check: string;
};

export type AdaptiveLessonExample = {
  title: string;
  setup: string;
  steps: string[];
  takeaway: string;
};

export type AdaptivePracticeStep = {
  id: string;
  prompt: string;
  hint: string;
  expectedAnswer: string;
  acceptedAnswers?: string[];
};

export type AdaptiveQuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
};

export type AdaptiveCoachPrompt = {
  kind: "mistake" | "alternate" | "encouragement" | "review" | "mastery";
  title: string;
  prompt: string;
};

export type InteractiveLessonTerm = {
  id: string;
  label: string;
  coefficient: number;
  variable: string;
  group: "x" | "constant" | "other";
  color: "blue" | "green" | "yellow";
};

export type InteractiveLessonVisual = {
  title: string;
  prompt: string;
  expression: string;
  terms: InteractiveLessonTerm[];
  targetGroups: Array<{
    group: InteractiveLessonTerm["group"];
    label: string;
    combinedLabel: string;
    explanation: string;
  }>;
};

export type AdaptiveLesson = {
  id: string;
  title: string;
  subject: string;
  scopeId?: string;
  objectiveIds?: string[];
  prerequisiteIds?: string[];
  learningObjective: string;
  prerequisiteConcepts: string[];
  explanation: string;
  interactiveVisual: InteractiveLessonVisual;
  examples: AdaptiveLessonExample[];
  guidedPractice: AdaptivePracticeStep[];
  quizQuestions: AdaptiveQuizQuestion[];
  aiCoachingPrompts: AdaptiveCoachPrompt[];
  reflectionPrompts: string[];
  masteryThreshold: number;
  recommendedNextLesson: string;
  reviewRecommendation: string;
};

export type LessonEngineDefinition = {
  activityType: LearningActivityType;
  title: string;
  summary: string;
  lesson: AdaptiveLesson;
  phases: LessonEnginePhase[];
  completionCriteria: LessonCompletionCriterion[];
  assessmentAssumptions: LessonAssessmentAssumption[];
  masteryAssumptions: string[];
  completionLabel: string;
};

export type LessonAssessmentAssumption = {
  id: "quiz" | "guided-practice" | "confidence" | "phase-progress";
  label: string;
  weight: number;
  description: string;
};

export type LessonAssessmentSignal = {
  id: LessonAssessmentAssumption["id"];
  label: string;
  score: number;
  weight: number;
  evidence: string;
};

export type LessonProgressContinuity = {
  currentActivityStatus: "in_progress" | "ready_to_complete";
  nextActivityBasis: "recommend_next_lesson" | "recommend_review";
  preservedSignals: string[];
  handoffSummary: string;
};

export type LessonEngineProgress = {
  completedPhases: number;
  completedSteps: number;
  requiredSteps: number;
  quizCorrect: number;
  quizTotal: number;
  quizPercent: number;
  practiceCorrect: number;
  practiceTotal: number;
  confidenceScore: number;
  masteryEstimate: number;
  mastered: boolean;
  recommendedReview: boolean;
  readyToComplete: boolean;
  completionReviewReasons: string[];
  assessmentSignals: LessonAssessmentSignal[];
  masteryAssumptions: string[];
  continuity: LessonProgressContinuity;
  percent: number;
  nextRecommendation: string;
  coachingMessage: string;
};

export type LessonCompletionCriterion = {
  id:
    | "phases-reviewed"
    | "guided-practice-attempted"
    | "quiz-answered"
    | "reflection-captured"
    | "mastery-reviewed";
  label: string;
  required: boolean;
};

const confidenceScores: Record<string, number> = {
  "Still building": 45,
  "Getting clearer": 70,
  "Ready for more": 90,
};

const teachingPhases: LessonEnginePhase[] = [
  {
    id: "assessment",
    label: "Assessment",
    title: "Start with what you already know",
    prompt: "Make a quick prediction before the lesson begins. Beast uses that starting point to teach the next step.",
    check: "I named what I know and what feels uncertain.",
  },
  {
    id: "lesson",
    label: "Lesson",
    title: "Learn the idea in plain language",
    prompt: "Read the explanation, then say the idea back in your own words.",
    check: "I can explain the main idea.",
  },
  {
    id: "practice",
    label: "Guided Practice",
    title: "Try it with support",
    prompt: "Work the guided practice before the quiz. Use the hint if you get stuck.",
    check: "I tried the guided practice.",
  },
  {
    id: "quiz",
    label: "Quiz",
    title: "Check understanding",
    prompt: "Answer the quick check from memory first. Mistakes are useful signals.",
    check: "I answered the quiz.",
  },
  {
    id: "coach",
    label: "AI Coach",
    title: "Get coached, not just graded",
    prompt: "Use the coaching prompts to understand mistakes, try a different explanation, or decide what to review.",
    check: "I used the coaching guidance.",
  },
  {
    id: "reflection",
    label: "Reflection",
    title: "Make the learning stick",
    prompt: "Capture what changed in your understanding and where Beast should guide you next.",
    check: "I wrote a reflection.",
  },
  {
    id: "mastery",
    label: "Mastery",
    title: "Evaluate readiness",
    prompt: "Beast estimates mastery from your quiz, confidence, and completed teaching steps.",
    check: "I reviewed my mastery estimate.",
  },
  {
    id: "recommendation",
    label: "Recommendation",
    title: "Know what to do next",
    prompt: "Use the recommendation to decide whether to move forward or review first.",
    check: "I know my next learning move.",
  },
];

function buildGenericAdaptiveLesson(activity: Pick<LearningActivityRunnerRow, "title" | "difficulty">): AdaptiveLesson {
  return {
    id: `adaptive-${activity.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: activity.title,
    subject: "Learning Path",
    learningObjective: `Understand the core idea in ${activity.title} and use it in one guided attempt.`,
    prerequisiteConcepts: [
      "Know the goal of the current course.",
      "Recall the last lesson or activity.",
      "Be ready to explain your thinking in one sentence.",
    ],
    explanation:
      "Beast teaches this activity in small steps: start with what you know, learn the core idea, practice once with support, check understanding, get coached, reflect, and choose the next move.",
    interactiveVisual: {
      title: "Build the idea",
      prompt: "Use this space to identify what belongs together before answering.",
      expression: activity.title,
      terms: [
        { id: "core-idea", label: "Core idea", coefficient: 1, variable: "", group: "other", color: "blue" },
        { id: "example", label: "Example", coefficient: 1, variable: "", group: "other", color: "green" },
        { id: "check", label: "Check", coefficient: 1, variable: "", group: "other", color: "yellow" },
      ],
      targetGroups: [
        {
          group: "other",
          label: "Learning pieces",
          combinedLabel: "Idea + Example + Check",
          explanation: "A good learning attempt connects the idea, one example, and one check.",
        },
      ],
    },
    examples: [
      {
        title: "Worked example",
        setup: activity.title,
        steps: [
          "Identify the core concept.",
          "Apply it once with support.",
          "Check whether the result matches the goal.",
        ],
        takeaway: "A small, correct step is enough to build momentum.",
      },
    ],
    guidedPractice: [
      {
        id: "generic-practice",
        prompt: "Write one attempt at the core skill for this activity.",
        hint: "Keep the attempt small. One clear step is better than guessing through the whole problem.",
        expectedAnswer: "A clear, supported attempt.",
        acceptedAnswers: ["attempt", "clear attempt", "supported attempt"],
      },
    ],
    quizQuestions: [
      {
        id: "generic-quiz-1",
        prompt: "What should you do first when a lesson feels unclear?",
        options: ["Guess quickly", "Name what is confusing", "Skip the lesson"],
        answer: "Name what is confusing",
        explanation: "Naming the confusion gives Beast a better signal for coaching and review.",
      },
    ],
    aiCoachingPrompts: [
      {
        kind: "mistake",
        title: "Explain the mistake",
        prompt: "Explain the likely mistake and show the first corrected step.",
      },
      {
        kind: "alternate",
        title: "Alternate explanation",
        prompt: "Explain this concept with a simpler analogy.",
      },
      {
        kind: "encouragement",
        title: "Encouragement",
        prompt: "Encourage the learner and give one next action.",
      },
      {
        kind: "review",
        title: "Review signal",
        prompt: "Recommend a review step if the learner is not ready.",
      },
      {
        kind: "mastery",
        title: "Mastery signal",
        prompt: "Celebrate mastery and recommend the next lesson.",
      },
    ],
    reflectionPrompts: [
      "What changed in your understanding?",
      "What should Beast explain differently next time?",
    ],
    masteryThreshold: activity.difficulty === "Advanced" ? 85 : 80,
    recommendedNextLesson: "Continue with the next ready activity",
    reviewRecommendation: "Review the core idea once more before moving forward.",
  };
}

const completionLabels: Record<LearningActivityType, string> = {
  Lesson: "Finish lesson",
  Practice: "Finish guided practice",
  Quiz: "Finish quiz",
  "AI Tutor Challenge": "Finish coaching challenge",
  Reflection: "Save reflection",
};

const lessonCompletionCriteria: LessonCompletionCriterion[] = [
  {
    id: "phases-reviewed",
    label: "Review every teaching phase.",
    required: true,
  },
  {
    id: "guided-practice-attempted",
    label: "Attempt all guided practice before completion.",
    required: true,
  },
  {
    id: "quiz-answered",
    label: "Answer every quiz question before completion.",
    required: true,
  },
  {
    id: "reflection-captured",
    label: "Capture a learner reflection.",
    required: true,
  },
  {
    id: "mastery-reviewed",
    label: "Review mastery estimate and recommendation before moving on.",
    required: true,
  },
];

const lessonAssessmentAssumptions: LessonAssessmentAssumption[] = [
  {
    id: "quiz",
    label: "Quiz signal",
    weight: 0.45,
    description:
      "Quiz answers are a recall signal only; they do not prove durable mastery by themselves.",
  },
  {
    id: "guided-practice",
    label: "Guided practice signal",
    weight: 0.2,
    description:
      "Guided practice shows supported skill use and should be reviewed with hints and attempts.",
  },
  {
    id: "confidence",
    label: "Confidence signal",
    weight: 0.2,
    description:
      "Learner confidence is self-reported and may raise or lower review urgency without overriding evidence.",
  },
  {
    id: "phase-progress",
    label: "Teaching progress signal",
    weight: 0.15,
    description:
      "Completed phases show lesson engagement, not independent mastery.",
  },
];

const masteryAssumptions = [
  "Mastery is a conservative readiness estimate, not an accredited assessment.",
  "A low estimate should recommend review without shame or penalty language.",
  "A high estimate means ready for the next lesson, not guaranteed long-term retention.",
  "Missing quiz, practice, reflection, or confidence evidence lowers certainty.",
];

export function buildLessonEngineDefinition(
  activity: Pick<LearningActivityRunnerRow, "activity_type" | "title" | "difficulty">
): LessonEngineDefinition {
  const activityType = normalizeLearningActivityType(activity.activity_type);
  const lesson =
    getSampleLearningContentRecordForActivityTitle(activity.title)?.lesson ||
    buildGenericAdaptiveLesson(activity);

  return {
    activityType,
    title: lesson.title,
    summary:
      "A guided teaching flow that adapts the next step from assessment, practice, quiz results, confidence, and reflection.",
    lesson,
    completionLabel: completionLabels[activityType],
    phases: teachingPhases,
    completionCriteria: lessonCompletionCriteria,
    assessmentAssumptions: lessonAssessmentAssumptions,
    masteryAssumptions,
  };
}

export function getQuizScore({
  questions,
  quizAnswers,
}: {
  questions: AdaptiveQuizQuestion[];
  quizAnswers: Record<string, string>;
}) {
  const correct = questions.filter(
    (question) => quizAnswers[question.id] === question.answer
  ).length;
  const total = questions.length;

  return {
    correct,
    total,
    percent: total === 0 ? 100 : Math.round((correct / total) * 100),
  };
}

function normalizeAnswer(value: string) {
  return value.toLowerCase().replace(/\s+/g, "").replace(/\*/g, "");
}

export function isPracticeAnswerCorrect(
  practice: AdaptivePracticeStep,
  answer: string
) {
  const normalized = normalizeAnswer(answer);
  const accepted = practice.acceptedAnswers?.length
    ? practice.acceptedAnswers
    : [practice.expectedAnswer];

  return accepted.map(normalizeAnswer).includes(normalized);
}

export function getGuidedPracticeScore({
  practice,
  practiceAnswers,
}: {
  practice: AdaptivePracticeStep[];
  practiceAnswers: Record<string, string>;
}) {
  const answered = practice.filter((step) => practiceAnswers[step.id]?.trim());
  const correct = practice.filter((step) =>
    isPracticeAnswerCorrect(step, practiceAnswers[step.id] || "")
  );

  return {
    answered: answered.length,
    correct: correct.length,
    total: practice.length,
    percent:
      practice.length === 0
        ? 100
        : Math.round((correct.length / practice.length) * 100),
  };
}

export function getTeachingVisualSelectionFeedback({
  lesson,
  selectedTermIds,
}: {
  lesson: AdaptiveLesson;
  selectedTermIds: string[];
}) {
  const selectedTerms = lesson.interactiveVisual.terms.filter((term) =>
    selectedTermIds.includes(term.id)
  );

  if (selectedTerms.length === 0) {
    return {
      correct: false,
      title: "Choose a group",
      message: "Select matching items from the visual before checking the group.",
    };
  }

  const selectedGroups = new Set(selectedTerms.map((term) => term.group));
  if (selectedGroups.size > 1) {
    return {
      correct: false,
      title: "Not quite",
      message: "Those items do not all belong to the same target group.",
    };
  }

  const group = selectedTerms[0]?.group;
  const target = lesson.interactiveVisual.targetGroups.find(
    (candidate) => candidate.group === group
  );
  const expectedCount = lesson.interactiveVisual.terms.filter(
    (term) => term.group === group
  ).length;

  if (selectedTerms.length < expectedCount) {
    return {
      correct: false,
      title: "Almost",
      message: `You found ${target?.label || "a group"}. Look for every matching item before moving on.`,
    };
  }

  return {
    correct: true,
    title: target?.combinedLabel || "Correct group",
    message: target?.explanation || "These terms belong together.",
  };
}

export function getLessonTeacherResponse({
  lesson,
  question,
  quizPercent,
  masteryEstimate,
}: {
  lesson: AdaptiveLesson;
  question: string;
  quizPercent: number;
  masteryEstimate: number;
}) {
  const lowerQuestion = question.toLowerCase();

  if (!question.trim()) {
    return `Ask me about ${lesson.title}, a mistake, a hint, review, or what to do next.`;
  }

  if (/why|mistake|wrong|confus/.test(lowerQuestion)) {
    return (
      lesson.aiCoachingPrompts.find((prompt) => prompt.kind === "mistake")
        ?.prompt ||
      lesson.quizQuestions[0]?.explanation ||
      lesson.explanation
    );
  }

  if (/next|master|review/.test(lowerQuestion)) {
    return masteryEstimate >= lesson.masteryThreshold && quizPercent >= 70
      ? `You are ready for the next lesson: ${lesson.recommendedNextLesson}.`
      : `${lesson.reviewRecommendation} Then try one more practice problem and re-check your quiz answers.`;
  }

  if (/hint|help|practice/.test(lowerQuestion)) {
    return lesson.guidedPractice[0]?.hint || lesson.explanation;
  }

  return lesson.explanation;
}

export function buildCoachMessage({
  mastered,
  recommendedReview,
  quizPercent,
  lesson,
}: {
  mastered: boolean;
  recommendedReview: boolean;
  quizPercent: number;
  lesson: AdaptiveLesson;
}) {
  if (mastered) {
    return `You are ready to move on. Next lesson: ${lesson.recommendedNextLesson}.`;
  }

  if (recommendedReview) {
    return `${lesson.reviewRecommendation} Your quiz score was ${quizPercent}%, so Beast recommends one normal review pass before the next lesson.`;
  }

  return "You are close. Review the coaching notes, then finish with a reflection before moving forward.";
}

function buildAssessmentSignals({
  quizPercent,
  practicePercent,
  confidenceScore,
  phasePercent,
}: {
  quizPercent: number;
  practicePercent: number;
  confidenceScore: number;
  phasePercent: number;
}): LessonAssessmentSignal[] {
  const scores: Record<LessonAssessmentAssumption["id"], number> = {
    quiz: quizPercent,
    "guided-practice": practicePercent,
    confidence: confidenceScore,
    "phase-progress": phasePercent,
  };

  return lessonAssessmentAssumptions.map((assumption) => ({
    id: assumption.id,
    label: assumption.label,
    score: scores[assumption.id],
    weight: assumption.weight,
    evidence: assumption.description,
  }));
}

export function getLessonEngineProgress({
  checkedPhases,
  phaseCount,
  reflection,
  confidence,
  quizAnswers,
  practiceAnswers,
  lesson,
}: {
  checkedPhases: Record<string, boolean>;
  phaseCount: number;
  reflection: string;
  confidence: string;
  quizAnswers: Record<string, string>;
  practiceAnswers?: Record<string, string>;
  lesson: AdaptiveLesson;
}): LessonEngineProgress {
  const completedPhases = Object.values(checkedPhases).filter(Boolean).length;
  const reflectionComplete = reflection.trim().length > 0;
  const quiz = getQuizScore({ questions: lesson.quizQuestions, quizAnswers });
  const practice = practiceAnswers
    ? getGuidedPracticeScore({ practice: lesson.guidedPractice, practiceAnswers })
    : {
        answered: lesson.guidedPractice.length,
        correct: lesson.guidedPractice.length,
        total: lesson.guidedPractice.length,
        percent: 100,
      };
  const confidenceScore = confidenceScores[confidence] || 60;
  const phasePercent = phaseCount === 0 ? 0 : Math.round((completedPhases / phaseCount) * 100);
  const masteryEstimate = Math.round(
    quiz.percent * 0.45 +
      practice.percent * 0.2 +
      confidenceScore * 0.2 +
      phasePercent * 0.15
  );
  const answeredQuizQuestions = lesson.quizQuestions.filter(
    (question) => Boolean(quizAnswers[question.id])
  ).length;
  const requiredSteps =
    phaseCount + lesson.guidedPractice.length + lesson.quizQuestions.length + 1;
  const completedSteps =
    completedPhases +
    practice.answered +
    answeredQuizQuestions +
    (reflectionComplete ? 1 : 0);
  const mastered = masteryEstimate >= lesson.masteryThreshold && quiz.percent >= 70;
  const recommendedReview = !mastered && (quiz.percent < 70 || confidenceScore < 70);
  const completionReviewReasons = [
    ...(completedPhases === phaseCount ? [] : ["Review every teaching phase."]),
    ...(practice.answered === lesson.guidedPractice.length
      ? []
      : ["Attempt all guided practice steps."]),
    ...(answeredQuizQuestions === lesson.quizQuestions.length
      ? []
      : ["Answer every quiz question."]),
    ...(reflectionComplete ? [] : ["Capture a learner reflection."]),
    ...(mastered || !recommendedReview
      ? []
      : ["Review is recommended before the next lesson."]),
  ];
  const readyToComplete =
    completedPhases === phaseCount &&
    practice.answered === lesson.guidedPractice.length &&
    reflectionComplete &&
    answeredQuizQuestions === lesson.quizQuestions.length;
  const nextRecommendation = mastered
    ? lesson.recommendedNextLesson
    : lesson.reviewRecommendation;
  const assessmentSignals = buildAssessmentSignals({
    quizPercent: quiz.percent,
    practicePercent: practice.percent,
    confidenceScore,
    phasePercent,
  });
  const continuity: LessonProgressContinuity = {
    currentActivityStatus: readyToComplete ? "ready_to_complete" : "in_progress",
    nextActivityBasis: mastered ? "recommend_next_lesson" : "recommend_review",
    preservedSignals: assessmentSignals.map(
      (signal) => `${signal.id}:${signal.score}`
    ),
    handoffSummary: `Next: ${nextRecommendation}. Evidence: quiz ${quiz.percent}%, practice ${practice.percent}%, confidence ${confidenceScore}%, phases ${phasePercent}%.`,
  };

  return {
    completedPhases,
    completedSteps,
    requiredSteps,
    quizCorrect: quiz.correct,
    quizTotal: quiz.total,
    quizPercent: quiz.percent,
    practiceCorrect: practice.correct,
    practiceTotal: practice.total,
    confidenceScore,
    masteryEstimate,
    mastered,
    recommendedReview,
    readyToComplete,
    completionReviewReasons,
    assessmentSignals,
    masteryAssumptions,
    continuity,
    percent:
      requiredSteps === 0
        ? 0
        : Math.min(100, Math.round((completedSteps / requiredSteps) * 100)),
    nextRecommendation,
    coachingMessage: buildCoachMessage({
      mastered,
      recommendedReview,
      quizPercent: quiz.percent,
      lesson,
    }),
  };
}
