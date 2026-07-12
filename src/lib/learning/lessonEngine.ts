import {
  normalizeLearningActivityType,
  type LearningActivityRunnerRow,
  type LearningActivityType,
} from "./activityRunner";
import { preAlgebraProvingGroundScope } from "./preAlgebraScope";

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

export const combiningLikeTermsLesson: AdaptiveLesson = {
  id: "pre-algebra-combining-like-terms",
  title: "Combining Like Terms",
  subject: "Pre-Algebra",
  scopeId: preAlgebraProvingGroundScope.id,
  objectiveIds: preAlgebraProvingGroundScope.lessons[0].objectiveIds,
  prerequisiteIds: preAlgebraProvingGroundScope.lessons[0].prerequisiteIds,
  learningObjective:
    "Combine terms that have the same variable part so an expression is easier to read and solve.",
  prerequisiteConcepts: [
    "Know that a coefficient is the number in front of a variable.",
    "Recognize that x, y, and plain numbers are different kinds of terms.",
    "Add and subtract integers with confidence.",
  ],
  explanation:
    "Like terms have the same variable part. The term 3x can combine with 5x because both are x terms. The term 3x cannot combine with 5 because one has x and one is just a number. When terms are alike, keep the variable part and add or subtract the coefficients.",
  interactiveVisual: {
    title: "Sort the terms before combining",
    prompt:
      "Tap terms that belong together. Terms can combine only when their variable part matches.",
    expression: "4x + 7 + 2x + 3",
    terms: [
      { id: "term-4x", label: "4x", coefficient: 4, variable: "x", group: "x", color: "blue" },
      { id: "term-7", label: "7", coefficient: 7, variable: "", group: "constant", color: "green" },
      { id: "term-2x", label: "2x", coefficient: 2, variable: "x", group: "x", color: "blue" },
      { id: "term-3", label: "3", coefficient: 3, variable: "", group: "constant", color: "green" },
    ],
    targetGroups: [
      {
        group: "x",
        label: "x terms",
        combinedLabel: "4x + 2x = 6x",
        explanation: "Both terms have x, so add 4 + 2 and keep x.",
      },
      {
        group: "constant",
        label: "plain numbers",
        combinedLabel: "7 + 3 = 10",
        explanation: "Constants have no variable, so they combine with other constants.",
      },
    ],
  },
  examples: [
    {
      title: "Simple combine",
      setup: "3x + 5x",
      steps: [
        "Both terms are x terms.",
        "Add the coefficients: 3 + 5 = 8.",
        "Keep the x because the variable part did not change.",
      ],
      takeaway: "3x + 5x = 8x",
    },
    {
      title: "Separate groups",
      setup: "4x + 7 + 2x + 3",
      steps: [
        "Group x terms: 4x + 2x.",
        "Group number terms: 7 + 3.",
        "Combine each group separately.",
      ],
      takeaway: "4x + 7 + 2x + 3 = 6x + 10",
    },
  ],
  guidedPractice: [
    {
      id: "practice-combine-x",
      prompt: "Combine: 6x + 2x",
      hint: "Both terms have x, so add the coefficients and keep x.",
      expectedAnswer: "8x",
      acceptedAnswers: ["8x"],
    },
    {
      id: "practice-combine-groups",
      prompt: "Combine: 5x + 4 + x + 6",
      hint: "Group the x terms together, then group the plain numbers.",
      expectedAnswer: "6x + 10",
      acceptedAnswers: ["6x+10", "6x + 10", "10 + 6x"],
    },
  ],
  quizQuestions: [
    {
      id: "quiz-like-terms-1",
      prompt: "Which terms can be combined with 7x?",
      options: ["3", "2x", "4y"],
      answer: "2x",
      explanation: "2x can combine with 7x because both terms have the same variable part: x.",
    },
    {
      id: "quiz-like-terms-2",
      prompt: "Simplify: 9x + 5 - 4x + 2",
      options: ["5x + 7", "13x + 7", "5x + 3"],
      answer: "5x + 7",
      explanation: "Combine 9x - 4x to get 5x, then combine 5 + 2 to get 7.",
    },
  ],
  aiCoachingPrompts: [
    {
      kind: "mistake",
      title: "Explain a mistake",
      prompt: "If I combined unlike terms, explain why that does not work and show the correct grouping.",
    },
    {
      kind: "alternate",
      title: "Try a different explanation",
      prompt: "Explain combining like terms using colored groups or matching labels.",
    },
    {
      kind: "encouragement",
      title: "Encourage the next attempt",
      prompt: "Remind me that mistakes are information and give me one small next step.",
    },
    {
      kind: "review",
      title: "Recommend review",
      prompt: "If my mastery is low, recommend the one concept I should review before moving on.",
    },
    {
      kind: "mastery",
      title: "Celebrate mastery",
      prompt: "If I mastered this, celebrate clearly and tell me what lesson should come next.",
    },
  ],
  reflectionPrompts: [
    "What makes two terms like terms?",
    "Which part felt easiest: grouping terms, adding coefficients, or checking the final expression?",
    "What should Beast review with you before the next lesson?",
  ],
  masteryThreshold: 80,
  recommendedNextLesson: "Solving one-step equations",
  reviewRecommendation: "Review coefficients and variable parts before moving on.",
};

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

function shouldUseCombiningLikeTermsDemo(activity: Pick<LearningActivityRunnerRow, "title">) {
  return /pre[- ]?algebra|combining like terms|like terms/i.test(activity.title);
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
  const lesson = shouldUseCombiningLikeTermsDemo(activity)
    ? combiningLikeTermsLesson
    : buildGenericAdaptiveLesson(activity);

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
      message: "Select terms that have the same variable part.",
    };
  }

  const selectedGroups = new Set(selectedTerms.map((term) => term.group));
  if (selectedGroups.size > 1) {
    return {
      correct: false,
      title: "Not quite",
      message:
        "Those terms do not all match. Variables combine with matching variables, and plain numbers combine with plain numbers.",
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
      message: `You found ${target?.label || "a group"}. Look for every matching term before combining.`,
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
    return "Ask me about like terms, coefficients, grouping, a mistake, or what to do next.";
  }

  const inLessonContext =
    /like|term|coefficient|variable|combine|group|simplify|mistake|confus|next|review|master/i.test(
      question
    );

  if (!inLessonContext) {
    return `I can help inside this lesson: ${lesson.title}. Ask me about like terms, coefficients, grouping, or the next practice step.`;
  }

  if (/coefficient/.test(lowerQuestion)) {
    return "A coefficient is the number attached to a variable. In 4x, the coefficient is 4. When you combine 4x and 2x, add 4 + 2 and keep x.";
  }

  if (/why|mistake|wrong|confus/.test(lowerQuestion)) {
    return "The most common mistake is combining unlike terms. 4x and 7 cannot become 11x because 7 has no x. First sort by variable part, then add only the matching groups.";
  }

  if (/next|master|review/.test(lowerQuestion)) {
    return masteryEstimate >= lesson.masteryThreshold && quizPercent >= 70
      ? `You are ready for the next lesson: ${lesson.recommendedNextLesson}.`
      : `${lesson.reviewRecommendation} Then try one more practice problem and re-check your quiz answers.`;
  }

  return "Like terms have the same variable part. x terms combine with x terms, plain numbers combine with plain numbers, and the variable part stays the same.";
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
