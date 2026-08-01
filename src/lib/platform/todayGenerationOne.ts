import type { HealthRecord } from "../health/foundation";
import { buildHealthAdvisorModel } from "../health/healthAdvisor";
import type { Goal } from "./goals";
import type { PlatformTimelineEvent } from "./types";
import type { TodayContribution } from "./today";

const legacyEducationPattern =
  /\b(lesson|tutor|study|grade(?:-level)?|teach(?:ing)?|course|homework|quiz|practice|learning activity)\b/i;

const educationPlanningRoutes = {
  certification: "/dashboard/education/certifications",
  scholarship: "/dashboard/education/scholarships",
  school: "/dashboard/education/schools",
  career: "/dashboard/education/career-planning",
  roadmap: "/dashboard/education/education-planning",
} as const;

function educationPlanningDestination(value: string) {
  if (/\b(certification|certificate|credential)\b/i.test(value)) {
    return {
      actionUrl: educationPlanningRoutes.certification,
      recommendedAction: "View certification plan",
    };
  }
  if (/\b(scholarship|financial aid|funding)\b/i.test(value)) {
    return {
      actionUrl: educationPlanningRoutes.scholarship,
      recommendedAction: "Review scholarships",
    };
  }
  if (/\b(school|college|university|application|admission)\b/i.test(value)) {
    return {
      actionUrl: educationPlanningRoutes.school,
      recommendedAction: "Review schools",
    };
  }
  if (/\b(career|profession|job|occupation|trade)\b/i.test(value)) {
    return {
      actionUrl: educationPlanningRoutes.career,
      recommendedAction: "Continue career planning",
    };
  }
  return {
    actionUrl: educationPlanningRoutes.roadmap,
    recommendedAction: "Review roadmap",
  };
}

function educationGoalEvidence(goal: Goal) {
  const recommendation = goal.recommendations.find((item) =>
    ["Suggested", "Accepted"].includes(item.status)
  );
  const milestone = goal.milestones.find((item) =>
    ["Not Started", "In Progress"].includes(item.status)
  );
  const title =
    recommendation?.title || milestone?.title || goal.currentStep || goal.title;
  const combinedEvidence = [
    goal.title,
    goal.summary,
    goal.currentStep,
    recommendation?.title,
    recommendation?.reason,
    milestone?.title,
  ]
    .filter(Boolean)
    .join(" ");

  if (legacyEducationPattern.test(combinedEvidence)) return null;

  return {
    title,
    summary:
      recommendation?.reason ||
      goal.currentStep ||
      goal.summary ||
      `Your saved ${goal.category.toLowerCase()} goal is ready for planning.`,
    reason: recommendation?.reason
      ? `This Guidance Counselor recommendation is attached to your saved goal "${goal.title}".`
      : milestone
        ? `This is the next open milestone in your saved goal "${goal.title}".`
        : `This is the next saved step for your ${goal.category.toLowerCase()} goal "${goal.title}".`,
    sourceEvidenceIds: [
      `goal:${goal.id}`,
      ...(recommendation ? [`goal-recommendation:${recommendation.id}`] : []),
      ...(milestone ? [`goal-milestone:${milestone.id}`] : []),
    ],
    destination: educationPlanningDestination(combinedEvidence),
  };
}

export function buildEducationPlanningContributions({
  goals,
  today,
}: {
  goals: readonly Goal[];
  today: string;
}): TodayContribution[] {
  return goals
    .filter(
      (goal) =>
        ["Education", "Career"].includes(goal.category) &&
        ["Proposed", "Active", "Blocked"].includes(goal.status)
    )
    .flatMap((goal) => {
      const evidence = educationGoalEvidence(goal);
      if (!evidence) return [];

      return [
        {
          id: `today-education-goal-${goal.id}`,
          source: "learning" as const,
          type: "Plan Step" as const,
          title: evidence.title,
          summary: evidence.summary,
          reason: evidence.reason,
          recommendedAction: evidence.destination.recommendedAction,
          actionUrl: evidence.destination.actionUrl,
          activeDate: today,
          timing: "Active" as const,
          priority: goal.status === "Blocked" ? ("High" as const) : ("Medium" as const),
          importance: goal.status === "Blocked" ? 8 : 6,
          urgency: goal.status === "Blocked" ? 8 : 5,
          preferenceWeight: 6,
          estimatedMinutes: 10,
          relatedGoalId: goal.id,
          dismissible: true,
          status: "Active" as const,
          sourceEvidenceIds: evidence.sourceEvidenceIds,
        },
      ];
    })
    .slice(0, 3);
}

function healthEvidenceIds(evidence: readonly Record<string, unknown>[]) {
  return evidence.flatMap((item) => {
    if (typeof item.healthRecordId === "string") {
      return [`health-record:${item.healthRecordId}`];
    }
    if (typeof item.documentId === "string") {
      return [`health-document:${item.documentId}`];
    }
    return [];
  });
}

export function buildHealthTodayContributions({
  records,
  today,
}: {
  records: readonly HealthRecord[];
  today: string;
}): TodayContribution[] {
  const model = buildHealthAdvisorModel({ records, asOf: today });

  return model.recommendations
    .flatMap((recommendation) => {
      const sourceEvidenceIds = healthEvidenceIds(
        recommendation.supportingEvidence
      );
      if (sourceEvidenceIds.length === 0) return [];

      return [
        {
          id: `today-health-${recommendation.sourceRecommendationId}`,
          source: "health" as const,
          type: "Recommendation" as const,
          title: recommendation.title,
          summary: recommendation.recommendation,
          reason: `Health Advisor based this organizational recommendation on ${sourceEvidenceIds.length} saved health record${sourceEvidenceIds.length === 1 ? "" : "s"}.`,
          recommendedAction: recommendation.title.startsWith("Prepare for")
            ? "Prepare for appointment"
            : "Review with Health Advisor",
          actionUrl: recommendation.href,
          activeDate: today,
          timing: "Active" as const,
          priority: "Medium" as const,
          importance: 6,
          urgency: recommendation.title.startsWith("Prepare for") ? 6 : 4,
          preferenceWeight: 5,
          estimatedMinutes: 10,
          dismissible: true,
          status: "Active" as const,
          sourceEvidenceIds,
        },
      ];
    })
    .slice(0, 3);
}

export function buildHealthUpcomingEvents({
  records,
  now,
}: {
  records: readonly HealthRecord[];
  now: Date;
}): PlatformTimelineEvent[] {
  const today = now.toISOString().slice(0, 10);

  return records
    .filter(
      (record) =>
        record.recordType === "appointment" &&
        record.status !== "resolved" &&
        record.status !== "archived" &&
        Boolean(record.occurredOn) &&
        record.occurredOn! >= today
    )
    .sort((left, right) =>
      (left.occurredOn || "").localeCompare(right.occurredOn || "")
    )
    .map((record) => ({
      id: `health-appointment-${record.id}`,
      module: "health" as const,
      title: record.title,
      summary:
        "Saved appointment date. Confirm the time, location, and instructions with the provider.",
      timestamp: `${record.occurredOn}T12:00:00.000Z`,
      actionUrl: "/dashboard/health/appointments",
    }));
}

export function getTodayProfessionalLabel(
  source: TodayContribution["source"]
) {
  if (source === "money") return "Money Coach";
  if (source === "learning") return "Guidance Counselor";
  if (source === "health") return "Health Advisor";
  return "BeastOS";
}
