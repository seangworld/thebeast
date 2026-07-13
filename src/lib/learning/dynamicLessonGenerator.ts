import {
  buildGeneratedContentProvenance,
  createGeneratedCurriculumLifecycleRecord,
  generatedContentCanBecomeProductionCurriculum,
  getCourseAuthorityMapping,
  getCourseCurriculumLifecycle,
  getCurriculumAuthoritySource,
  getObjectivesForCourse,
} from "./curriculumAuthority";
import { createLearningContentMetadata } from "./contentVersioning";
import type { AdaptiveLesson } from "./lessonEngine";
import type { LearningDifficulty } from "./types";

export type DynamicLessonMode =
  | "lesson"
  | "remediation"
  | "review"
  | "challenge";

export type DynamicLessonGenerationInput = {
  goal: string;
  courseId: string;
  courseTitle: string;
  learnerLevel: LearningDifficulty | "Brand new" | "Beginner" | "Intermediate" | "Advanced";
  mode?: DynamicLessonMode;
  targetObjectiveId?: string;
  weakConcept?: string;
};

export type DynamicLessonAlignment = {
  courseId: string;
  authorityMappingId?: string;
  authorityTitle: string;
  objectiveIds: string[];
  standardLabels: string[];
  aligned: boolean;
  productionEligible: boolean;
  boundary: string;
};

export type DynamicLessonGenerationResult = {
  lesson: AdaptiveLesson;
  alignment: DynamicLessonAlignment;
  lifecycleState: string;
  generationPolicy: "curriculum-aligned" | "diagnostic-starter";
};

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeLevel(value: DynamicLessonGenerationInput["learnerLevel"]) {
  const normalized = String(value).toLowerCase();
  if (normalized.includes("advanced")) return "challenge";
  if (normalized.includes("intermediate")) return "developing";
  return "introductory";
}

function modeLabel(mode: DynamicLessonMode) {
  if (mode === "remediation") return "Remediation";
  if (mode === "review") return "Review";
  if (mode === "challenge") return "Challenge";
  return "Lesson";
}

function modeInstruction(mode: DynamicLessonMode, focus: string) {
  if (mode === "remediation") {
    return `Let's slow down and rebuild ${focus} from a smaller step.`;
  }
  if (mode === "review") {
    return `Let's warm up ${focus} before we add anything new.`;
  }
  if (mode === "challenge") {
    return `You are ready for a harder ${focus} question.`;
  }
  return `Today we will learn the next useful step in ${focus}.`;
}

function buildSubjectQuestion(focus: string, difficulty: "introductory" | "developing" | "challenge") {
  if (difficulty === "challenge") {
    return `Use ${focus} in a new situation. Write your answer, then explain the move that mattered most.`;
  }
  if (difficulty === "developing") {
    return `Try a second ${focus} question on your own. Show the step that helped you decide.`;
  }
  return `Try one clear ${focus} question. Start with the example, then write your answer.`;
}

function metadata(id: string, label: string) {
  return createLearningContentMetadata({
    sourceKind: "generated",
    sourceId: id,
    sourceLabel: label,
    authoredBy: "ai-coach",
  });
}

export function generateDynamicLearningLesson({
  goal,
  courseId,
  courseTitle,
  learnerLevel,
  mode = "lesson",
  targetObjectiveId,
  weakConcept,
}: DynamicLessonGenerationInput): DynamicLessonGenerationResult {
  const resolvedGoal = goal.trim() || courseTitle || "Learning goal";
  const lessonSlug = slugify(`${courseId}-${resolvedGoal}-${mode}`) || "dynamic-lesson";
  const lessonId = `dynamic-${lessonSlug}`;
  const mapping = getCourseAuthorityMapping(courseId);
  const source = mapping ? getCurriculumAuthoritySource(mapping.authoritySourceId) : undefined;
  const objectives = getObjectivesForCourse(courseId);
  const targetObjective =
    objectives.find((objective) => objective.id === targetObjectiveId) || objectives[0];
  const focus = weakConcept || targetObjective?.title || resolvedGoal;
  const selectedObjectiveIds = targetObjective ? [targetObjective.id] : [];
  const provenance = buildGeneratedContentProvenance({
    contentId: lessonId,
    courseId,
    authorityMappingId: mapping?.id,
    reviewStatus: "requires-review",
  });
  const lifecycle =
    getCourseCurriculumLifecycle(courseId) ||
    createGeneratedCurriculumLifecycleRecord({ courseId });
  const aligned = selectedObjectiveIds.length > 0 && Boolean(mapping);
  const productionEligible = generatedContentCanBecomeProductionCurriculum(provenance);
  const authorityTitle = source?.title || mapping?.publisher || "learning goal";
  const difficulty = normalizeLevel(learnerLevel);
  const title = `${modeLabel(mode)}: ${focus}`;
  const boundary = aligned
    ? `Aligned to ${authorityTitle} objective ${selectedObjectiveIds.join(", ")}.`
    : "Treat this as placement from the learner goal; it must not claim official curriculum coverage until authority mapping exists.";
  const learnerBoundary = aligned
    ? `We will stay focused on ${focus}.`
    : "Let's start with a quick, low-pressure question so I know where to begin.";
  const independentDifficulty = mode === "challenge" ? "challenge" : "developing";

  return {
    alignment: {
      courseId,
      authorityMappingId: mapping?.id,
      authorityTitle,
      objectiveIds: selectedObjectiveIds,
      standardLabels: targetObjective ? [targetObjective.title] : [],
      aligned,
      productionEligible,
      boundary,
    },
    lifecycleState: lifecycle.state,
    generationPolicy: aligned ? "curriculum-aligned" : "diagnostic-starter",
    lesson: {
      id: lessonId,
      templateId: `dynamic-${mode}-template`,
      title,
      subject: courseTitle || resolvedGoal,
      contentMetadata: metadata(lessonId, title),
      scopeId: courseId,
      objectiveIds: selectedObjectiveIds,
      prerequisiteIds: [],
      learningObjective: aligned
        ? `${modeInstruction(mode, focus)}`
        : `${modeInstruction(mode, focus)} We will begin with one real question and build from there.`,
      prerequisiteConcepts: aligned
        ? [
            `Understand the basic idea behind ${focus}.`,
            "Follow one worked example before practicing.",
            "Explain the thinking before moving on.",
          ]
        : [
            `Start with a beginner-friendly ${focus} question.`,
            "Use one worked example.",
            "Name the part that feels unclear.",
          ],
      explanation: `Introduction: ${modeInstruction(mode, focus)} ${learnerBoundary} First, watch one worked example. Then you will try a supported question, an independent question, a quick checkpoint, a wrap-up, and a next step.`,
      interactiveVisual: {
        title: "Lesson path",
        prompt: `Move from the worked example to guided practice, then try ${focus} on your own.`,
        expression: "Intro -> Example -> Practice -> Checkpoint -> Next",
        terms: [
          { id: "dynamic-intro", label: "Intro", coefficient: 1, variable: "", group: "other", color: "blue" },
          { id: "dynamic-example", label: "Worked example", coefficient: 1, variable: "", group: "other", color: "green" },
          { id: "dynamic-practice", label: "Practice", coefficient: 1, variable: "", group: "other", color: "yellow" },
        ],
        targetGroups: [
          {
            group: "other",
            label: "Lesson steps",
            combinedLabel: "Example -> Practice -> Checkpoint",
            explanation: "Each step gets a little harder so you can build confidence before moving on.",
          },
        ],
      },
      examples: [
        {
          title: "Worked example",
          setup: focus,
          steps: [
            `Start with a familiar situation connected to ${focus}.`,
            "Show the first move before naming the rule.",
            "Explain why that move works.",
            "Try the same move on a new question.",
          ],
          takeaway: `A strong ${focus} answer shows both the answer and how you got there.`,
        },
      ],
      guidedPractice: [
        {
          id: `${lessonId}-practice`,
          practiceTemplateId: "supported-recall",
          difficulty,
          format: "worked-step",
          prompt: `Guided practice: ${buildSubjectQuestion(focus, difficulty)}`,
          hint: `Start with the example, like matching the next move in a game, and keep your answer tied to ${focus}.`,
          expectedAnswer: focus,
          acceptedAnswers: [focus.toLowerCase(), resolvedGoal.toLowerCase()],
        },
        {
          id: `${lessonId}-independent-practice`,
          practiceTemplateId:
            mode === "challenge" ? "independent-challenge" : "supported-recall",
          difficulty: independentDifficulty,
          format: mode === "challenge" ? "scenario" : "short-response",
          prompt: `Independent practice: ${buildSubjectQuestion(focus, independentDifficulty)}`,
          hint: "Use the same pattern from the worked example, but make the decision yourself.",
          expectedAnswer: focus,
          acceptedAnswers: [focus.toLowerCase(), resolvedGoal.toLowerCase()],
        },
      ],
      quizQuestions: [
        {
          id: `${lessonId}-quiz`,
          questionTypeId: "written-response",
          contentMetadata: metadata(`${lessonId}-quiz`, `${title} check`),
          prompt: `Checkpoint: answer one ${focus} question, then explain how you solved it.`,
          options: aligned
            ? [focus, `A partly finished ${focus} answer`, `A ${focus} answer with no explanation`]
            : [resolvedGoal, `A partly finished ${resolvedGoal} answer`, `A ${resolvedGoal} answer with no explanation`],
          answer: aligned ? focus : resolvedGoal,
          acceptedAnswers: aligned ? [focus.toLowerCase()] : [resolvedGoal.toLowerCase()],
          explanation: `A strong checkpoint answer for ${focus} includes the answer and the thinking behind it.`,
        },
      ],
      aiCoachingPrompts: [
        {
          kind: "mistake",
          title: "Remediate",
          prompt: `Close. Let's make ${focus} smaller and try it another way.`,
        },
        {
          kind: "alternate",
          title: "Another example",
          prompt: `Give a different everyday example that stays inside ${focus}.`,
        },
        {
          kind: "review",
          title: "Review",
          prompt: `Check whether ${focus} should be reviewed before moving on.`,
        },
        {
          kind: "mastery",
          title: "Challenge",
          prompt: `Nice. Try one challenge question for ${focus}.`,
        },
        {
          kind: "encouragement",
          title: "Continue",
          prompt: "You're building it. Here is the next step I recommend.",
        },
      ],
      reflectionPrompts: [
        `Wrap-up: what part of ${focus} felt clear after the practice?`,
        `Next step: what should we review or try next in ${focus}?`,
      ],
      masteryThreshold: mode === "challenge" ? 85 : 80,
      recommendedNextLesson:
        mode === "challenge"
          ? `Advance after ${focus}`
          : `Continue with ${focus}`,
      reviewRecommendation:
        mode === "remediation" || mode === "review"
          ? `Review ${focus} again before adding new material.`
          : `Try one more ${focus} checkpoint, then decide whether to review or move ahead.`,
    },
  };
}
