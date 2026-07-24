import Link from "next/link";
import { redirect } from "next/navigation";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import { BEAST_LEARNING_VERSION } from "@/lib/appVersion";
import {
  type LearningActivityRunnerRow,
} from "@/lib/learning/activityRunner";
import { getProfileDisplayName } from "@/lib/profile";
import { buildLearningAchievementUnlocks } from "@/lib/learning/achievements";
import { mockLearningCertificates } from "@/lib/learning/certificates";
import { buildLearningIntelligenceSnapshot } from "@/lib/learning/intelligenceEngine";
import { buildLearnerPortfolio } from "@/lib/learning/portfolio";
import BetaFeedbackPanel from "./BetaFeedbackPanel";
import GuidanceCounselorMode from "./GuidanceCounselorMode";
import GuidanceCounselorConversation from "./GuidanceCounselorConversation";
import EducationalCareerRoadmap from "./EducationalCareerRoadmap";
import GuidanceCounselorRecommendation from "./GuidanceCounselorRecommendation";
import GuidanceCounselorOrientation from "./GuidanceCounselorOrientation";
import {
  AchievementEnginePanel,
  AISpecialistsPanel,
  CertificatePreviewPanel,
  LearnerPortfolioPanel,
  ParentDashboardPanel,
  StudyPlannerPanel,
  UploadFoundationPanel,
} from "./LearningFoundationPanels";
import LearningAIOrchestrationPanel from "./LearningAIOrchestrationPanel";
import LearningContentIntelligencePanel from "./LearningContentIntelligencePanel";
import LearningGoalDiscovery from "./LearningGoalDiscovery";
import LearningGoalBuilder from "./LearningGoalBuilder";
import LearningIntelligencePanel from "./LearningIntelligencePanel";
import LearningKnowledgePanel from "./LearningKnowledgePanel";
import LearningMissionControl from "./LearningMissionControl";
import LearningPathTemplates from "./LearningPathTemplates";
import PrivateBetaPanels from "./PrivateBetaPanels";
import { mockParentDashboard } from "@/lib/learning/parentDashboard";
import {
  mockLearningAchievements,
  mockLearningCourses,
  mockLearningGoals,
  mockLearningPlan,
  mockLearningSessions,
  mockStudySessionCommand,
} from "@/lib/learning/mockData";
import { buildLearningProgressSignals } from "@/lib/learning/progressSignals";
import { buildLearningRecommendations } from "@/lib/learning/recommendations";
import { decideAdaptiveProgression } from "@/lib/learning/adaptivePlanner";
import {
  buildMentorHomeMission,
  type MentorHomeMission,
} from "@/lib/learning/mentorHome";
import {
  buildConfidenceIntelligenceSnapshot,
  type ConfidenceIntelligenceSnapshot,
} from "@/lib/learning/confidenceIntelligence";
import {
  buildLearningTimeline,
  buildMentorLearningMemory,
  type LearningTimelineEvent,
  type MentorLearningMemory,
} from "@/lib/learning/learningTimeline";
import {
  buildMeaningfulLearningAchievements,
  buildWeeklyMentorReview,
  type MeaningfulLearningAchievement,
  type WeeklyMentorReview,
} from "@/lib/learning/weeklyMentorReview";
import {
  buildMobileLearningQuickActionCards,
  type MobileLearningQuickActionCard,
} from "@/lib/mobileLearning";
import { buildLearningDashboardContent } from "@/lib/learning/dashboardContent";
import { buildKnowledgeIntelligenceDashboard } from "@/lib/learning/knowledgeDashboard";
import { buildLearningMissionControl } from "@/lib/learning/missionControl";
import { buildMentorInsights } from "@/lib/learning/mentorInsights";
import { learningSpecialists } from "@/lib/learning/specialists";
import { mockStudyPlanner } from "@/lib/learning/studyPlanner";
import { learningPathTemplates } from "@/lib/learning/templates";
import { mockLearningUploads } from "@/lib/learning/uploads";
import { buildAIOrchestrationDashboard } from "@/lib/learning/aiOrchestrationDashboard";
import { loadLearningPrivateBetaData } from "@/lib/learning/persistence";
import { buildLifelongEducationRoadmap } from "@/lib/education/lifelongRoadmap";
import { educationProfileDraftFromRow } from "@/lib/education/profilePersistence";
import { guidanceDiscoveryProfileFromRow } from "@/lib/education/discoveryConversation";
import { buildGuidanceWorkflowRecommendation } from "@/lib/education/guidanceWorkflow";
import { learningAccessActions } from "@/lib/education/contextualActions";
import { createRouteClient } from "@/lib/supabase/server";
import type {
  LearningAchievement,
  LearningCertificate,
  LearningCourse,
  LearningGoal,
  LearningPlan,
  LearningRecommendation,
  LearningSession,
  ParentDashboard,
  StudySessionCommand,
} from "@/lib/learning/types";

const demoModeEnabled =
  process.env.NODE_ENV !== "production" &&
  process.env.BEASTLEARNING_DEMO_MODE === "true";

export const dynamic = "force-dynamic";

const emptyParentDashboard: ParentDashboard = {
  householdName: "Parent support",
  learners: [],
};

function normalizeStatus<T extends string>(value: unknown, allowed: readonly T[], fallback: T) {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function formatScheduledSession(value: unknown) {
  if (typeof value !== "string" || !value) return "Unscheduled";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unscheduled";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatDuration(value: unknown) {
  const minutes = Number(value || 0);
  return minutes > 0 ? `${minutes} min` : "0 min";
}

function mapGoalRow(row: Record<string, unknown>): LearningGoal {
  return {
    id: String(row.id),
    learnerId: String(row.learner_profile_id || "current"),
    title: String(row.title || "Learning goal"),
    category: String(row.category || "Learning"),
    target: String(row.target || "Build a clear learning path."),
    progress: Number(row.progress || 0),
    status: normalizeStatus(
      row.status,
      ["Active", "Planned", "Paused", "Completed"] as const,
      "Active"
    ),
    priority: normalizeStatus(row.priority, ["High", "Medium", "Low"] as const, "Medium"),
  };
}

function mapCourseRow(row: Record<string, unknown>): LearningCourse {
  return {
    id: String(row.id),
    title: String(row.title || "Learning course"),
    category: String(row.subject || "Learning"),
    progress: Number(row.progress || 0),
    estimatedCompletion: "Starter path",
    status: normalizeStatus(
      row.status,
      ["In progress", "Planned", "Queued", "Completed"] as const,
      "In progress"
    ),
    priority: "High",
  };
}

function mapPlanRow(row: Record<string, unknown>, learnerId: string): LearningPlan {
  return {
    id: String(row.id),
    learnerId,
    title: String(row.title || "Starter learning path"),
    summary: String(row.summary || "Your learning plan is ready for the next step."),
    primaryGoalId: typeof row.goal_id === "string" ? row.goal_id : undefined,
    weeklySessionTarget: Number(row.weekly_session_target || 0),
  };
}

type LearningPathActivityRow = LearningActivityRunnerRow & {
  course_id?: string | null;
};

function mapSessionRow(row: Record<string, unknown>): LearningSession {
  return {
    id: String(row.id),
    learnerId: String(row.learner_profile_id || "current"),
    title: String(row.title || "Learning session"),
    courseTitle: String(row.course_title || "BeastEducation"),
    when: formatScheduledSession(row.scheduled_for),
    duration: formatDuration(row.duration_minutes),
    status: normalizeStatus(
      row.status,
      ["Scheduled", "In progress", "Completed", "Skipped"] as const,
      "Scheduled"
    ),
  };
}

function mapAchievementRow(row: Record<string, unknown>): LearningAchievement {
  return {
    id: String(row.id),
    learnerId: String(row.learner_profile_id || "current"),
    title: String(row.title || "Learning achievement"),
    detail: String(row.detail || "Achievement detail"),
    earned: Boolean(row.earned),
    earnedAt: typeof row.earned_at === "string" ? row.earned_at : undefined,
  };
}

function mapCertificateRow(row: Record<string, unknown>): LearningCertificate {
  const pathName = String(row.path_name || "Learning path");
  const completionDate = String(row.completion_date || "");
  const certificateId = String(row.certificate_id || "");

  return {
    id: String(row.id),
    learnerName: String(row.learner_name || "Learner"),
    pathName,
    completionDate,
    certificateId,
    certificateTitle: "Beast Academy Certificate",
    skillsDemonstrated: Array.isArray(row.skills_demonstrated)
      ? row.skills_demonstrated.map(String)
      : ["Learning path completion"],
    completionRecordId: String(
      row.completion_record_id || `completion-${certificateId || String(row.id)}`
    ),
    portfolioEntryId: String(
      row.portfolio_entry_id || `portfolio-${certificateId || String(row.id)}`
    ),
    language:
      "Beast Academy Certificate of completion for an internal BeastEducation path. This is non-accredited and does not represent institutional credit.",
    verificationPlaceholder:
      "Certificate ownership, demonstrated skills, and completion details are verified before download.",
  };
}

function buildStudySessionCommandFromSession(
  session: LearningSession | undefined
): StudySessionCommand {
  return {
    id: session ? `${session.id}-command` : "starter-learning-command",
    sessionId: session?.id || "starter-learning-session",
    currentFocus: session?.title || "Your Guidance Counselor is choosing a starting point",
    estimatedTime: session?.duration || "0 min",
    warmUpPrompt: session
      ? "Write down what you already know before starting this session."
      : "Tell your Guidance Counselor what you want to learn first.",
    guidedPracticeStep: session
      ? "Work through the next focused practice step for this session."
      : "Your Guidance Counselor will help turn that goal into a first lesson.",
    reflectionCheckpoint: session
      ? "Capture one thing that clicked and one thing to review next."
      : "After your first lesson, your Tutor will ask what clicked and what still feels unclear.",
    progressFeedback: session
      ? "Nice work. Your Guidance Counselor has what it needs to choose the next step."
      : "Your first saved lesson will appear here.",
  };
}

function GuidanceCounselorHome({
  mission,
  confidence,
  memory,
  learningGoals,
  learningRecommendations,
}: {
  mission: MentorHomeMission;
  confidence: ConfidenceIntelligenceSnapshot;
  memory: MentorLearningMemory;
  learningGoals: LearningGoal[];
  learningRecommendations: LearningRecommendation[];
}) {
  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Counselor context"
        title="What is shaping your guidance"
        description="Open this supporting evidence only when you want to understand the context behind the Counselor’s direction."
        action={<LearningGoalDiscovery recentGoals={learningGoals} />}
      />
      <div
        className="mt-5 grid gap-4 lg:grid-cols-2"
        aria-label="Guidance Counselor supporting context"
      >
        <div className="rounded-2xl border border-[#2a3242] bg-[#111827] p-4">
          <p className="text-xs font-black uppercase text-[#7f8da3]">
            Why this mission
          </p>
          <p className="mt-3 text-sm leading-6 text-[#c7cfdb]">
            {mission.recommendationReason}
          </p>
          <p className="mt-3 text-xs font-bold uppercase text-indigo-100">
            Data boundary
          </p>
          <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">
            {mission.hasSufficientLearnerData
              ? "This direction comes from learning work already in progress."
              : "We are starting fresh, so the Counselor will use conversation to find the right level."}
          </p>
          <div className="mt-4 grid gap-2 text-sm text-[#aeb8c7]">
            <p>{memory.lastDone}</p>
            <p>{memory.struggledWith}</p>
            <p>{memory.unfinished}</p>
            <p>{memory.reviewDue}</p>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-2xl border border-[#2a3242] bg-[#111827] p-4">
            <p className="text-xs font-black uppercase text-[#7f8da3]">
              Confidence intelligence
            </p>
            <div className="mt-3 grid gap-2">
              {confidence.dimensions.map((signal) => (
                <p key={signal.id} className="text-sm text-[#c7cfdb]">
                  <span className="font-black text-white">{signal.label}:</span>{" "}
                  {signal.learnerLanguage}
                </p>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-[#2a3242] bg-[#111827] p-4">
            <p className="text-xs font-black uppercase text-[#7f8da3]">
              Other useful recommendations
            </p>
            <div className="mt-3 grid gap-2 text-sm text-[#c7cfdb]">
              {learningRecommendations.slice(0, 3).map((recommendation) => (
                <div key={recommendation.id}>
                  <p>{recommendation.title}</p>
                  <Link
                    href="#mentor-session"
                    className="mt-1 inline-flex text-xs font-black uppercase tracking-wide text-indigo-200"
                  >
                    Discuss next step
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs font-black uppercase text-[#7f8da3]">
              Related actions
            </p>
            <Link
              href="/dashboard/education/goals"
              className="beast-button-secondary mt-3 inline-flex"
            >
              Learning Goals
            </Link>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function WeeklyGuidanceReviewPanel({
  review,
  achievements,
}: {
  review: WeeklyMentorReview;
  achievements: MeaningfulLearningAchievement[];
}) {
  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Guidance Review"
        title={review.title}
        description={review.summary}
        action={<ModuleBadge module="learning" label={review.missingData ? "Needs evidence" : "Review ready"} />}
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="grid gap-3">
          {[
            ["Sessions", review.sessionsCompleted],
            ["Study time", review.studyTime],
            ["Goal progress", review.currentGoalProgress],
            ["Confidence", review.confidenceDirection],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                {label}
              </div>
              <p className="mt-2 text-sm font-semibold leading-6 text-white">
                {value}
              </p>
            </div>
          ))}
        </section>
        <section className="grid gap-3">
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <h3 className="font-black text-white">Next week</h3>
            <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
              {review.nextWeekRecommendation}
            </p>
            <Link
              href="#mentor-session"
              className="beast-button-secondary mt-4 inline-flex w-full justify-center sm:w-fit"
            >
              Plan next week
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <h3 className="font-black text-white">Strengths</h3>
              <ul className="mt-2 grid gap-2 text-sm leading-6 text-[#c7cfdb]">
                {review.strengths.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <h3 className="font-black text-white">Weak areas</h3>
              <ul className="mt-2 grid gap-2 text-sm leading-6 text-[#c7cfdb]">
                {review.weakAreas.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link
                href="/dashboard/education/reviews"
                className="mt-3 inline-flex text-sm font-black text-indigo-200 hover:text-white"
              >
                Review weak areas
              </Link>
            </div>
          </div>
        </section>
      </div>
      <div className="mt-5 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
        <h3 className="font-black text-white">Meaningful achievements</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="rounded-lg border border-green-300/25 bg-green-300/10 p-3">
              <div className="text-sm font-black text-white">{achievement.title}</div>
              <p className="mt-1 text-sm leading-6 text-green-50">
                {achievement.message}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase text-green-100">
                {achievement.basis}
              </p>
            </div>
          ))}
          {achievements.length === 0 ? (
            <p className="text-sm font-semibold leading-6 text-[#c7cfdb]">
              No meaningful achievement is being awarded yet. Your Guidance Counselor will wait for real outcomes, not clicks.
            </p>
          ) : null}
        </div>
      </div>
    </DashboardCard>
  );
}

function MobileLearningQuickActions({
  cards,
}: {
  cards: MobileLearningQuickActionCard[];
}) {
  return (
    <section
      className="grid min-w-0 gap-3 md:hidden"
      aria-label="Mobile Learning quick actions"
      data-mobile-learning-actions="true"
    >
      {cards.map((card) => (
        <article
          key={card.id}
          className="min-w-0 rounded-xl border border-indigo-300/30 bg-[#111827] p-4"
          data-mobile-learning-card={card.id}
          data-mobile-learning-source={card.source}
          data-mobile-source-contract={card.dispatchMode}
        >
          <div className="flex min-w-0 flex-col gap-2">
            <div className="text-xs font-black uppercase text-indigo-100">
              {card.metadata[0] || "Guidance Counselor"}
            </div>
            <h2 className="break-words text-lg font-black leading-snug text-white">
              {card.title}
            </h2>
            <p className="break-words text-sm font-semibold leading-6 text-[#c7cfdb]">
              {card.summary}
            </p>
          </div>
          <div className="mt-3 flex min-w-0 flex-wrap gap-2">
            {card.metadata.slice(1).map((item) => (
              <span
                key={item}
                className="max-w-full break-words rounded-full border border-[#2a3242] bg-[#0f1419] px-3 py-1 text-xs font-bold text-[#dbe3ef]"
              >
                {item}
              </span>
            ))}
          </div>
          <Link href={card.href} className="beast-button mt-4 w-full justify-center">
            {card.actionLabel}
          </Link>
        </article>
      ))}
    </section>
  );
}

export default async function LearningPage() {
  const supabase = createRouteClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const [
    profileResult,
    learnerProfilesResult,
    goalsResult,
    coursesResult,
    plansResult,
    sessionsResult,
    activitiesResult,
    achievementsResult,
    certificatesResult,
    educationProfileResult,
  ] = await Promise.all([
    supabase.from("profiles").select("preferred_name, display_name, full_name, username, role").eq("id", user.id).maybeSingle(),
    supabase
      .from("learning_profiles")
      .select("id, display_name, learner_role, focus")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("learning_goals")
      .select("id, learner_profile_id, title, category, target, priority, status, progress")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("learning_courses")
      .select("id, title, subject, status, progress")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("learning_plans")
      .select("id, learner_profile_id, goal_id, title, summary, weekly_session_target")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("learning_sessions")
      .select("id, learner_profile_id, title, course_title, scheduled_for, duration_minutes, status")
      .eq("user_id", user.id)
      .order("scheduled_for", { ascending: true }),
    supabase
      .from("learning_activities")
      .select("id, course_id, activity_type, title, difficulty, estimated_minutes, xp, status, completed_at, sort_order, created_at, session_state, session_recap, session_strengths, session_weak_concepts, session_next_recommendation, reflection_option, reflection_note, reflection_confidence_adjustment, reflection_next_action")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("learning_achievements")
      .select("id, learner_profile_id, title, detail, earned, earned_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("learning_certificates")
      .select("id, learner_name, path_name, completion_date, certificate_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("education_profiles")
      .select("owner_id, goal_kind, goal, current_situation, background, strengths, growth_areas, constraints, weekly_hours, discovery_answers, selected_providers, career_interests, educational_goals, learning_preferences, certifications, available_study_time_known, college_interest, trade_interest, current_employment, military_experience, other_educational_context, updated_at")
      .eq("owner_id", user.id)
      .maybeSingle(),
  ]);

  const learnerProfileRows = (learnerProfilesResult.data || []) as Record<string, unknown>[];
  const primaryLearnerRow = learnerProfileRows[0];
  const profileRow = (profileResult.data || {}) as Record<string, unknown>;
  const isAdmin = profileRow.role === "admin";
  const fallbackName = getProfileDisplayName(
    profileResult.data as Parameters<typeof getProfileDisplayName>[0],
    user
  );
  const activeLearner = primaryLearnerRow
    ? {
        id: String(primaryLearnerRow.id),
        name: fallbackName,
        role: String(primaryLearnerRow.learner_role || "Learner"),
        focus: String(primaryLearnerRow.focus || "Learning path"),
        active: true,
      }
    : {
        id: "current",
        name: fallbackName,
        role: "Learner",
        focus: "Your Guidance Counselor will learn what helps you best.",
        active: true,
      };
  const userGoals = ((goalsResult.data || []) as Record<string, unknown>[]).map(mapGoalRow);
  const userCourses = ((coursesResult.data || []) as Record<string, unknown>[]).map(mapCourseRow);
  const userSessions = ((sessionsResult.data || []) as Record<string, unknown>[]).map(mapSessionRow);
  const userActivities = (activitiesResult.data || []) as LearningPathActivityRow[];
  const userAchievements = ((achievementsResult.data || []) as Record<string, unknown>[]).map(mapAchievementRow);
  const educationProfile = educationProfileDraftFromRow(
    educationProfileResult.data as Record<string, unknown> | null
  );
  const guidanceDiscoveryProfile = guidanceDiscoveryProfileFromRow(
    educationProfileResult.data as Record<string, unknown> | null
  );
  const userCertificates = ((certificatesResult.data || []) as Record<string, unknown>[]).map(mapCertificateRow);
  const planRows = (plansResult.data || []) as Record<string, unknown>[];
  const activeGoal = userGoals.find((goal) => goal.status === "Active") || userGoals[0];
  const activePlanRow =
    planRows.find((plan) => plan.goal_id === activeGoal?.id) || planRows[0];
  const userPlan = activePlanRow
    ? mapPlanRow(activePlanRow, activeLearner.id)
    : {
        id: "starter-learning-path",
        learnerId: activeLearner.id,
        title: activeGoal?.title || "Starter learning path",
        summary: activeGoal?.target || "Your Guidance Counselor will help you choose a first goal.",
        primaryGoalId: activeGoal?.id,
        weeklySessionTarget: 0,
      };
  const userStudySession = buildStudySessionCommandFromSession(
    userSessions.find((session) => session.status !== "Completed") || userSessions[0]
  );
  const learningGoals =
    demoModeEnabled && userGoals.length === 0 ? mockLearningGoals : userGoals;
  const learningCourses =
    demoModeEnabled && userGoals.length === 0 ? mockLearningCourses : userCourses;
  const learningPlan =
    demoModeEnabled && userGoals.length === 0 ? mockLearningPlan : userPlan;
  const learningSessions =
    demoModeEnabled && userGoals.length === 0 ? mockLearningSessions : userSessions;
  const learningAchievements =
    demoModeEnabled && userGoals.length === 0 ? mockLearningAchievements : userAchievements;
  const learningCertificates =
    demoModeEnabled && userGoals.length === 0 ? mockLearningCertificates : userCertificates;
  const parentDashboard =
    demoModeEnabled && userGoals.length === 0 ? mockParentDashboard : emptyParentDashboard;
  const studySession =
    demoModeEnabled && userGoals.length === 0 ? mockStudySessionCommand : userStudySession;
  const privateBeta = await loadLearningPrivateBetaData({
    supabase,
    userId: user.id,
    learnerName: activeLearner.name,
    goals: learningGoals,
    sessions: learningSessions,
    certificates: learningCertificates,
  });
  const progressSignals = buildLearningProgressSignals({
    goals: learningGoals,
    courses: learningCourses,
    plan: learningPlan,
    sessions: learningSessions,
    achievements: learningAchievements,
    studySession,
  });
  const learningRecommendations: LearningRecommendation[] =
    buildLearningRecommendations({
      progress: progressSignals,
      currentPlanTitle: learningPlan.title,
      activeGoalsCount: progressSignals.activeGoalsCount,
      currentFocus: studySession.currentFocus,
    });
  const learningIntelligence = buildLearningIntelligenceSnapshot({
    goals: learningGoals,
    weeklyStudyMinutes: progressSignals.estimatedWeeklyStudyMinutes,
  });
  const aiOrchestration = buildAIOrchestrationDashboard({
    learnerName: activeLearner.name || "Learner",
    mastery: learningIntelligence.mastery,
  });
  const learningDashboardContent = buildLearningDashboardContent();
  const knowledgeDashboard = buildKnowledgeIntelligenceDashboard();
  const achievementUnlocks = buildLearningAchievementUnlocks({
    progress: progressSignals,
    goalsCreated: learningGoals.length,
    goalsCompleted: learningGoals.filter((goal) => goal.status === "Completed")
      .length,
    masteredSkills: 0,
    foundingStudent: learningGoals.length > 0,
  });
  const learnerPortfolio = buildLearnerPortfolio({
    learnerName: activeLearner.name || "Learner",
    goals: learningGoals,
    progress: progressSignals,
    certificates: learningCertificates,
    achievementCount: achievementUnlocks.filter((achievement) => achievement.unlocked)
      .length,
  });
  const confidenceIntelligence = buildConfidenceIntelligenceSnapshot({
    activities: userActivities,
    courses: learningCourses,
    sessions: learningSessions,
  });
  const learningTimeline = buildLearningTimeline({
    activities: userActivities,
    sessions: learningSessions,
    goals: learningGoals,
    recommendations: learningRecommendations,
  });
  const mentorLearningMemory = buildMentorLearningMemory({
    activities: userActivities,
    sessions: learningSessions,
    goals: learningGoals,
    recommendations: learningRecommendations,
  });
  const adaptiveProgression = decideAdaptiveProgression({
    goals: learningGoals,
    mastery: learningIntelligence.mastery,
    weakness: learningIntelligence.weakness,
    memory: learningIntelligence.memory,
    availableStudyMinutes: progressSignals.estimatedWeeklyStudyMinutes,
    learningPace: learningIntelligence.memory.learningPace,
    courses: learningCourses,
    sessions: learningSessions,
    activities: userActivities,
    confidence: confidenceIntelligence,
    timeline: learningTimeline,
  });
  const mentorHomeMission = buildMentorHomeMission({
    learnerName: activeLearner.name,
    learningGoals,
    learningCourses,
    learningSessions,
    learningActivities: userActivities,
    learningRecommendations,
    progressSignals,
    adaptiveProgression,
  });
  const meaningfulAchievements = buildMeaningfulLearningAchievements({
    activities: userActivities,
    courses: learningCourses,
  });
  const weeklyMentorReview = buildWeeklyMentorReview({
    activities: userActivities,
    sessions: learningSessions,
    goals: learningGoals,
    courses: learningCourses,
    confidence: confidenceIntelligence,
  });
  const mobileLearningCards = buildMobileLearningQuickActionCards({
    mission: mentorHomeMission,
    confidence: confidenceIntelligence,
    review: weeklyMentorReview,
    activities: userActivities,
  });
  const missionControl = buildLearningMissionControl({
    mission: mentorHomeMission,
    progress: progressSignals,
    weekly: weeklyMentorReview,
    courses: learningCourses,
    activities: userActivities,
    timeline: learningTimeline,
    achievements: meaningfulAchievements,
    confidence: confidenceIntelligence,
  });
  const mentorInsights = buildMentorInsights(
    {
      attempts: userActivities
        .filter((activity) => activity.status === "Completed")
        .map((activity) => ({
          id: activity.id,
          title: activity.title,
          completedAt:
            activity.completed_at ||
            activity.created_at ||
            new Date().toISOString(),
          strengths: activity.session_strengths || [],
          weakConcepts: activity.session_weak_concepts || [],
          reviewDue: activity.session_state === "review_due",
        })),
    },
    user.id
  );
  const lifelongRoadmap = buildLifelongEducationRoadmap({
    currentGrade: undefined,
    academicProgressPercent: progressSignals.progressPercentage,
    completedSessions: progressSignals.sessionsCompleted,
    careerInterests: [activeLearner.focus, educationProfile.goal].filter(Boolean),
    activeGoal: learningGoals[0]?.title || educationProfile.goal,
    goalCategory: learningGoals[0]?.category,
    planSummary: learningPlan.summary,
    currentCourses: learningCourses.map((course) => course.title),
    earnedCertifications: learningCertificates.map(
      (certificate) => certificate.pathName
    ),
  });
  const guidanceWorkflowRecommendation = buildGuidanceWorkflowRecommendation({
    memberName: fallbackName || "there",
    profile: guidanceDiscoveryProfile,
    hasSavedGoal: userGoals.length > 0,
    hasSavedPlan: planRows.length > 0,
    activeCourseCount: learningCourses.filter(
      (course) => course.status !== "Completed"
    ).length,
    openSessionCount: learningSessions.filter(
      (session) => session.status !== "Completed"
    ).length,
  });

  return (
    <main id="learning-main-content" className="beast-page">
      <a href="#mentor-session" className="beast-skip-link">
        Skip to Guidance Counselor
      </a>
      <div className="beast-container space-y-8 sm:space-y-10">
        <section className="beast-page-header overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-300/[0.08] via-[#111722] to-[#0e141e] p-5 shadow-[0_18px_55px_rgba(0,0,0,0.18)] sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-4xl space-y-4">
              <ModuleBadge module="learning" label={`BeastEducation ${BEAST_LEARNING_VERSION}`} />
              <h1 className="beast-title">
                Hi {fallbackName || "there"}. Welcome to your Guidance Counselor’s office.
              </h1>
              <p className="beast-subtitle">
                We’ll begin with what matters to you, keep your goals and roadmap
                connected, and leave you with one clear next step.
              </p>
            </div>
            <Link
              href="/dashboard/today"
              className="w-full rounded-xl border border-indigo-300/40 bg-indigo-300/10 px-4 py-3 text-center text-sm font-black text-indigo-100 transition hover:bg-indigo-300/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300 motion-reduce:transition-none sm:w-fit"
            >
              Back to Today
            </Link>
          </div>
        </section>

        <section
          aria-label="Your Guidance Counselor relationship"
          className="space-y-6 sm:space-y-8"
          data-guidance-primary-flow="true"
        >
          <GuidanceCounselorOrientation
            memberName={fallbackName || "Member"}
            memberFocus={activeLearner.focus}
            direction={
              learningGoals[0]?.title ||
              educationProfile.goal ||
              "We’ll define your educational direction together."
            }
            nextStep={missionControl.mission.missionTitle}
          />

          <GuidanceCounselorConversation
            memberId={user.id}
            memberName={fallbackName || "there"}
            initialProfile={guidanceDiscoveryProfile}
            context={{
              educationalGoal:
                learningGoals[0]?.title ||
                educationProfile.goal ||
                "Define a long-term educational goal together.",
              interests:
                educationProfile.strengths ||
                activeLearner.focus ||
                "Explore the subjects, problems, and environments that fit you.",
              careerDirection:
                educationProfile.goal ||
                learningGoals[0]?.category ||
                "No career direction has been confirmed yet.",
              roadmap:
                educationProfile.currentSituation || learningPlan.summary,
            }}
          />

          <GuidanceCounselorRecommendation
            mission={missionControl.mission}
            roadmap={lifelongRoadmap}
            learnerName={fallbackName || "there"}
            nextAction={guidanceWorkflowRecommendation}
          />
        </section>

        <section
          aria-labelledby="education-supporting-workspace-title"
          className="space-y-8 border-t border-white/10 pt-10 sm:space-y-10 sm:pt-14"
          data-guidance-supporting-workspace="true"
        >
          <div className="max-w-3xl">
            <p className="beast-kicker">Everything else</p>
            <h2
              id="education-supporting-workspace-title"
              className="mt-3 text-2xl font-black tracking-tight text-white sm:text-3xl"
            >
              Your planning workspace, when you need it
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#aeb8c7] sm:text-base">
              The conversation sets the direction. Your detailed roadmap, goals,
              courses, reviews, records, and progress tools support that work below.
            </p>
          </div>

          <EducationalCareerRoadmap roadmap={lifelongRoadmap} />
          <MobileLearningQuickActions cards={mobileLearningCards} />
          <details className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
            <summary className="cursor-pointer text-sm font-black text-indigo-100 sm:text-base">
              Open detailed learning progress
            </summary>
            <div className="mt-6">
              <LearningMissionControl
                model={missionControl}
                insights={mentorInsights}
                showCurrentMission={false}
                showWeeklyProgress={false}
                showAchievements={false}
              />
            </div>
          </details>
          <details
            id="guidance"
            className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
          >
            <summary className="cursor-pointer text-sm font-black text-indigo-100 sm:text-base">
              Open the context behind your guidance
            </summary>
            <div className="mt-6">
              <GuidanceCounselorHome
                mission={mentorHomeMission}
                confidence={confidenceIntelligence}
                memory={mentorLearningMemory}
                learningGoals={learningGoals}
                learningRecommendations={learningRecommendations}
              />
            </div>
          </details>

        <section id="learning-access" className="grid scroll-mt-24 gap-4 xl:grid-cols-[1fr_0.9fr]">
          <DashboardCard accent="blue">
            <SectionHeader
              eyebrow="Learning access"
              title="Everything else stays available"
              description="The Guidance Counselor leads the next action, while courses, goals, study planning, review tools, and records remain close by."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["goals", "Learning Goals", "Create, update, and organize your education goals."],
                ["study-plan", "Study Plan", "Open your detailed study plan and schedule."],
                ["courses", "Learning Paths", "Review courses and learning paths connected to your roadmap."],
                ["flashcards", "Review", "Open focused review and practice tools."],
                ["achievements", "Achievements", "Review the milestones and wins you have earned."],
                ["certificate-access", "Certificates", "Open certificate records and available downloads."],
              ].map(([id, title, detail]) => {
                const action =
                  learningAccessActions[
                    id as keyof typeof learningAccessActions
                  ];
                return (
                  <div
                    key={id}
                    id={id}
                    className="scroll-mt-24 rounded-2xl border border-[#2a3242] bg-gradient-to-br from-[#111827] to-[#0e141e] p-4 transition duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-indigo-300/25 motion-reduce:transition-none"
                  >
                    <h3 className="font-black text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                      {detail}
                    </p>
                    {id === "goals" ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <LearningGoalDiscovery
                          recentGoals={learningGoals}
                          triggerLabel="Add Learning Goal"
                        />
                        <Link
                          href="/dashboard/education/goals"
                          className="beast-button-secondary"
                        >
                          Manage Goals
                        </Link>
                      </div>
                    ) : null}
                    {id !== "goals" ? (
                      <Link
                        href={action.href}
                        className="beast-button-secondary mt-3 inline-flex w-full justify-center sm:w-fit"
                      >
                        {action.label}
                      </Link>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </DashboardCard>
        </section>

        <section id="weekly-review" className="scroll-mt-24">
          <WeeklyGuidanceReviewPanel
            review={weeklyMentorReview}
            achievements={meaningfulAchievements}
          />
        </section>

        <section id="wins" className="grid scroll-mt-24 gap-4 xl:grid-cols-[1fr_0.9fr]">
          <DashboardCard accent="green">
            <SectionHeader
              eyebrow="Wins"
              title="Wins worth noticing"
              description="Your Guidance Counselor notices effort, consistency, mastery, and meaningful milestones along the way."
            />
            <div className="mt-5 grid gap-3">
              {learningAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`rounded-xl border p-4 ${
                    achievement.earned
                      ? "border-green-400/35 bg-green-400/10"
                      : "border-[#2a3242] bg-[#111827]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black text-white">{achievement.title}</h3>
                      <p className="mt-1 text-sm text-[#c7cfdb]">
                        {achievement.detail}
                      </p>
                    </div>
                    <span className="rounded-full border border-[#2a3242] bg-[#0f1419] px-2 py-1 text-xs font-bold text-[#dbe3ef]">
                      {achievement.earned ? "You earned this" : "Growing toward this"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </section>

        <section id="certificates" className="grid scroll-mt-24 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <CertificatePreviewPanel certificates={learningCertificates} />
          <LearnerPortfolioPanel portfolio={learnerPortfolio} />
        </section>

        {isAdmin ? (
          <section className="grid gap-6 rounded-2xl border border-yellow-300/30 bg-yellow-300/5 p-4">
            <SectionHeader
              eyebrow="Admin"
              title="Learning operations"
              description="Protected administrator tooling for review, diagnostics, orchestration, content, and planning."
            />

            <PrivateBetaPanels beta={privateBeta} />
            <LearningAIOrchestrationPanel orchestration={aiOrchestration} />
            <LearningIntelligencePanel snapshot={learningIntelligence} />
            <LearningKnowledgePanel knowledge={knowledgeDashboard} />
            <LearningContentIntelligencePanel content={learningDashboardContent} />
            <LearningGoalBuilder />
            <GuidanceCounselorMode />
            <LearningPathTemplates templates={learningPathTemplates} />
            <AchievementEnginePanel achievements={achievementUnlocks} />
            {parentDashboard.learners.length > 0 ? (
              <ParentDashboardPanel dashboard={parentDashboard} />
            ) : null}
            {demoModeEnabled ? <StudyPlannerPanel planner={mockStudyPlanner} /> : null}
            {demoModeEnabled ? <UploadFoundationPanel uploads={mockLearningUploads} /> : null}
            <AISpecialistsPanel specialists={learningSpecialists} />
            <BetaFeedbackPanel />
          </section>
        ) : null}
        </section>
      </div>
    </main>
  );
}
