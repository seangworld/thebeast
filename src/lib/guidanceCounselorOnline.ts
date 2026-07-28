import type { GuidanceWorkflowRecommendation } from "./education/guidanceWorkflow";
import type { LifelongEducationRoadmap } from "./education/lifelongRoadmap";
import type { LearningActivityRunnerRow } from "./learning/activityRunner";
import type { ConfidenceIntelligenceSnapshot } from "./learning/confidenceIntelligence";
import type { MentorHomeMission } from "./learning/mentorHome";
import { selectMentorTutor } from "./learning/tutorOrchestration";
import type {
  LearningCourse,
  LearningGoal,
  LearningPlan,
  LearningRecommendation,
  LearningSession,
} from "./learning/types";
import type {
  ExecutionOutcomeRecord,
  ExecutionRecommendationRecord,
  ProfessionalExecutionHistory,
} from "./platform/agents";

export const guidanceCounselorProfessionalId =
  "beasteducation.guidance-counselor";

export type GuidanceCounselorRecommendationCard = {
  sourceRecommendationId: string;
  title: string;
  recommendation: string;
  href: string;
  confidence: {
    label: "low" | "medium" | "high";
    score: number;
    basis: string;
  };
  limitations: readonly string[];
  supportingEvidence: readonly {
    label: string;
    value: string | number | boolean | null;
  }[];
  lifecycle?: ExecutionRecommendationRecord;
};

export type GuidanceCounselorNotification = {
  id: string;
  title: string;
  detail: string;
  kind: "priority" | "review" | "context";
  href: string;
};

export type GuidanceCounselorOutcomeLearning = {
  id: string;
  recommendationTitle: string;
  status: ExecutionOutcomeRecord["outcomeStatus"];
  learning: readonly string[];
  recordedAt: string;
};

export type GuidanceCounselorOnlineModel = {
  learningBriefing: {
    title: string;
    summary: string;
    currentGoal: string;
    recentProgress: string;
  };
  diagnostics: {
    status: "available" | "not-recorded";
    summary: string;
    evidence: readonly string[];
    limitations: readonly string[];
  };
  goalPlanning: readonly {
    id: string;
    title: string;
    target: string;
    progress: number;
    status: string;
  }[];
  learningPriorities: readonly {
    id: string;
    title: string;
    reason: string;
    href: string;
  }[];
  careerGuidance: {
    title: string;
    summary: string;
    areasToVerify: readonly string[];
    href: string;
  };
  tutorHandoff: {
    role: string;
    reason: string;
    handoff: string;
    contextSummary: string;
    href: string;
    boundary: string;
  };
  notifications: readonly GuidanceCounselorNotification[];
  recommendations: readonly GuidanceCounselorRecommendationCard[];
  outcomeLearning: readonly GuidanceCounselorOutcomeLearning[];
};

export type GuidanceCounselorOnlineInput = {
  mission: MentorHomeMission;
  confidence: ConfidenceIntelligenceSnapshot;
  goals: readonly LearningGoal[];
  plan: LearningPlan;
  workflow: GuidanceWorkflowRecommendation;
  roadmap: LifelongEducationRoadmap;
  learningRecommendations: readonly LearningRecommendation[];
  activities: readonly LearningActivityRunnerRow[];
  courses: readonly LearningCourse[];
  sessions: readonly LearningSession[];
};

function sourceRecommendationId(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const source = value as { sourceRecommendationId?: unknown };
  return typeof source.sourceRecommendationId === "string"
    ? source.sourceRecommendationId
    : "";
}

function recommendationConfidence(
  input: GuidanceCounselorOnlineInput
): GuidanceCounselorRecommendationCard["confidence"] {
  const needsContext = input.roadmap.sections.filter(
    (section) => section.status === "needs-context"
  ).length;
  const score = input.confidence.missingData
    ? 35
    : Math.max(50, 90 - needsContext * 7);
  return {
    label: score >= 80 ? "high" : score >= 55 ? "medium" : "low",
    score,
    basis: input.confidence.missingData
      ? "The recommendation uses the saved goal and roadmap, but completed learning evidence is still limited."
      : "The recommendation combines saved goals, current plan, roadmap context, completed learning evidence, and confidence signals.",
  };
}

function matchLifecycle(
  history: ProfessionalExecutionHistory | undefined,
  sourceId: string
) {
  return history?.recommendations.find((recommendation) =>
    recommendation.supportingEvidence.some(
      (evidence) => sourceRecommendationId(evidence) === sourceId
    )
  );
}

export function buildGuidanceCounselorOnlineModel(
  input: GuidanceCounselorOnlineInput,
  history?: ProfessionalExecutionHistory
): GuidanceCounselorOnlineModel {
  const completedActivities = input.activities.filter(
    (activity) => activity.status === "Completed"
  );
  const diagnosticEvidence = completedActivities.flatMap((activity) => [
    ...(activity.session_strengths || []).map(
      (strength) => `${activity.title}: strength in ${strength}`
    ),
    ...(activity.session_weak_concepts || []).map(
      (weakness) => `${activity.title}: review ${weakness}`
    ),
  ]);
  const hasDiagnosticEvidence = diagnosticEvidence.length > 0;
  const activeCourse =
    input.courses.find((course) => course.status !== "Completed") ||
    input.courses[0];
  const activeGoal =
    input.goals.find((goal) => goal.status === "Active") || input.goals[0];
  const activeActivity =
    input.activities.find((activity) => activity.status !== "Completed") ||
    input.activities[0];
  const confidencePriority =
    input.confidence.dimensions.find(
      (dimension) => dimension.level === "review-due"
    ) ||
    input.confidence.dimensions.find(
      (dimension) => dimension.level === "developing"
    );
  const tutor = selectMentorTutor({
    activityType: activeActivity?.activity_type || "Learning",
    activityTitle: activeActivity?.title || input.mission.missionTitle,
    courseTitle: activeCourse?.title,
    goalTitle: activeGoal?.title,
    weakArea:
      activeActivity?.session_weak_concepts?.[0] ||
      confidencePriority?.label,
  });
  const confidence = recommendationConfidence(input);
  const recommendationSources = [
    {
      id: `guidance-workflow:${input.workflow.action}`,
      title: input.workflow.title,
      recommendation: input.workflow.why,
      href: input.workflow.href,
      evidence: [
        { label: "Expected outcome", value: input.workflow.outcome },
        { label: "Current plan", value: input.plan.title },
      ],
    },
    ...input.learningRecommendations.slice(0, 3).map((recommendation) => ({
      id: recommendation.id,
      title: recommendation.title,
      recommendation: recommendation.reason,
      href: recommendation.actionUrl || "/dashboard/education",
      evidence: [
        {
          label: "Current recommendation",
          value: recommendation.recommendedAction || null,
        },
        {
          label: "Estimated benefit",
          value: recommendation.estimatedBenefit || null,
        },
      ],
    })),
  ];
  const recommendations = recommendationSources.map((recommendation) => ({
    sourceRecommendationId: recommendation.id,
    title: recommendation.title,
    recommendation: recommendation.recommendation,
    href: recommendation.href,
    confidence,
    limitations: [
      "Guidance depends on the completeness and freshness of saved education records.",
      "Career, school, credential, and program requirements must be verified with current authoritative sources.",
    ],
    supportingEvidence: recommendation.evidence,
    lifecycle: matchLifecycle(history, recommendation.id),
  }));
  const notifications: GuidanceCounselorNotification[] = [
    {
      id: "current-priority",
      title: input.mission.missionTitle,
      detail: input.mission.recommendationReason,
      kind: "priority",
      href: input.mission.primaryAction.href,
    },
    ...(confidencePriority
      ? [{
          id: `confidence:${confidencePriority.id}`,
          title: `${confidencePriority.label} needs attention`,
          detail: confidencePriority.learnerLanguage,
          kind: "review" as const,
          href: "/dashboard/education/reviews",
        }]
      : []),
    ...(input.goals.length === 0
      ? [{
          id: "goal-context",
          title: "Learning goal needed",
          detail:
            "No saved learning goal is available, so Guidance Counselor will not infer one.",
          kind: "context" as const,
          href: "/dashboard/education/goals",
        }]
      : []),
  ];
  const outcomeLearning = (history?.outcomes || []).slice(0, 5).map(
    (outcome) => ({
      id: outcome.id,
      recommendationTitle:
        history?.recommendations.find(
          (recommendation) =>
            recommendation.requestId === outcome.requestId
        )?.title || "Guidance Counselor recommendation",
      status: outcome.outcomeStatus,
      learning: outcome.memberLearning,
      recordedAt: outcome.recordedAt,
    })
  );
  const careerSections = input.roadmap.sections.filter((section) =>
    ["career-interests", "possible-careers", "required-education"].includes(
      section.id
    )
  );

  return {
    learningBriefing: {
      title: input.mission.missionTitle,
      summary: input.mission.recommendationReason,
      currentGoal: input.mission.currentGoalLabel,
      recentProgress: input.mission.recentProgressLabel,
    },
    diagnostics: {
      status: hasDiagnosticEvidence ? "available" : "not-recorded",
      summary: hasDiagnosticEvidence
        ? "Completed learning work contains strengths or weak-concept evidence that can guide the next diagnostic or lesson."
        : "No saved placement diagnostic is available in the current learning records.",
      evidence: diagnosticEvidence.slice(0, 5),
      limitations: [
        "Confidence intelligence is not a placement diagnostic.",
        "Guidance Counselor will not infer mastery, misconceptions, or prerequisite gaps without saved diagnostic or completed-learning evidence.",
      ],
    },
    goalPlanning: input.goals.slice(0, 4).map((goal) => ({
      id: goal.id,
      title: goal.title,
      target: goal.target,
      progress: goal.progress,
      status: goal.status,
    })),
    learningPriorities: [
      {
        id: "mission",
        title: input.mission.missionTitle,
        reason: input.mission.recommendationReason,
        href: input.mission.primaryAction.href,
      },
      ...input.learningRecommendations.slice(0, 3).map((recommendation) => ({
        id: recommendation.id,
        title: recommendation.title,
        reason: recommendation.reason,
        href: recommendation.actionUrl || "/dashboard/education",
      })),
    ],
    careerGuidance: {
      title: input.workflow.title,
      summary: input.workflow.why,
      areasToVerify: careerSections.flatMap((section) => section.items).slice(0, 5),
      href: input.workflow.href,
    },
    tutorHandoff: {
      ...tutor,
      href:
        input.workflow.action === "tutor"
          ? input.workflow.href
          : "/dashboard/education/tutor",
      boundary:
        "Guidance Counselor chooses and explains the learning objective. Tutor teaches the specific concept and returns learning evidence; Tutor does not own the long-term plan.",
    },
    notifications,
    recommendations,
    outcomeLearning,
  };
}
