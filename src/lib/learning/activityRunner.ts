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
  created_at?: string | null;
  session_state?: string | null;
  session_recap?: string | null;
  session_strengths?: string[] | null;
  session_weak_concepts?: string[] | null;
  session_next_recommendation?: string | null;
  reflection_option?: string | null;
  reflection_note?: string | null;
  reflection_confidence_adjustment?: string | null;
  reflection_next_action?: string | null;
};

export type LearningActivityContinuityState = {
  completedActivityId: string;
  completedAt: string;
  nextQueuedActivityId: string | null;
  newestReadyActivityId: string | null;
  queueExhausted: boolean;
  continuityBasis: string;
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
    "Write one question you want your Tutor to help with next.",
  ],
  Practice: [
    "Try the first problem without looking anything up.",
    "Check the pattern in your work.",
    "Redo one step more cleanly before moving on.",
  ],
  Quiz: [
    "Answer from memory first.",
    "Mark any answer you are unsure about.",
    "Review the unsure items before you decide what you learned.",
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
    "Use your Tutor as a coach. Ask for help that keeps you thinking, then capture the takeaway.",
  Reflection:
    "Pause and make the learning visible. This helps your Guidance Counselor choose the next step more carefully.",
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

  if (normalized === "Quiz") return "Let's see what you remember";
  if (normalized === "Practice") return "Practice with support";
  if (normalized === "Reflection") return "Save reflection";
  if (normalized === "AI Tutor Challenge") return "Work with the Tutor";

  return "Let's see what you've learned";
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

function getActivityCreatedTime(activity: LearningActivityRunnerRow) {
  return activity.created_at ? new Date(activity.created_at).getTime() : 0;
}

export function getNewestReadyLearningActivity(
  activities: LearningActivityRunnerRow[]
) {
  const openActivities = activities.filter(
    (activity) => activity.status !== "Completed"
  );
  const readyActivities = openActivities.filter(
    (activity) => activity.status === "Ready"
  );
  const candidates = readyActivities.length > 0 ? readyActivities : openActivities;

  return (
    [...candidates].sort((a, b) => {
      const createdDelta = getActivityCreatedTime(b) - getActivityCreatedTime(a);
      if (createdDelta !== 0) return createdDelta;

      return Number(a.sort_order || 0) - Number(b.sort_order || 0);
    })[0] || null
  );
}

export function getLearningActivityCompletionPayload(now = new Date()) {
  return {
    status: "Completed",
    completed_at: now.toISOString(),
  };
}

export function buildLearningActivityContinuityState({
  activities,
  completedActivityId,
  now = new Date(),
}: {
  activities: LearningActivityRunnerRow[];
  completedActivityId: string;
  now?: Date;
}): LearningActivityContinuityState {
  const completion = getLearningActivityCompletionPayload(now);
  const updatedActivities = activities.map((activity) =>
    activity.id === completedActivityId
      ? { ...activity, ...completion }
      : activity
  );
  const nextQueued = getNextQueuedLearningActivity(
    updatedActivities,
    completedActivityId
  );
  const newestReady = getNewestReadyLearningActivity(updatedActivities);

  return {
    completedActivityId,
    completedAt: completion.completed_at,
    nextQueuedActivityId: nextQueued?.id || null,
    newestReadyActivityId: newestReady?.id || null,
    queueExhausted: !nextQueued && !newestReady,
    continuityBasis:
      "Completion preserves queue order first, then newest ready activity, without changing completed activity history.",
  };
}
