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
    return `Slow down and repair the prerequisite or misconception around ${focus}.`;
  }
  if (mode === "review") {
    return `Check retention and rebuild recall for ${focus} before adding new material.`;
  }
  if (mode === "challenge") {
    return `Use a harder applied question for ${focus} because the learner appears ready.`;
  }
  return `Teach the next focused step for ${focus}.`;
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
    ? `Generated from mapped ${authorityTitle} objective ${selectedObjectiveIds.join(", ")}.`
    : "Treat this as placement. Generated as a diagnostic starter from the learner goal; it must not claim official curriculum coverage until authority mapping exists.";
  const learnerBoundary = aligned
    ? `We will stay focused on ${focus}.`
    : "Let's start with a quick, low-pressure question so I know where to begin.";

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
        ? `${modeInstruction(mode, focus)} Keep the teaching focused and concrete.`
        : `${modeInstruction(mode, focus)} Begin with a natural warm-up question.`,
      prerequisiteConcepts: aligned
        ? [
            `Focus on ${focus}.`,
            "Use one clear example.",
            "Listen for the learner's thinking before moving on.",
          ]
        : ["Start with the subject", "Ask one natural question", "Listen for what feels unclear"],
      explanation: `${modeInstruction(mode, focus)} ${learnerBoundary}`,
      interactiveVisual: {
        title: "Try it together",
        prompt: `Use the example, then try one small step with ${focus}.`,
        expression: "Example + Practice + Next Step",
        terms: [
          { id: "dynamic-target", label: "Target", coefficient: 1, variable: "", group: "other", color: "blue" },
          { id: "dynamic-example", label: "Example", coefficient: 1, variable: "", group: "other", color: "green" },
          { id: "dynamic-practice", label: "Practice", coefficient: 1, variable: "", group: "other", color: "yellow" },
        ],
        targetGroups: [
          {
            group: "other",
            label: "Learning pieces",
            combinedLabel: "Example + Practice + Next Step",
            explanation: "Your answer helps your Mentor decide whether to review, try another example, or move ahead.",
          },
        ],
      },
      examples: [
        {
          title: `${modeLabel(mode)} example`,
          setup: focus,
          steps: [
            `Start with a familiar example for ${focus}.`,
            "Use a daily-life comparison before naming the rule.",
            "Ask the learner to explain the step in their own words.",
          ],
          takeaway: aligned
            ? "A clear example makes the next step easier to try."
            : "This warm-up helps your Mentor choose the right starting point.",
        },
      ],
      guidedPractice: [
        {
          id: `${lessonId}-practice`,
          practiceTemplateId:
            mode === "challenge" ? "independent-challenge" : "supported-recall",
          difficulty: mode === "challenge" ? "challenge" : difficulty,
          format: mode === "challenge" ? "scenario" : "short-response",
          prompt: `Try one ${mode === "challenge" ? "applied" : "focused"} practice step for ${focus}.`,
          hint: `Start with the example, like matching the next move in a game, and keep your answer tied to ${focus}.`,
          expectedAnswer: focus,
          acceptedAnswers: [focus.toLowerCase(), resolvedGoal.toLowerCase()],
        },
        {
          id: `${lessonId}-remediation`,
          practiceTemplateId: "conversation-turn",
          difficulty: "introductory",
          format: "conversation",
          prompt: `If this felt hard, name the smallest part of ${focus} that tripped you up.`,
          hint: "It is okay to name the part that feels confusing.",
          expectedAnswer: "A specific blocker",
          acceptedAnswers: ["blocker", "unclear", "review"],
        },
      ],
      quizQuestions: [
        {
          id: `${lessonId}-quiz`,
          questionTypeId: "multiple-choice",
          contentMetadata: metadata(`${lessonId}-quiz`, `${title} check`),
          prompt: aligned
            ? `Which idea are we practicing right now?`
            : `Let's start simply. Which answer best matches what you want to practice?`,
          options: aligned
            ? [focus, "Something unrelated", "A progress chart"]
            : [resolvedGoal, "A finished exam", "A certificate"],
          answer: aligned ? focus : resolvedGoal,
          acceptedAnswers: aligned ? [focus.toLowerCase()] : [resolvedGoal.toLowerCase()],
          explanation: aligned
            ? `We are practicing ${focus}, so the next question should stay there.`
            : "This first question helps your Mentor choose the right starting point.",
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
        `What part of ${focus} felt clear?`,
        `What should your Mentor review or challenge next?`,
      ],
      masteryThreshold: mode === "challenge" ? 85 : 80,
      recommendedNextLesson:
        mode === "challenge"
          ? `Advance after ${focus}`
          : `Continue with ${focus}`,
      reviewRecommendation:
        mode === "remediation" || mode === "review"
          ? `Review ${focus} again before adding new material.`
          : `Use evidence from ${focus} to decide whether to review, remediate, or advance.`,
    },
  };
}
