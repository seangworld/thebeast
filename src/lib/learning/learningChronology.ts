export type LearningChronologyEventType =
  | "lesson_completed"
  | "course_started"
  | "course_finished"
  | "achievement"
  | "review"
  | "knowledge_milestone"
  | "certificate"
  | "mission_completed"
  | "learning_activity";

export type LearningChronologyEvent = {
  id: string;
  type: LearningChronologyEventType;
  label: string;
  title: string;
  detail: string;
  occurredAt: string;
  href?: string;
};

type LearningRecord = Record<string, unknown>;

export type LearningChronologyInput = {
  history?: LearningRecord[];
  activities?: LearningRecord[];
  sessions?: LearningRecord[];
  courses?: LearningRecord[];
  achievements?: LearningRecord[];
  mastery?: LearningRecord[];
  certificates?: LearningRecord[];
  goals?: LearningRecord[];
};

const eventPresentation: Record<
  LearningChronologyEventType,
  { label: string; defaultDetail: string }
> = {
  lesson_completed: {
    label: "Lesson completed",
    defaultDetail: "This completed learning activity is part of your durable learning record.",
  },
  course_started: {
    label: "Course started",
    defaultDetail: "This course was added to your active learning work.",
  },
  course_finished: {
    label: "Course finished",
    defaultDetail: "All recorded work for this course is complete.",
  },
  achievement: {
    label: "Achievement",
    defaultDetail: "A demonstrated learning milestone was earned.",
  },
  review: {
    label: "Review",
    defaultDetail: "A review was completed or scheduled from saved learning evidence.",
  },
  knowledge_milestone: {
    label: "Knowledge milestone",
    defaultDetail: "Saved mastery evidence shows measurable knowledge progress.",
  },
  certificate: {
    label: "Certificate",
    defaultDetail: "A verified BeastEducation completion certificate was recorded.",
  },
  mission_completed: {
    label: "Mission completed",
    defaultDetail: "A saved learning goal reached completion.",
  },
  learning_activity: {
    label: "Learning activity",
    defaultDetail: "A learning event was recorded.",
  },
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function date(value: unknown) {
  const candidate = text(value);
  if (!candidate || Number.isNaN(new Date(candidate).getTime())) return "";
  return candidate;
}

function classifyHistoryEvent(eventType: unknown): LearningChronologyEventType {
  const value = text(eventType).toLowerCase().replace(/[\s-]+/g, "_");
  if (value.includes("certificate")) return "certificate";
  if (value.includes("achievement")) return "achievement";
  if (value.includes("review")) return "review";
  if (value.includes("master") || value.includes("knowledge")) return "knowledge_milestone";
  if (value.includes("mission") || value.includes("goal_completed")) return "mission_completed";
  if (value.includes("course") && (value.includes("complete") || value.includes("finish"))) {
    return "course_finished";
  }
  if (value.includes("course")) return "course_started";
  if (value.includes("lesson") || value.includes("session")) return "lesson_completed";
  return "learning_activity";
}

function createEvent({
  id,
  type,
  title,
  detail,
  occurredAt,
  href,
}: Omit<LearningChronologyEvent, "label">): LearningChronologyEvent | null {
  if (!id || !title || !occurredAt) return null;
  return {
    id,
    type,
    label: eventPresentation[type].label,
    title,
    detail: detail || eventPresentation[type].defaultDetail,
    occurredAt,
    href,
  };
}

function eventKey(event: LearningChronologyEvent) {
  return [
    event.type,
    event.title.toLowerCase(),
    event.occurredAt.slice(0, 10),
  ].join("|");
}

export function buildLearningChronology(
  input: LearningChronologyInput
): LearningChronologyEvent[] {
  const events: LearningChronologyEvent[] = [];
  const add = (event: LearningChronologyEvent | null) => {
    if (event) events.push(event);
  };

  (input.history || []).forEach((row) => {
    const type = classifyHistoryEvent(row.event_type);
    add(
      createEvent({
        id: `history-${text(row.id)}`,
        type,
        title: text(row.title) || eventPresentation[type].label,
        detail: text(row.summary),
        occurredAt: date(row.occurred_at),
      })
    );
  });

  (input.activities || []).forEach((row) => {
    const activityType = text(row.activity_type).toLowerCase();
    const completed = text(row.status).toLowerCase() === "completed";
    const isReview = activityType.includes("review") || text(row.session_state) === "review_due";
    if (!completed && !isReview) return;
    const type: LearningChronologyEventType = isReview ? "review" : "lesson_completed";
    add(
      createEvent({
        id: `activity-${text(row.id)}-${type}`,
        type,
        title: text(row.title) || eventPresentation[type].label,
        detail:
          text(row.session_recap) ||
          text(row.session_next_recommendation) ||
          (completed ? `${text(row.difficulty) || "Adaptive"} activity completed.` : ""),
        occurredAt: date(row.completed_at) || date(row.updated_at) || date(row.created_at),
        href: text(row.id) ? `/dashboard/education/activities/${text(row.id)}` : undefined,
      })
    );
  });

  (input.sessions || []).forEach((row) => {
    if (text(row.status).toLowerCase() !== "completed") return;
    add(
      createEvent({
        id: `session-${text(row.id)}`,
        type: "lesson_completed",
        title: text(row.title) || "Learning session completed",
        detail: [
          text(row.course_title),
          number(row.duration_minutes) > 0 ? `${number(row.duration_minutes)} minutes` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        occurredAt: date(row.completed_at) || date(row.created_at),
      })
    );
  });

  (input.courses || []).forEach((row) => {
    const complete =
      text(row.status).toLowerCase() === "completed" || number(row.progress) >= 100;
    const type: LearningChronologyEventType = complete ? "course_finished" : "course_started";
    add(
      createEvent({
        id: `course-${text(row.id)}-${type}`,
        type,
        title: text(row.title) || eventPresentation[type].label,
        detail: text(row.subject)
          ? `${text(row.subject)} · ${Math.min(100, Math.max(0, number(row.progress)))}% complete`
          : "",
        occurredAt: complete
          ? date(row.updated_at) || date(row.created_at)
          : date(row.created_at),
        href: "/dashboard/education/courses",
      })
    );
  });

  (input.achievements || []).forEach((row) => {
    if (row.earned !== true) return;
    add(
      createEvent({
        id: `achievement-${text(row.id)}`,
        type: "achievement",
        title: text(row.title) || "Achievement earned",
        detail: text(row.detail),
        occurredAt: date(row.earned_at) || date(row.created_at),
        href: "/dashboard/education/achievements",
      })
    );
  });

  (input.mastery || []).forEach((row) => {
    const mastery = Math.min(100, Math.max(0, number(row.mastery_percent)));
    if (mastery <= 0) return;
    add(
      createEvent({
        id: `mastery-${text(row.id)}`,
        type: "knowledge_milestone",
        title: `${text(row.concept_id) || "Concept"} reached ${mastery}% mastery`,
        detail: `${text(row.confidence) || "Unspecified"} confidence based on saved learning evidence.`,
        occurredAt: date(row.updated_at),
      })
    );
  });

  (input.certificates || []).forEach((row) => {
    add(
      createEvent({
        id: `certificate-${text(row.id)}`,
        type: "certificate",
        title: text(row.path_name) || "Certificate earned",
        detail: text(row.certificate_id)
          ? `Certificate ${text(row.certificate_id)}`
          : "",
        occurredAt: date(row.completion_date) || date(row.created_at),
        href: text(row.id) ? `/api/learning/certificates/${text(row.id)}` : undefined,
      })
    );
  });

  (input.goals || []).forEach((row) => {
    if (text(row.status).toLowerCase() !== "completed") return;
    add(
      createEvent({
        id: `mission-${text(row.id)}`,
        type: "mission_completed",
        title: text(row.title) || "Learning mission completed",
        detail: text(row.target),
        occurredAt: date(row.updated_at) || date(row.created_at),
        href: "/dashboard/education/goals",
      })
    );
  });

  const unique = new Map<string, LearningChronologyEvent>();
  events.forEach((event) => {
    const key = eventKey(event);
    if (!unique.has(key)) unique.set(key, event);
  });

  return Array.from(unique.values())
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    );
}
