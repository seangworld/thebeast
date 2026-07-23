import {
  buildLearningChronology,
  type LearningChronologyInput,
} from "./learningChronology";

export type LearningReportKind =
  | "progress_summary"
  | "course"
  | "knowledge"
  | "achievement"
  | "weekly"
  | "monthly";

export type LearningReportRow = {
  label: string;
  value: string | number;
};

export type LearningReport = {
  id: string;
  kind: LearningReportKind;
  title: string;
  subtitle: string;
  period: string;
  printable: true;
  sections: Array<{
    title: string;
    rows: LearningReportRow[];
  }>;
};

export type LearningReportsBundle = {
  generatedAt: string;
  reports: LearningReport[];
  disclosure: string;
};

type LearningRecord = Record<string, unknown>;

export type LearningReportsInput = LearningChronologyInput & {
  asOf?: string;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function percent(value: number) {
  return `${Math.round(Math.min(100, Math.max(0, value)))}%`;
}

function average(values: number[]) {
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}

function report(
  kind: LearningReportKind,
  title: string,
  subtitle: string,
  period: string,
  sections: LearningReport["sections"]
): LearningReport {
  return {
    id: `learning-${kind.replace(/_/g, "-")}-report`,
    kind,
    title,
    subtitle,
    period,
    printable: true,
    sections,
  };
}

function completed(row: LearningRecord) {
  return text(row.status).toLowerCase() === "completed";
}

function earned(row: LearningRecord) {
  return row.earned === true;
}

function dateLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function periodSummary(
  input: LearningReportsInput,
  start: Date,
  end: Date,
  title: string,
  kind: "weekly" | "monthly"
) {
  const events = buildLearningChronology(input).filter((event) => {
    const occurredAt = new Date(event.occurredAt).getTime();
    return occurredAt >= start.getTime() && occurredAt <= end.getTime();
  });
  const count = (eventType: string) =>
    events.filter((event) => event.type === eventType).length;
  const period = `${dateLabel(start)} – ${dateLabel(end)}`;

  return report(
    kind,
    title,
    `A chronological summary of saved learning evidence for ${period}.`,
    period,
    [
      {
        title: "Activity",
        rows: [
          { label: "Recorded learning events", value: events.length },
          { label: "Lessons completed", value: count("lesson_completed") },
          {
            label: "Courses started or finished",
            value: count("course_started") + count("course_finished"),
          },
          { label: "Reviews", value: count("review") },
        ],
      },
      {
        title: "Milestones",
        rows: [
          { label: "Knowledge milestones", value: count("knowledge_milestone") },
          { label: "Achievements", value: count("achievement") },
          { label: "Certificates", value: count("certificate") },
          { label: "Missions completed", value: count("mission_completed") },
        ],
      },
    ]
  );
}

export function buildLearningReports(
  input: LearningReportsInput
): LearningReportsBundle {
  const asOf = new Date(input.asOf || new Date().toISOString());
  if (Number.isNaN(asOf.getTime())) throw new Error("Learning reports require a valid as-of time.");

  const courses = input.courses || [];
  const activities = input.activities || [];
  const sessions = input.sessions || [];
  const mastery = input.mastery || [];
  const achievements = (input.achievements || []).filter(earned);
  const certificates = input.certificates || [];
  const goals = input.goals || [];
  const completedCourses = courses.filter(
    (course) => completed(course) || number(course.progress) >= 100
  );
  const completedActivities = activities.filter(completed);
  const completedSessions = sessions.filter(completed);
  const completedGoals = goals.filter(completed);
  const courseProgress = courses.map((course) => number(course.progress));
  const goalProgress = goals.map((goal) => number(goal.progress));
  const masteryValues = mastery.map((item) => number(item.mastery_percent));

  const weekStart = new Date(asOf);
  weekStart.setUTCDate(weekStart.getUTCDate() - 6);
  weekStart.setUTCHours(0, 0, 0, 0);
  const monthStart = new Date(
    Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 1)
  );
  const periodEnd = new Date(asOf);

  const courseRows: LearningReportRow[] = courses.length
    ? courses.map((course) => ({
        label: text(course.title) || "Untitled course",
        value: `${percent(number(course.progress))} · ${text(course.status) || "Planned"}`,
      }))
    : [{ label: "Courses", value: "No course records available" }];

  const knowledgeRows: LearningReportRow[] = mastery.length
    ? mastery.map((item) => ({
        label: text(item.concept_id) || "Unnamed concept",
        value: `${percent(number(item.mastery_percent))} · ${text(item.confidence) || "Confidence not recorded"}`,
      }))
    : [{ label: "Knowledge evidence", value: "No mastery records available" }];

  const achievementRows: LearningReportRow[] = [
    ...achievements.map((item) => ({
      label: text(item.title) || "Achievement",
      value: text(item.detail) || "Earned",
    })),
    ...certificates.map((item) => ({
      label: text(item.path_name) || "Certificate",
      value: text(item.completion_date) || "Completion date unavailable",
    })),
  ];

  return {
    generatedAt: asOf.toISOString(),
    disclosure:
      "Learning Reports summarize authenticated BeastEducation records. They are educational progress records, not grades, academic credit, accreditation, or guarantees of mastery.",
    reports: [
      report(
        "progress_summary",
        "Progress Summary",
        "A concise overview of courses, completed learning, and mission progress.",
        `As of ${dateLabel(asOf)}`,
        [
          {
            title: "Learning progress",
            rows: [
              { label: "Average course progress", value: percent(average(courseProgress)) },
              {
                label: "Completed lessons and sessions",
                value: completedActivities.length + completedSessions.length,
              },
              { label: "Average mission progress", value: percent(average(goalProgress)) },
              { label: "Completed missions", value: completedGoals.length },
            ],
          },
        ]
      ),
      report(
        "course",
        "Course Report",
        "Status and recorded progress for every current course.",
        `As of ${dateLabel(asOf)}`,
        [
          {
            title: "Course summary",
            rows: [
              { label: "Courses recorded", value: courses.length },
              { label: "Courses completed", value: completedCourses.length },
              { label: "Courses in progress", value: courses.length - completedCourses.length },
            ],
          },
          { title: "Course detail", rows: courseRows },
        ]
      ),
      report(
        "knowledge",
        "Knowledge Report",
        "Mastery and confidence from saved learning evidence.",
        `As of ${dateLabel(asOf)}`,
        [
          {
            title: "Knowledge summary",
            rows: [
              { label: "Concepts with evidence", value: mastery.length },
              { label: "Average recorded mastery", value: percent(average(masteryValues)) },
            ],
          },
          { title: "Concept detail", rows: knowledgeRows },
        ]
      ),
      report(
        "achievement",
        "Achievement Report",
        "Earned achievements and verified BeastEducation certificates.",
        `As of ${dateLabel(asOf)}`,
        [
          {
            title: "Recognition summary",
            rows: [
              { label: "Achievements earned", value: achievements.length },
              { label: "Certificates earned", value: certificates.length },
            ],
          },
          {
            title: "Recognition detail",
            rows:
              achievementRows.length > 0
                ? achievementRows
                : [{ label: "Recognition", value: "No earned records available" }],
          },
        ]
      ),
      periodSummary(input, weekStart, periodEnd, "Weekly Summary", "weekly"),
      periodSummary(input, monthStart, periodEnd, "Monthly Summary", "monthly"),
    ],
  };
}
