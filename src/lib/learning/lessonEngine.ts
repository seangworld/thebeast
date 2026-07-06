import {
  normalizeLearningActivityType,
  type LearningActivityRunnerRow,
  type LearningActivityType,
} from "./activityRunner";

export type LessonEnginePhaseKind =
  | "assess"
  | "learn"
  | "practice"
  | "coach"
  | "reflect"
  | "complete";

export type LessonEnginePhase = {
  id: LessonEnginePhaseKind;
  label: string;
  title: string;
  prompt: string;
  check: string;
};

export type LessonEngineDefinition = {
  activityType: LearningActivityType;
  title: string;
  summary: string;
  phases: LessonEnginePhase[];
  reflectionPrompt: string;
  completionLabel: string;
};

const basePhases: LessonEnginePhase[] = [
  {
    id: "assess",
    label: "Assess",
    title: "Start with what you know",
    prompt: "Before learning anything new, name what already makes sense and what feels uncertain.",
    check: "I named my starting point.",
  },
  {
    id: "learn",
    label: "Lesson",
    title: "Build the idea",
    prompt: "Study the core idea in a small chunk. Keep it simple enough to explain back.",
    check: "I can explain the main idea.",
  },
  {
    id: "practice",
    label: "Practice",
    title: "Try one rep",
    prompt: "Apply the idea once. The goal is to notice the pattern, not to be perfect.",
    check: "I tried the practice step.",
  },
  {
    id: "coach",
    label: "AI Coach",
    title: "Ask for guidance",
    prompt: "Use Beast as a coach: ask for a hint, a clearer explanation, or a mistake check.",
    check: "I captured the coaching takeaway.",
  },
  {
    id: "reflect",
    label: "Reflect",
    title: "Make it stick",
    prompt: "Write what changed in your understanding and what should happen next.",
    check: "I wrote a reflection.",
  },
];

const typeOverrides: Record<
  LearningActivityType,
  Partial<Pick<LessonEngineDefinition, "summary" | "reflectionPrompt" | "completionLabel">> & {
    phasePrompts?: Partial<Record<LessonEnginePhaseKind, string>>;
  }
> = {
  Lesson: {
    summary: "A guided lesson path from starting knowledge to reflection.",
    reflectionPrompt: "What clicked in this lesson, and what should Beast recommend next?",
    completionLabel: "Complete lesson",
  },
  Practice: {
    summary: "A practice-first activity that turns a concept into reps.",
    reflectionPrompt: "What mistake or pattern did this practice reveal?",
    completionLabel: "Finish practice",
    phasePrompts: {
      learn: "Review the pattern only as much as needed before practicing.",
      practice: "Do one focused rep and check the work before moving on.",
    },
  },
  Quiz: {
    summary: "A quick recall check that tells Beast what needs review.",
    reflectionPrompt: "Which answer felt least certain, and why?",
    completionLabel: "Complete quiz",
    phasePrompts: {
      assess: "Predict which parts you can answer from memory.",
      practice: "Answer from memory first, then mark anything uncertain.",
    },
  },
  "AI Tutor Challenge": {
    summary: "A coached challenge that uses BeastAI-style guidance without giving away the thinking.",
    reflectionPrompt: "What did the coaching help you understand better?",
    completionLabel: "Complete challenge",
    phasePrompts: {
      coach: "Ask for one hint or explanation that helps you think instead of giving the answer.",
    },
  },
  Reflection: {
    summary: "A reflection activity that turns recent work into a sharper next recommendation.",
    reflectionPrompt: "What should Beast remember about how you learn best?",
    completionLabel: "Save reflection",
    phasePrompts: {
      assess: "Name how the last activity felt before judging the result.",
      learn: "Identify one learning habit Beast should remember.",
      practice: "Choose one small adjustment for the next activity.",
    },
  },
};

export function buildLessonEngineDefinition(
  activity: Pick<LearningActivityRunnerRow, "activity_type" | "title" | "difficulty">
): LessonEngineDefinition {
  const activityType = normalizeLearningActivityType(activity.activity_type);
  const override = typeOverrides[activityType];

  return {
    activityType,
    title: activity.title,
    summary: override.summary || "A reusable BeastLearning activity engine.",
    reflectionPrompt:
      override.reflectionPrompt ||
      "What did you learn, and what should Beast recommend next?",
    completionLabel: override.completionLabel || "Complete activity",
    phases: basePhases.map((phase) => ({
      ...phase,
      prompt: override.phasePrompts?.[phase.id] || phase.prompt,
    })),
  };
}

export function getLessonEngineProgress({
  checkedPhases,
  phaseCount,
  reflection,
}: {
  checkedPhases: Record<string, boolean>;
  phaseCount: number;
  reflection: string;
}) {
  const completedPhases = Object.values(checkedPhases).filter(Boolean).length;
  const reflectionComplete = reflection.trim().length > 0;
  const requiredSteps = phaseCount + 1;
  const completedSteps = completedPhases + (reflectionComplete ? 1 : 0);

  return {
    completedPhases,
    reflectionComplete,
    completedSteps,
    requiredSteps,
    readyToComplete: completedPhases === phaseCount && reflectionComplete,
    percent:
      requiredSteps === 0
        ? 0
        : Math.round((completedSteps / requiredSteps) * 100),
  };
}
