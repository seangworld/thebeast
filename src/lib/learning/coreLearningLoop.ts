import {
  buildLessonEngineDefinition,
  getLessonEngineProgress,
  getLessonTeacherResponse,
  isPracticeAnswerCorrect,
  type AdaptiveLesson,
  type LessonEngineProgress,
  type LessonEnginePhaseKind,
} from "./lessonEngine";
import {
  resolveLearningContentRecordForSubject,
} from "./sampleContentRegistry";
import { validateAnswer } from "./answerValidation";

export type CoreLearnerProfileInput = {
  preferredName: string;
  age: number;
  gradeLevel: string;
  subject: string;
  goals: string[];
  interests: string[];
  learningPreferences: string[];
};

export type CoreLearnerProfile = CoreLearnerProfileInput & {
  id: string;
  ageBand: "child" | "teen" | "adult";
  safetyLevel: "student" | "adult-learner";
  recommendedSessionMinutes: number;
};

export type PlacementQuestion = {
  id: string;
  conceptId: string;
  prompt: string;
  expectedAnswer: string;
  acceptedAnswers: string[];
};

export type PlacementResponse = {
  questionId: string;
  answer: string;
};

export type PlacementResult = {
  subject: string;
  scorePercent: number;
  correctConceptIds: string[];
  gapConceptIds: string[];
  readinessLevel: "start-here" | "guided-review" | "ready-for-lesson";
  explanation: string;
};

export type CoreLearningPathStep = {
  id: string;
  conceptId: string;
  title: string;
  kind: "diagnostic" | "lesson" | "guided-practice" | "mastery-check" | "remediation" | "next-concept";
  status: "ready" | "blocked" | "complete";
  dependsOn: string[];
  reason: string;
};

export type CoreLearningPath = {
  id: string;
  learnerId: string;
  subject: string;
  currentConceptId: string;
  steps: CoreLearningPathStep[];
  progressReport: {
    completionPercent: number;
    masteryPercent: number;
    distinction: string;
  };
};

export type TutorTurnIntent =
  | "teach"
  | "evaluate-response"
  | "hint"
  | "alternate-explanation"
  | "mastery-check"
  | "remediation"
  | "resume";

export type TutorTurn = {
  intent: TutorTurnIntent;
  prompt: string;
  waitsForLearner: boolean;
  ageAppropriate: boolean;
  revealsAnswer: boolean;
  feedback?: "correct" | "incorrect" | "not-answered";
  nextAction: string;
};

export type CoreLessonSession = {
  id: string;
  learnerId: string;
  pathId: string;
  lesson: AdaptiveLesson;
  currentPhase: LessonEnginePhaseKind;
  completedPhases: LessonEnginePhaseKind[];
  tutorTurns: TutorTurn[];
  progress: LessonEngineProgress;
  resumeState: {
    resumable: boolean;
    resumeAtPhase: LessonEnginePhaseKind;
    summary: string;
  };
};

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function checkedPhases(phases: LessonEnginePhaseKind[]) {
  return Object.fromEntries(phases.map((phase) => [phase, true]));
}

export function buildCoreLearnerProfile(input: CoreLearnerProfileInput): CoreLearnerProfile {
  const ageBand = input.age < 13 ? "child" : input.age < 18 ? "teen" : "adult";

  return {
    ...input,
    id: `learner-${slugify(input.preferredName || "beastlearning")}`,
    ageBand,
    safetyLevel: ageBand === "adult" ? "adult-learner" : "student",
    recommendedSessionMinutes: ageBand === "child" ? 15 : ageBand === "teen" ? 25 : 30,
  };
}

function getContentRecordForSubject(subject: string) {
  return resolveLearningContentRecordForSubject(subject);
}

export function getCorePlacementQuestions(
  subject = "Learning Path"
) {
  return getContentRecordForSubject(subject).placementQuestions;
}

export function scorePlacementAssessment({
  subject = "Learning Path",
  responses,
}: {
  subject?: string;
  responses: PlacementResponse[];
}): PlacementResult {
  const questions = getCorePlacementQuestions(subject);
  const responseByQuestion = new Map(
    responses.map((response) => [response.questionId, response.answer])
  );
  const correctConceptIds = questions
    .filter((question) =>
      validateAnswer({
        learnerAnswer: responseByQuestion.get(question.id) || "",
        expectedAnswer: question.expectedAnswer,
        acceptedAnswers: question.acceptedAnswers,
      }).correct
    )
    .map((question) => question.conceptId);
  const gapConceptIds = questions
    .filter((question) => !correctConceptIds.includes(question.conceptId))
    .map((question) => question.conceptId);
  const scorePercent = Math.round((correctConceptIds.length / questions.length) * 100);
  const readinessLevel =
    scorePercent >= 100 ? "ready-for-lesson" : scorePercent >= 67 ? "guided-review" : "start-here";

  return {
    subject,
    scorePercent,
    correctConceptIds,
    gapConceptIds,
    readinessLevel,
    explanation:
      gapConceptIds.length === 0
        ? "Placement shows readiness for the first full lesson."
        : `Placement found review needs in ${gapConceptIds.join(", ")} before independent mastery.`,
  };
}

export function generateCoreLearningPath({
  learner,
  placement,
}: {
  learner: CoreLearnerProfile;
  placement: PlacementResult;
}): CoreLearningPath {
  const contentRecord = getContentRecordForSubject(placement.subject);
  const lesson = contentRecord.lesson;
  const needsRemediation = placement.gapConceptIds.length > 0;
  const lessonDependency = needsRemediation ? ["remediate-placement-gaps"] : ["placement"];
  const lessonStepId = `${lesson.id}-lesson`;
  const practiceStepId = `${lesson.id}-guided-practice`;
  const masteryStepId = `${lesson.id}-mastery-check`;
  const steps: CoreLearningPathStep[] = [
    {
      id: "placement",
      conceptId: "placement",
      title: "Placement assessment",
      kind: "diagnostic",
      status: "complete",
      dependsOn: [],
      reason: placement.explanation,
    },
    {
      id: "remediate-placement-gaps",
      conceptId: placement.gapConceptIds[0] || lesson.prerequisiteIds?.[0] || lesson.id,
      title: "Review prerequisite gaps",
      kind: "remediation",
      status: needsRemediation ? "ready" : "complete",
      dependsOn: ["placement"],
      reason: needsRemediation
        ? "The learner needs a short review before the teachable lesson."
        : "No prerequisite remediation required.",
    },
    {
      id: lessonStepId,
      conceptId: lesson.objectiveIds?.[0] || lesson.id,
      title: lesson.title,
      kind: "lesson",
      status: needsRemediation ? "blocked" : "ready",
      dependsOn: lessonDependency,
      reason: needsRemediation
        ? "Lesson unlocks after prerequisite review."
        : "Placement supports starting the teachable lesson.",
    },
    {
      id: practiceStepId,
      conceptId: lesson.objectiveIds?.[0] || lesson.id,
      title: "Guided practice",
      kind: "guided-practice",
      status: "blocked",
      dependsOn: [lessonStepId],
      reason: "Practice follows instruction and examples.",
    },
    {
      id: masteryStepId,
      conceptId: lesson.objectiveIds?.[0] || lesson.id,
      title: "Mastery check",
      kind: "mastery-check",
      status: "blocked",
      dependsOn: [practiceStepId],
      reason: "Mastery check requires practice evidence.",
    },
    {
      id: slugify(lesson.recommendedNextLesson),
      conceptId: slugify(lesson.recommendedNextLesson),
      title: lesson.recommendedNextLesson,
      kind: "next-concept",
      status: "blocked",
      dependsOn: [masteryStepId],
      reason: "Advancement requires mastery evidence, not just completion.",
    },
  ];

  return {
    id: `${learner.id}-${slugify(contentRecord.subject)}-core-path`,
    learnerId: learner.id,
    subject: placement.subject,
    currentConceptId: needsRemediation
      ? placement.gapConceptIds[0]
      : lesson.objectiveIds?.[0] || lesson.id,
    steps,
    progressReport: {
      completionPercent: 10,
      masteryPercent: placement.scorePercent,
      distinction:
        "Completion tracks finished steps; mastery tracks evidence from placement, practice, quiz, confidence, and review.",
    },
  };
}

export function startCoreLessonSession({
  learner,
  path,
}: {
  learner: CoreLearnerProfile;
  path: CoreLearningPath;
}): CoreLessonSession {
  const contentRecord = getContentRecordForSubject(path.subject);
  const engine = buildLessonEngineDefinition({
    activity_type: "Lesson",
    title: contentRecord.activityTitle,
    difficulty: "Beginner",
  });
  const completedPhases: LessonEnginePhaseKind[] = ["assessment", "lesson"];
  const progress = getLessonEngineProgress({
    lesson: engine.lesson,
    checkedPhases: checkedPhases(completedPhases),
    phaseCount: engine.phases.length,
    reflection: "",
    confidence: "Still building",
    practiceAnswers: {},
    quizAnswers: {},
  });

  return {
    id: `${path.id}-${slugify(engine.lesson.id)}-session`,
    learnerId: learner.id,
    pathId: path.id,
    lesson: engine.lesson,
    currentPhase: "practice",
    completedPhases,
    tutorTurns: [
      {
        intent: "teach",
        prompt: engine.lesson.explanation,
        waitsForLearner: true,
        ageAppropriate: true,
        revealsAnswer: false,
        feedback: "not-answered",
        nextAction: `Ask the learner to try ${engine.lesson.guidedPractice[0]?.prompt || "the first guided step"}.`,
      },
    ],
    progress,
    resumeState: {
      resumable: true,
      resumeAtPhase: "practice",
      summary: "Resume at guided practice after the learner has reviewed the explanation.",
    },
  };
}

export function buildTutorResponseTurn({
  session,
  learnerAnswer,
}: {
  session: CoreLessonSession;
  learnerAnswer: string;
}): TutorTurn {
  const firstPractice = session.lesson.guidedPractice[0];
  const correct = isPracticeAnswerCorrect(firstPractice, learnerAnswer);

  return {
    intent: "evaluate-response",
    prompt: correct
      ? "Correct. That matches the expected guided-practice answer."
      : `Not yet. ${firstPractice.hint}`,
    waitsForLearner: true,
    ageAppropriate: true,
    revealsAnswer: correct,
    feedback: correct ? "correct" : "incorrect",
    nextAction: correct ? "Continue to the next guided example." : "Offer a hint before another attempt.",
  };
}

export function buildHintTurn(session: CoreLessonSession): TutorTurn {
  return {
    intent: "hint",
    prompt: session.lesson.guidedPractice[0].hint,
    waitsForLearner: true,
    ageAppropriate: true,
    revealsAnswer: false,
    feedback: "not-answered",
    nextAction: "Ask the learner to try again after the hint.",
  };
}

export function buildAlternativeExplanationTurn(session: CoreLessonSession): TutorTurn {
  const alternatePrompt =
    session.lesson.aiCoachingPrompts.find((prompt) => prompt.kind === "alternate")
      ?.prompt || session.lesson.explanation;

  return {
    intent: "alternate-explanation",
    prompt: alternatePrompt,
    waitsForLearner: true,
    ageAppropriate: true,
    revealsAnswer: false,
    feedback: "not-answered",
    nextAction: `Return to ${session.lesson.title} guided practice.`,
  };
}

export function completeCoreLessonMasteryCheck({
  session,
  practiceAnswers,
  quizAnswers,
  confidenceLabel = "Ready for more",
}: {
  session: CoreLessonSession;
  practiceAnswers: Record<string, string>;
  quizAnswers: Record<string, string>;
  confidenceLabel?: string;
}) {
  const progress = getLessonEngineProgress({
    lesson: session.lesson,
    checkedPhases: checkedPhases([
      "assessment",
      "lesson",
      "practice",
      "quiz",
      "coach",
      "reflection",
      "mastery",
      "recommendation",
    ]),
    phaseCount: 8,
    reflection:
      session.lesson.reflectionPrompts[0] ||
      "I can explain what changed and what to review next.",
    confidence: confidenceLabel,
    practiceAnswers,
    quizAnswers,
  });

  return {
    progress,
    tutorTurn: {
      intent: progress.mastered ? "mastery-check" : "remediation",
      prompt: getLessonTeacherResponse({
        lesson: session.lesson,
        question: progress.mastered ? "What should I do next after mastery?" : "What should I review next?",
        quizPercent: progress.quizPercent,
        masteryEstimate: progress.masteryEstimate,
      }),
      waitsForLearner: false,
      ageAppropriate: true,
      revealsAnswer: false,
      feedback: progress.mastered ? "correct" : "incorrect",
      nextAction: progress.mastered ? session.lesson.recommendedNextLesson : session.lesson.reviewRecommendation,
    } satisfies TutorTurn,
  };
}
