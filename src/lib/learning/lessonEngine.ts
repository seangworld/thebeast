import {
  normalizeLearningActivityType,
  type LearningActivityRunnerRow,
  type LearningActivityType,
} from "./activityRunner";
import {
  resolveLearningContentRecordForActivityTitle,
} from "./sampleContentRegistry";
import { validateAnswer, type AnswerValidationRule } from "./answerValidation";
import {
  createLearningContentMetadata,
  type LearningContentMetadata,
} from "./contentVersioning";
import { generateDynamicLearningLesson } from "./dynamicLessonGenerator";
import {
  decideTutorLessonReadiness,
  type TutorLessonReadinessDecision,
} from "./academyCompletion";

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
  practiceTemplateId?: string;
  difficulty?: "introductory" | "developing" | "challenge";
  format?: "short-response" | "worked-step" | "scenario" | "conversation";
  prompt: string;
  hint: string;
  expectedAnswer: string;
  acceptedAnswers?: string[];
  validationRules?: AnswerValidationRule[];
};

export type AdaptiveQuizQuestion = {
  id: string;
  questionTypeId?: string;
  rubricId?: string;
  contentMetadata: LearningContentMetadata;
  prompt: string;
  options: string[];
  answer: string;
  acceptedAnswers?: string[];
  validationRules?: AnswerValidationRule[];
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
  templateId?: string;
  title: string;
  subject: string;
  contentMetadata: LearningContentMetadata;
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
  tutorReadinessDecision: TutorLessonReadinessDecision;
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
    prompt: "Make a quick prediction before the lesson begins. Your Tutor uses that starting point to teach the next step.",
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
    label: "Practice with support",
    title: "Try it with support",
    prompt: "Try the practice before the check-in question. Use the hint if you get stuck.",
    check: "I tried the practice.",
  },
  {
    id: "quiz",
    label: "Check-in",
    title: "Check understanding",
    prompt: "Answer the quick check from memory first. Mistakes tell us what to strengthen.",
    check: "I answered the check-in question.",
  },
  {
    id: "coach",
    label: "Tutor help",
    title: "Get coached, not just graded",
    prompt: "Ask for help to understand mistakes, try a different explanation, or decide what to review.",
    check: "I used the Tutor's help.",
  },
  {
    id: "reflection",
    label: "Reflection",
    title: "Make the learning stick",
    prompt: "Capture what changed in your understanding and where your Mentor should help next.",
    check: "I wrote a reflection.",
  },
  {
    id: "mastery",
    label: "Understanding",
    title: "See what you have learned",
    prompt: "Your Tutor looks at your answer, practice, confidence, and reflection before recommending the next step.",
    check: "I reviewed what my work shows.",
  },
  {
    id: "recommendation",
    label: "Next step",
    title: "Know what to do next",
    prompt: "Use the recommendation to decide whether to move forward or review first.",
    check: "I know my next learning move.",
  },
];

function learningDifficultyFromActivity(value: string) {
  if (value === "Advanced" || value === "Intermediate" || value === "Beginner") {
    return value;
  }

  return "Beginner";
}

function buildGenericAdaptiveLesson(activity: Pick<LearningActivityRunnerRow, "title" | "difficulty">): AdaptiveLesson {
  const learnerLevel = learningDifficultyFromActivity(activity.difficulty);
  const generated = generateDynamicLearningLesson({
    goal: activity.title,
    courseId: "dynamic-learning-path",
    courseTitle: "Learning Path",
    learnerLevel,
    mode: learnerLevel === "Advanced" ? "challenge" : "lesson",
  }).lesson;

  return {
    ...generated,
    title: activity.title,
    learningObjective: `Understand the core idea in ${activity.title} and use it in one guided attempt.`,
    masteryThreshold: activity.difficulty === "Advanced" ? 85 : 80,
    recommendedNextLesson: "Continue with the next lesson your Mentor chooses",
    reviewRecommendation: "Review the core idea once more before moving forward.",
  };
}

const completionLabels: Record<LearningActivityType, string> = {
  Lesson: "Let's see what you've learned",
  Practice: "Practice with support",
  Quiz: "Show what you remember",
  "AI Tutor Challenge": "Work with the Tutor",
  Reflection: "Save reflection",
};

const lessonCompletionCriteria: LessonCompletionCriterion[] = [
  {
    id: "phases-reviewed",
    label: "Spend time with each teaching step.",
    required: true,
  },
  {
    id: "guided-practice-attempted",
    label: "Try each practice step before saving the lesson.",
    required: true,
  },
  {
    id: "quiz-answered",
    label: "Answer each check-in question before saving the lesson.",
    required: true,
  },
  {
    id: "reflection-captured",
    label: "Write one reflection so your Mentor knows what changed.",
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
    label: "Check-in signal",
    weight: 0.45,
    description:
      "Check-in answers are a recall signal only; they do not prove durable mastery by themselves.",
  },
  {
    id: "guided-practice",
    label: "Practice signal",
    weight: 0.2,
    description:
      "Practice shows supported skill use and should be reviewed with hints and attempts.",
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
      "Teaching steps show lesson engagement, not independent mastery.",
  },
];

const masteryAssumptions = [
  "Mastery is a conservative readiness estimate, not an accredited assessment.",
  "Knowledge checks happen naturally during lessons; formal assessments are reserved for major milestones and course completion.",
  "A low estimate should recommend review without shame or penalty language.",
  "A high estimate means ready for the next lesson, not guaranteed long-term retention.",
  "Missing check-in, practice, reflection, or confidence evidence lowers certainty.",
];

export function buildLessonEngineDefinition(
  activity: Pick<LearningActivityRunnerRow, "activity_type" | "title" | "difficulty">
): LessonEngineDefinition {
  const activityType = normalizeLearningActivityType(activity.activity_type);
  const lesson =
    resolveLearningContentRecordForActivityTitle(activity.title)?.lesson ||
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
    (question) =>
      validateAnswer({
        learnerAnswer: quizAnswers[question.id] || "",
        expectedAnswer: question.answer,
        acceptedAnswers: question.acceptedAnswers,
        rules: question.validationRules,
      }).correct
  ).length;
  const total = questions.length;

  return {
    correct,
    total,
    percent: total === 0 ? 100 : Math.round((correct / total) * 100),
  };
}

export function isPracticeAnswerCorrect(
  practice: AdaptivePracticeStep,
  answer: string
) {
  return validateAnswer({
    learnerAnswer: answer,
    expectedAnswer: practice.expectedAnswer,
    acceptedAnswers: practice.acceptedAnswers,
    rules: practice.validationRules,
  }).correct;
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
  const firstPracticePrompt = lesson.guidedPractice[0]?.prompt || "one small practice step";
  const mistakePrompt =
    lesson.aiCoachingPrompts.find((prompt) => prompt.kind === "mistake")?.prompt ||
    lesson.quizQuestions[0]?.explanation ||
    lesson.explanation;
  const alternatePrompt =
    lesson.aiCoachingPrompts.find((prompt) => prompt.kind === "alternate")?.prompt ||
    lesson.explanation;

  if (!question.trim()) {
    return `Tell me where you want to start with ${lesson.title}. We can try an example, slow down, or do one small practice together.`;
  }

  if (/why|mistake|wrong|confus/.test(lowerQuestion)) {
    return `Close. This one trips up almost everyone at first. ${mistakePrompt} Let's try another way: imagine sorting apps on your phone before you move anything around. Put the matching pieces together first, then do the math.`;
  }

  if (/next|master|review/.test(lowerQuestion)) {
    return masteryEstimate >= lesson.masteryThreshold && quizPercent >= 70
      ? `Nice. You are ready for ${lesson.recommendedNextLesson}. Convince me with one quick example, then we can move on.`
      : `Close. ${lesson.reviewRecommendation} Let's do one careful example first, then try another check-in.`;
  }

  if (/hint|help|practice/.test(lowerQuestion)) {
    const hint = lesson.guidedPractice[0]?.hint || alternatePrompt;
    return `Don't worry about the formula yet. ${hint} Try it on ${firstPracticePrompt}, and walk me through what you're thinking.`;
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
    return `Nice work. You can explain this well enough to move on to ${lesson.recommendedNextLesson}.`;
  }

  if (recommendedReview) {
    return `${lesson.reviewRecommendation} You remembered ${quizPercent}% on the check-in, so let's tighten this up with one more clear example before adding something new.`;
  }

  return "You are close. Say the idea back in your own words, then we will decide the next step together.";
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
  const tutorReadinessDecision = decideTutorLessonReadiness({
    masteryEstimate,
    masteryThreshold: lesson.masteryThreshold,
    tutorReason: mastered
      ? `The Tutor has enough lesson evidence to continue toward ${lesson.recommendedNextLesson}.`
      : `${lesson.reviewRecommendation} The Tutor should remediate before continuing.`,
  });
  const completionReviewReasons = [
    ...(completedPhases === phaseCount ? [] : ["Spend time with each teaching step."]),
    ...(practice.answered === lesson.guidedPractice.length
      ? []
      : ["Try each practice step."]),
    ...(answeredQuizQuestions === lesson.quizQuestions.length
      ? []
      : ["Answer each check-in question."]),
    ...(reflectionComplete ? [] : ["Write one reflection."]),
    ...(mastered || !recommendedReview
      ? []
      : ["A careful review will help before the next lesson."]),
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
    tutorReadinessDecision,
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
