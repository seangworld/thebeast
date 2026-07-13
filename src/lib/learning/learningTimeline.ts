import type { LearningActivityRunnerRow } from "./activityRunner";
import type { LearningGoal, LearningRecommendation, LearningSession } from "./types";

export type LearningTimelineEventType =
  | "lesson_started"
  | "lesson_completed"
  | "difficulty_detected"
  | "remediation_assigned"
  | "reflection_recorded"
  | "goal_changed"
  | "review_scheduled"
  | "mentor_recommendation";

export type LearningTimelineEvent = {
  id: string;
  type: LearningTimelineEventType;
  title: string;
  detail: string;
  occurredAt?: string;
  priority: "high" | "normal";
};

export type MentorLearningMemory = {
  lastDone: string;
  struggledWith: string;
  improved: string;
  unfinished: string;
  reviewDue: string;
  nextReason: string;
};

type TimelineInput = {
  activities: LearningActivityRunnerRow[];
  sessions: LearningSession[];
  goals: LearningGoal[];
  recommendations: LearningRecommendation[];
};

function eventTime(value?: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function newest<T>(items: T[], getTime: (item: T) => number) {
  return [...items].sort((a, b) => getTime(b) - getTime(a))[0];
}

export function buildLearningTimeline({
  activities,
  sessions,
  goals,
  recommendations,
}: TimelineInput): LearningTimelineEvent[] {
  const events: LearningTimelineEvent[] = [];

  activities.forEach((activity) => {
    if (activity.status === "In progress") {
      events.push({
        id: `activity-started-${activity.id}`,
        type: "lesson_started",
        title: `${activity.title} started`,
        detail: "This session is unfinished and can be resumed.",
        occurredAt: activity.created_at || undefined,
        priority: "high",
      });
    }

    if (activity.status === "Completed") {
      events.push({
        id: `activity-completed-${activity.id}`,
        type: "lesson_completed",
        title: `${activity.title} completed`,
        detail: activity.session_recap || "The activity was completed and saved.",
        occurredAt: activity.completed_at || activity.created_at || undefined,
        priority: "normal",
      });
    }

    if (activity.session_weak_concepts && activity.session_weak_concepts.length > 0) {
      events.push({
        id: `activity-difficulty-${activity.id}`,
        type: "difficulty_detected",
        title: `Review need found in ${activity.title}`,
        detail: activity.session_weak_concepts[0],
        occurredAt: activity.completed_at || activity.created_at || undefined,
        priority: "high",
      });
    }

    if (activity.session_state === "review_due") {
      events.push({
        id: `activity-review-${activity.id}`,
        type: "review_scheduled",
        title: `${activity.title} needs review`,
        detail: activity.session_next_recommendation || "The Mentor should schedule review.",
        occurredAt: activity.completed_at || activity.created_at || undefined,
        priority: "high",
      });
    }

    if (activity.reflection_option || activity.reflection_note) {
      events.push({
        id: `activity-reflection-${activity.id}`,
        type: "reflection_recorded",
        title: `Reflection recorded for ${activity.title}`,
        detail: activity.reflection_option || "Learner added a reflection note.",
        occurredAt: activity.completed_at || activity.created_at || undefined,
        priority:
          activity.reflection_option === "I guessed" ||
          activity.reflection_option === "I'm frustrated"
            ? "high"
            : "normal",
      });
    }
  });

  sessions
    .filter((session) => session.status === "Completed")
    .forEach((session) => {
      events.push({
        id: `session-completed-${session.id}`,
        type: "lesson_completed",
        title: `${session.title} completed`,
        detail: `${session.duration} in ${session.courseTitle}.`,
        occurredAt: session.when,
        priority: "normal",
      });
    });

  goals.forEach((goal) => {
    events.push({
      id: `goal-${goal.id}`,
      type: "goal_changed",
      title: `${goal.title} is ${goal.status.toLowerCase()}`,
      detail: goal.target,
      priority: goal.status === "Active" ? "high" : "normal",
    });
  });

  recommendations.slice(0, 2).forEach((recommendation) => {
    events.push({
      id: `recommendation-${recommendation.id}`,
      type: "mentor_recommendation",
      title: recommendation.title,
      detail: recommendation.reason,
      priority: recommendation.priority === "High" ? "high" : "normal",
    });
  });

  return events
    .filter((event) => event.title && event.detail)
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority === "high" ? -1 : 1;
      return eventTime(b.occurredAt) - eventTime(a.occurredAt);
    })
    .slice(0, 8);
}

export function buildMentorLearningMemory(input: TimelineInput): MentorLearningMemory {
  const completed = input.activities.filter((activity) => activity.status === "Completed");
  const unfinished = input.activities.find((activity) => activity.status !== "Completed");
  const lastCompleted = newest(completed, (activity) =>
    eventTime(activity.completed_at || activity.created_at)
  );
  const difficulty = input.activities.find(
    (activity) => (activity.session_weak_concepts?.length || 0) > 0
  );
  const improved = input.activities.find(
    (activity) => (activity.session_strengths?.length || 0) > 0
  );
  const reviewDue = input.activities.find(
    (activity) => activity.session_state === "review_due"
  );
  const recommendation = input.recommendations[0];

  return {
    lastDone: lastCompleted
      ? `Last completed: ${lastCompleted.title}.`
      : "No completed learning activity is saved yet.",
    struggledWith: difficulty?.session_weak_concepts?.[0]
      ? `Recent difficulty: ${difficulty.session_weak_concepts[0]}.`
      : "No specific recent difficulty is saved yet.",
    improved: improved?.session_strengths?.[0]
      ? `Recent strength: ${improved.session_strengths[0]}.`
      : "No improvement signal is saved yet.",
    unfinished: unfinished
      ? `Unfinished work: ${unfinished.title}.`
      : "No unfinished activity is currently visible.",
    reviewDue: reviewDue
      ? `Review due: ${reviewDue.title}.`
      : "No review is currently due from saved session outcomes.",
    nextReason: recommendation?.reason || "The next reason will appear after a Mentor recommendation is generated.",
  };
}
