import {
  normalizeLearningActivityType,
  type LearningActivityRunnerRow,
  type LearningActivityType,
} from "./activityRunner";

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

export type AdaptiveLesson = {
  id: string;
  title: string;
  subject: string;
  learningObjective: string;
  prerequisiteConcepts: string[];
  explanation: string;
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
  completionLabel: string;
};

export type LessonEngineProgress = {
  completedPhases: number;
  completedSteps: number;
  requiredSteps: number;
  quizCorrect: number;
  quizTotal: number;
  quizPercent: number;
  confidenceScore: number;
  masteryEstimate: number;
  mastered: boolean;
  recommendedReview: boolean;
  readyToComplete: boolean;
  percent: number;
  nextRecommendation: string;
  coachingMessage: string;
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
  learningObjective:
    "Combine terms that have the same variable part so an expression is easier to read and solve.",
  prerequisiteConcepts: [
    "Know that a coefficient is the number in front of a variable.",
    "Recognize that x, y, and plain numbers are different kinds of terms.",
    "Add and subtract integers with confidence.",
  ],
  explanation:
    "Like terms have the same variable part. The term 3x can combine with 5x because both are x terms. The term 3x cannot combine with 5 because one has x and one is just a number. When terms are alike, keep the variable part and add or subtract the coefficients.",
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
    },
    {
      id: "practice-combine-groups",
      prompt: "Combine: 5x + 4 + x + 6",
      hint: "Group the x terms together, then group the plain numbers.",
      expectedAnswer: "6x + 10",
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
    return `${lesson.reviewRecommendation} Your quiz score was ${quizPercent}%, so Beast recommends one review pass before the next lesson.`;
  }

  return "You are close. Review the coaching notes, then finish with a reflection before moving forward.";
}

export function getLessonEngineProgress({
  checkedPhases,
  phaseCount,
  reflection,
  confidence,
  quizAnswers,
  lesson,
}: {
  checkedPhases: Record<string, boolean>;
  phaseCount: number;
  reflection: string;
  confidence: string;
  quizAnswers: Record<string, string>;
  lesson: AdaptiveLesson;
}): LessonEngineProgress {
  const completedPhases = Object.values(checkedPhases).filter(Boolean).length;
  const reflectionComplete = reflection.trim().length > 0;
  const quiz = getQuizScore({ questions: lesson.quizQuestions, quizAnswers });
  const confidenceScore = confidenceScores[confidence] || 60;
  const phasePercent = phaseCount === 0 ? 0 : Math.round((completedPhases / phaseCount) * 100);
  const masteryEstimate = Math.round(
    quiz.percent * 0.55 + confidenceScore * 0.25 + phasePercent * 0.2
  );
  const answeredQuizQuestions = lesson.quizQuestions.filter(
    (question) => Boolean(quizAnswers[question.id])
  ).length;
  const requiredSteps = phaseCount + lesson.quizQuestions.length + 1;
  const completedSteps =
    completedPhases +
    answeredQuizQuestions +
    (reflectionComplete ? 1 : 0);
  const mastered = masteryEstimate >= lesson.masteryThreshold && quiz.percent >= 70;
  const recommendedReview = !mastered && (quiz.percent < 70 || confidenceScore < 70);

  return {
    completedPhases,
    completedSteps,
    requiredSteps,
    quizCorrect: quiz.correct,
    quizTotal: quiz.total,
    quizPercent: quiz.percent,
    confidenceScore,
    masteryEstimate,
    mastered,
    recommendedReview,
    readyToComplete:
      completedPhases === phaseCount &&
      reflectionComplete &&
      answeredQuizQuestions === lesson.quizQuestions.length,
    percent:
      requiredSteps === 0
        ? 0
        : Math.min(100, Math.round((completedSteps / requiredSteps) * 100)),
    nextRecommendation: mastered
      ? lesson.recommendedNextLesson
      : lesson.reviewRecommendation,
    coachingMessage: buildCoachMessage({
      mastered,
      recommendedReview,
      quizPercent: quiz.percent,
      lesson,
    }),
  };
}
