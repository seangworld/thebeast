export type LearningActivityType =
  | "Lesson"
  | "Practice"
  | "Quiz"
  | "AI Tutor Challenge"
  | "Reflection";

export type LearningActivityStatus = "Ready" | "Queued" | "Completed" | string;

export type LearningActivityRunnerRow = {
  id: string;
  activity_type: string;
  title: string;
  difficulty: string;
  estimated_minutes: number;
  xp: number;
  status: LearningActivityStatus;
  completed_at?: string | null;
  sort_order?: number | null;
};

export const learningActivityTypes: LearningActivityType[] = [
  "Lesson",
  "Practice",
  "Quiz",
  "AI Tutor Challenge",
  "Reflection",
];

const checklistByType: Record<LearningActivityType, string[]> = {
  Lesson: [
    "Read the objective and name what you already know.",
    "Study the main idea in your own words.",
    "Write one question you want Beast to help with next.",
  ],
  Practice: [
    "Try the first problem without looking anything up.",
    "Check the pattern in your work.",
    "Redo one step more cleanly before moving on.",
  ],
  Quiz: [
    "Answer from memory first.",
    "Mark any answer you are unsure about.",
    "Review the unsure items before completing the quiz.",
  ],
  "AI Tutor Challenge": [
    "Explain your current understanding.",
    "Ask for one hint, not the full answer.",
    "Summarize what changed in your thinking.",
  ],
  Reflection: [
    "Name what felt easiest.",
    "Name what still feels confusing.",
    "Choose the next action that would help most.",
  ],
};

const instructionsByType: Record<LearningActivityType, string> = {
  Lesson:
    "Build the concept first. Keep the goal small enough that you can explain it back before moving on.",
  Practice:
    "Use this as reps, not a test. The win is spotting the pattern and correcting one mistake.",
  Quiz:
    "Check recall. Uncertainty is useful here because it tells Beast what should be reviewed next.",
  "AI Tutor Challenge":
    "Use Beast as a coach. Ask for guidance that helps you think, then capture the takeaway.",
  Reflection:
    "Pause and make the learning visible. This helps the next recommendation get sharper.",
};

export function normalizeLearningActivityType(
  activityType: string
): LearningActivityType {
  return learningActivityTypes.includes(activityType as LearningActivityType)
    ? (activityType as LearningActivityType)
    : "Lesson";
}

export function getLearningActivityChecklist(activityType: string) {
  return checklistByType[normalizeLearningActivityType(activityType)];
}

export function getLearningActivityInstructions(activityType: string) {
  return instructionsByType[normalizeLearningActivityType(activityType)];
}

export function getLearningActivityPrimaryActionLabel(activityType: string) {
  const normalized = normalizeLearningActivityType(activityType);

  if (normalized === "Quiz") return "Complete quiz";
  if (normalized === "Practice") return "Finish practice";
  if (normalized === "Reflection") return "Save reflection";
  if (normalized === "AI Tutor Challenge") return "Complete challenge";

  return "Complete lesson";
}

export function getLearningActivityRoute(activityId: string) {
  return `/dashboard/learning/activities/${activityId}`;
}

export function getNextQueuedLearningActivity(
  activities: LearningActivityRunnerRow[],
  completedActivityId: string
) {
  return activities
    .filter(
      (activity) =>
        activity.id !== completedActivityId && activity.status === "Queued"
    )
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))[0];
}

export function getLearningActivityCompletionPayload(now = new Date()) {
  return {
    status: "Completed",
    completed_at: now.toISOString(),
  };
}
