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
  const authorityTitle = source?.title || mapping?.publisher || "Learner goal starter";
  const difficulty = normalizeLevel(learnerLevel);
  const title = `${modeLabel(mode)}: ${focus}`;
  const boundary = aligned
    ? `Generated from mapped ${authorityTitle} objective ${selectedObjectiveIds.join(", ")}.`
    : "Treat this as placement. Generated as a diagnostic starter from the learner goal; it must not claim official curriculum coverage until authority mapping exists.";

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
        ? `${modeInstruction(mode, focus)} Stay inside ${authorityTitle}.`
        : `${modeInstruction(mode, focus)} Treat this as placement until curriculum authority is mapped.`,
      prerequisiteConcepts: aligned
        ? [
            `Stay inside ${authorityTitle}.`,
            `Use objective ${selectedObjectiveIds[0]}.`,
            "Check learner evidence before moving on.",
          ]
        : ["State the goal", "Name what feels familiar", "Name what feels unclear"],
      explanation: `${modeInstruction(mode, focus)} ${boundary}`,
      interactiveVisual: {
        title: "Dynamic learning loop",
        prompt: "Connect the target, example, practice, and evidence before deciding what comes next.",
        expression: "Target + Example + Practice + Evidence",
        terms: [
          { id: "dynamic-target", label: "Target", coefficient: 1, variable: "", group: "other", color: "blue" },
          { id: "dynamic-example", label: "Example", coefficient: 1, variable: "", group: "other", color: "green" },
          { id: "dynamic-practice", label: "Practice", coefficient: 1, variable: "", group: "other", color: "yellow" },
        ],
        targetGroups: [
          {
            group: "other",
            label: "Lesson evidence",
            combinedLabel: "Target + Practice + Evidence",
            explanation: "The Mentor uses the learner response to decide whether to review, remediate, continue, or advance.",
          },
        ],
      },
      examples: [
        {
          title: `${modeLabel(mode)} example`,
          setup: focus,
          steps: [
            `Start from the mapped target: ${focus}.`,
            "Show one concrete example before asking for recall.",
            "Ask the learner to explain the step in their own words.",
          ],
          takeaway: aligned
            ? "The example stays inside the mapped curriculum objective."
            : "The example is diagnostic and should not be treated as official curriculum.",
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
          hint: `Use the example and keep your answer tied to ${focus}.`,
          expectedAnswer: focus,
          acceptedAnswers: [focus.toLowerCase(), resolvedGoal.toLowerCase()],
        },
        {
          id: `${lessonId}-remediation`,
          practiceTemplateId: "conversation-turn",
          difficulty: "introductory",
          format: "conversation",
          prompt: `If this felt hard, name the smallest part of ${focus} that needs repair.`,
          hint: "Naming the blocker is valid evidence for the Mentor.",
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
            ? "What should this generated lesson stay aligned to?"
            : "What is this generated starter lesson allowed to prove?",
          options: aligned
            ? [focus, "A random topic", "A dashboard metric"]
            : ["Learner placement", "Official completion", "Certification credit"],
          answer: aligned ? focus : "Learner placement",
          acceptedAnswers: aligned ? [focus.toLowerCase()] : ["learner placement", "placement"],
          explanation: aligned
            ? "Dynamic generation must stay inside the mapped curriculum objective."
            : "Without authority mapping, generation can support placement and practice but cannot claim curriculum completion.",
        },
      ],
      aiCoachingPrompts: [
        {
          kind: "mistake",
          title: "Remediate",
          prompt: `If the learner misses this, generate one smaller explanation for ${focus}.`,
        },
        {
          kind: "alternate",
          title: "Another example",
          prompt: `Give a different example that stays inside ${focus}.`,
        },
        {
          kind: "review",
          title: "Review",
          prompt: `Check whether ${focus} should be reviewed before moving on.`,
        },
        {
          kind: "mastery",
          title: "Challenge",
          prompt: `If the learner is ready, generate one challenge question for ${focus}.`,
        },
        {
          kind: "encouragement",
          title: "Continue",
          prompt: "Encourage the learner and explain the next adaptive step.",
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
