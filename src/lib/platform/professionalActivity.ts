import type { BeastDocument } from "./documents";
import type {
  Goal,
  GoalContribution,
  GoalLifecycleEvent,
  GoalMilestone,
} from "./goals";
import {
  buildTimelineItem,
  type PlatformTimelineItem,
  type TimelineEventKind,
} from "./timeline";
import type { PlatformModule } from "./types";

export type ProfessionalActivitySource =
  | "money"
  | "learning"
  | "health"
  | "goals"
  | "documents"
  | "home";

export type ProfessionalActivityFilter =
  | "all"
  | "money"
  | "education"
  | "health"
  | "goals"
  | "documents"
  | "home";

export type ProfessionalActivityFilterOption = {
  id: ProfessionalActivityFilter;
  label: string;
  source?: ProfessionalActivitySource;
};

export const professionalActivityFilters: ProfessionalActivityFilterOption[] = [
  { id: "all", label: "All" },
  { id: "money", label: "Money", source: "money" },
  { id: "education", label: "Education", source: "learning" },
  { id: "health", label: "Health", source: "health" },
  { id: "goals", label: "Goals", source: "goals" },
  { id: "documents", label: "Documents", source: "documents" },
  { id: "home", label: "Home", source: "home" },
];

export type EducationProfileActivityRecord = {
  ownerId: string;
  goal: string;
  careerInterests: string[];
  educationalGoals: string[];
  learningPreferences: string[];
  certifications: string[];
  strengths: string;
  updatedAt: string;
};

export type RetirementTimelineActivityRecord = {
  id: string;
  calculationVersion: string;
  createdAt: string;
};

export type RetirementReportActivityRecord = {
  id: string;
  format: string;
  createdAt: string;
};

export type ProfessionalActivityInputs = {
  educationProfile?: EducationProfileActivityRecord;
  retirementTimelineRuns?: RetirementTimelineActivityRecord[];
  retirementReports?: RetirementReportActivityRecord[];
  documents?: BeastDocument[];
  goals?: Goal[];
  goalContributions?: GoalContribution[];
};

const professionalNames: Record<ProfessionalActivitySource, string> = {
  money: "Money Coach",
  learning: "Guidance Counselor",
  health: "Health Advisor",
  goals: "Goals",
  documents: "Documents",
  home: "Home Assistant",
};

export function isProfessionalActivityFilter(
  value: unknown
): value is ProfessionalActivityFilter {
  return professionalActivityFilters.some((filter) => filter.id === value);
}

export function getProfessionalActivityFilter(
  value: unknown
): ProfessionalActivityFilterOption {
  const id = isProfessionalActivityFilter(value) ? value : "all";
  return (
    professionalActivityFilters.find((filter) => filter.id === id) ??
    professionalActivityFilters[0]
  );
}

export function getProfessionalName(source: PlatformModule) {
  return professionalNames[source as ProfessionalActivitySource] ?? "BeastOS";
}

function isProfessionalSource(
  source: PlatformModule | undefined
): source is ProfessionalActivitySource {
  return Boolean(source && source in professionalNames);
}

function buildProfessionalActivity({
  id,
  source,
  sourceRecordId,
  kind,
  title,
  summary,
  occurredAt,
  href,
  details = [],
}: {
  id: string;
  source: ProfessionalActivitySource;
  sourceRecordId: string;
  kind: TimelineEventKind;
  title: string;
  summary: string;
  occurredAt: string;
  href: string;
  details?: PlatformTimelineItem["details"];
}) {
  return buildTimelineItem({
    id,
    source,
    sourceRecordId,
    kind,
    title,
    summary,
    occurredAt,
    visibility: "Owner",
    href,
    meaningful: true,
    details: [
      { label: "Professional", value: professionalNames[source] },
      ...details,
    ],
  });
}

function uniqueNonEmpty(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function buildEducationProfileActivity(
  profile: EducationProfileActivityRecord
): PlatformTimelineItem | null {
  const careerInterests = uniqueNonEmpty(profile.careerInterests);
  const educationalGoals = uniqueNonEmpty(profile.educationalGoals);
  const learningPreferences = uniqueNonEmpty(profile.learningPreferences);
  const certifications = uniqueNonEmpty(profile.certifications);
  const goal = profile.goal.trim();
  const strengths = profile.strengths.trim();

  if (
    !careerInterests.length &&
    !educationalGoals.length &&
    !learningPreferences.length &&
    !certifications.length &&
    !goal &&
    !strengths
  ) {
    return null;
  }

  const evidence = [
    careerInterests.length
      ? { label: "Career interests", value: careerInterests.join(", ") }
      : null,
    educationalGoals.length
      ? { label: "Education goals", value: educationalGoals.join(", ") }
      : null,
    learningPreferences.length
      ? { label: "Learning preferences", value: learningPreferences.join(", ") }
      : null,
    certifications.length
      ? { label: "Certifications", value: certifications.join(", ") }
      : null,
    goal ? { label: "Current goal", value: goal } : null,
    strengths ? { label: "Strengths", value: strengths } : null,
  ].filter((detail): detail is { label: string; value: string } => Boolean(detail));

  const title = careerInterests.length
    ? "Learned your career interests."
    : educationalGoals.length || goal
      ? "Clarified your educational direction."
      : "Learned more about how to guide you.";

  return buildProfessionalActivity({
    id: `education-profile-${profile.ownerId}-${profile.updatedAt}`,
    source: "learning",
    sourceRecordId: profile.ownerId,
    kind: "Updated",
    title,
    summary:
      "Your Guidance Counselor added confirmed details from your conversations to the understanding they use when guiding you.",
    occurredAt: profile.updatedAt,
    href: "/dashboard/education",
    details: evidence,
  });
}

function lifecycleKind(event: GoalLifecycleEvent): TimelineEventKind {
  return event.type === "Completed" ? "Completed" : "Updated";
}

function buildGoalLifecycleActivity(event: GoalLifecycleEvent) {
  return buildProfessionalActivity({
    id: `goal-lifecycle-${event.id}`,
    source: "goals",
    sourceRecordId: event.goalId,
    kind: lifecycleKind(event),
    title: event.title,
    summary:
      event.reason?.trim() ||
      `Goals recorded this ${event.type.toLowerCase()} change in your plan.`,
    occurredAt: event.occurredAt,
    href: "/dashboard/goals",
    details: [{ label: "Change", value: event.type }],
  });
}

function buildMilestoneActivity(goal: Goal, milestone: GoalMilestone) {
  return buildProfessionalActivity({
    id: `goal-milestone-${milestone.id}`,
    source: "goals",
    sourceRecordId: milestone.id,
    kind: "Completed",
    title: `Marked “${milestone.title}” complete.`,
    summary: `This milestone moved “${goal.title}” forward.`,
    occurredAt: milestone.completedAt as string,
    href: "/dashboard/goals",
    details: [{ label: "Goal", value: goal.title }],
  });
}

function buildContributionActivity(
  contribution: GoalContribution
): PlatformTimelineItem | null {
  if (!isProfessionalSource(contribution.sourceModule)) return null;

  const kind: TimelineEventKind =
    contribution.type === "Milestone" ? "Completed" : "Updated";

  return buildProfessionalActivity({
    id: `goal-contribution-${contribution.id}`,
    source: contribution.sourceModule,
    sourceRecordId: contribution.id,
    kind,
    title: contribution.title,
    summary: contribution.summary,
    occurredAt: contribution.occurredAt,
    href: contribution.actionUrl || "/dashboard/goals",
    details: [{ label: "Contribution", value: contribution.type }],
  });
}

export function buildProfessionalActivities({
  educationProfile,
  retirementTimelineRuns = [],
  retirementReports = [],
  documents = [],
  goals = [],
  goalContributions = [],
}: ProfessionalActivityInputs): PlatformTimelineItem[] {
  const activities: PlatformTimelineItem[] = [];

  if (educationProfile) {
    const profileActivity = buildEducationProfileActivity(educationProfile);
    if (profileActivity) activities.push(profileActivity);
  }

  retirementTimelineRuns.forEach((run) => {
    activities.push(
      buildProfessionalActivity({
        id: `retirement-timeline-${run.id}`,
        source: "money",
        sourceRecordId: run.id,
        kind: "Updated",
        title: "Updated your retirement timeline.",
        summary:
          "Your Money Coach recalculated the saved timeline for your retirement plan.",
        occurredAt: run.createdAt,
        href: "/dashboard/money/retirement",
        details: [
          { label: "Calculation version", value: run.calculationVersion },
        ],
      })
    );
  });

  retirementReports.forEach((report) => {
    activities.push(
      buildProfessionalActivity({
        id: `retirement-report-${report.id}`,
        source: "money",
        sourceRecordId: report.id,
        kind: "Created",
        title: `Prepared your ${report.format.toUpperCase()} retirement report.`,
        summary:
          "Your Money Coach prepared a report from your saved retirement plan.",
        occurredAt: report.createdAt,
        href: "/dashboard/money/retirement",
        details: [{ label: "Format", value: report.format.toUpperCase() }],
      })
    );
  });

  documents
    .filter((document) => document.status === "Ready")
    .forEach((document) => {
      activities.push(
        buildProfessionalActivity({
          id: `document-ready-${document.id}`,
          source: "documents",
          sourceRecordId: document.id,
          kind: "Completed",
          title: `Processed “${document.title}.”`,
          summary: "Documents made this upload ready for you to use in Beast.",
          occurredAt: document.updatedAt,
          href: "/dashboard/uploads",
          details: [{ label: "Category", value: document.category }],
        })
      );
    });

  goals.forEach((goal) => {
    goal.lifecycleEvents.forEach((event) => {
      activities.push(buildGoalLifecycleActivity(event));
    });
    goal.milestones
      .filter(
        (milestone): milestone is GoalMilestone & { completedAt: string } =>
          milestone.status === "Completed" && Boolean(milestone.completedAt)
      )
      .forEach((milestone) => {
        activities.push(buildMilestoneActivity(goal, milestone));
      });
  });

  goalContributions.forEach((contribution) => {
    const activity = buildContributionActivity(contribution);
    if (activity) activities.push(activity);
  });

  return activities;
}
