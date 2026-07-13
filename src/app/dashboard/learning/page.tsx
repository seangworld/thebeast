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
import LearningGoalBuilder from "./LearningGoalBuilder";
import LearningIntelligencePanel from "./LearningIntelligencePanel";
import LearningKnowledgePanel from "./LearningKnowledgePanel";
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
import {
  buildMentorHomeMission,
  type MentorHomeMission,
} from "@/lib/learning/mentorHome";
import { buildLearningDashboardContent } from "@/lib/learning/dashboardContent";
import { buildKnowledgeIntelligenceDashboard } from "@/lib/learning/knowledgeDashboard";
import { learningSpecialists } from "@/lib/learning/specialists";
import { mockStudyPlanner } from "@/lib/learning/studyPlanner";
import { learningPathTemplates } from "@/lib/learning/templates";
import { mockLearningUploads } from "@/lib/learning/uploads";
import { buildAIOrchestrationDashboard } from "@/lib/learning/aiOrchestrationDashboard";
import { loadLearningPrivateBetaData } from "@/lib/learning/persistence";
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
    courseTitle: String(row.course_title || "BeastLearning"),
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
      "Beast Academy Certificate of completion for an internal BeastLearning path. This is non-accredited and does not represent institutional credit.",
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
    currentFocus: session?.title || "Your Mentor is choosing a starting point",
    estimatedTime: session?.duration || "0 min",
    warmUpPrompt: session
      ? "Write down what you already know before starting this session."
      : "Tell your Mentor what you want to learn first.",
    guidedPracticeStep: session
      ? "Work through the next focused practice step for this session."
      : "Your Mentor will help turn that goal into a first lesson.",
    reflectionCheckpoint: session
      ? "Capture one thing that clicked and one thing to review next."
      : "After your first lesson, your Tutor will ask what clicked and what still feels unclear.",
    progressFeedback: session
      ? "Nice work. Your Mentor has what it needs to choose the next step."
      : "Your first saved lesson will appear here.",
  };
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="mt-3 h-2 rounded-full bg-[#0f1419]">
      <div
        className="h-full rounded-full bg-[#818cf8]"
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

function MentorHome({
  mission,
  learningReadinessSignals,
  learningPlan,
  learningGoals,
  learningCourses,
  learningRecommendations,
}: {
  mission: MentorHomeMission;
  learningReadinessSignals: { label: string; value: string }[];
  learningPlan: LearningPlan;
  learningGoals: LearningGoal[];
  learningCourses: LearningCourse[];
  learningRecommendations: LearningRecommendation[];
}) {
  const activeRole =
    mission.state === "next_activity" || mission.state === "resume"
      ? "Mentor with Tutor ready"
      : "Mentor";
  const roadmapPreview = learningCourses.slice(0, 3);
  const visibleRecommendations = learningRecommendations.slice(0, 3);

  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Mentor Home"
        title="One mission, chosen by your Mentor"
        description="Start here for the next best action. Courses, certificates, and history stay available, but the Mentor leads the learning path."
        action={<ModuleBadge module="learning" label={activeRole} />}
      />

      <div id="mentor-session" className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <section
          className="grid content-between gap-5 rounded-2xl border border-indigo-300/35 bg-[#0b1020] p-4 sm:p-6"
          aria-label="BeastLearning Mentor home mission"
        >
          <div className="grid gap-4">
            <div className="rounded-2xl border border-indigo-300/30 bg-indigo-300/10 p-4 sm:p-5">
              <div className="text-xs font-black uppercase text-indigo-100">
                Mentor
              </div>
              <h3 className="mt-2 text-xl font-black text-white">
                {mission.greeting}
              </h3>
              <p className="mt-2 text-sm leading-6 text-indigo-50">
                {mission.recommendationReason}
              </p>
            </div>

            <div className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-black uppercase text-cyan-100">
                    {mission.missionLabel}
                  </div>
                  <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
                    {mission.missionTitle}
                  </h2>
                </div>
                <div className="w-fit rounded-xl border border-cyan-200/30 bg-[#0f1419]/80 px-3 py-2 text-sm font-black text-cyan-50">
                  {mission.durationLabel}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-cyan-200/25 bg-[#0f1419]/80 p-3">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Current goal
                  </div>
                  <div className="mt-1 text-sm font-black text-white">
                    {mission.currentGoalLabel}
                  </div>
                </div>
                <div className="rounded-xl border border-cyan-200/25 bg-[#0f1419]/80 p-3">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Weak area
                  </div>
                  <div className="mt-1 text-sm font-black text-white">
                    {mission.weakAreaLabel}
                  </div>
                </div>
                <div className="rounded-xl border border-cyan-200/25 bg-[#0f1419]/80 p-3">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Last session
                  </div>
                  <div className="mt-1 text-sm font-black text-white">
                    {mission.recentProgressLabel}
                  </div>
                </div>
                <div className="rounded-xl border border-cyan-200/25 bg-[#0f1419]/80 p-3">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Comes after this
                  </div>
                  <div className="mt-1 text-sm font-black text-white">
                    {mission.nextAfterLabel}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <Link href={mission.primaryAction.href} className="beast-button w-fit">
                  {mission.primaryAction.label}
                </Link>
                <p className="text-sm font-semibold leading-5 text-cyan-50">
                  {mission.primaryAction.detail}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 border-t border-[#2a3242] pt-4 sm:grid-cols-2 lg:grid-cols-4">
            {mission.secondaryActions.map((action) => (
              <Link key={action.label} href={action.href} className="beast-button-secondary">
                {action.label}
              </Link>
            ))}
          </div>
        </section>

        <aside className="grid content-start gap-3">
          <div className="rounded-2xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-black uppercase text-[#7f8da3]">
              Why this mission
            </div>
            <p className="mt-3 text-sm leading-6 text-[#c7cfdb]">
              {mission.recommendationReason}
            </p>
            <div className="mt-3 rounded-xl border border-[#2a3242] bg-[#0f1419] p-3">
              <div className="text-xs font-bold uppercase text-indigo-100">
                Data boundary
              </div>
              <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">
                {mission.hasSufficientLearnerData
                  ? "This recommendation is based on existing BeastLearning goals, sessions, courses, or activities."
                  : "This is a guided first-use state because no learning history is available yet."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {[
              ["Goal", mission.currentGoalLabel],
              ["Mission", mission.missionTitle],
              ["Time", mission.durationLabel],
              ["Next", mission.nextAfterLabel],
            ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
            >
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                {label}
              </div>
              <div className="mt-2 text-sm font-black leading-5 text-white">
                {value}
              </div>
            </div>
          ))}
          </div>

          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Learning Readiness
            </div>
            <div className="mt-3 grid gap-2">
              {learningReadinessSignals.slice(0, 4).map((signal) => (
                <div key={signal.label} className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold text-[#9aa7b8]">{signal.label}</span>
                  <span className="text-right font-black text-white">{signal.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div id="mentor-plan" className="scroll-mt-24 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              My Plan
            </div>
            <h3 className="mt-2 font-black text-white">{learningPlan.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
              {learningPlan.summary}
            </p>
            <div className="mt-3 grid gap-2">
              {roadmapPreview.map((course) => (
                <div key={course.id} className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                  <div className="text-sm font-black text-white">{course.title}</div>
                  <div className="mt-1 text-xs font-bold uppercase text-[#7f8da3]">
                    {course.progress}% explored
                  </div>
                </div>
              ))}
              {roadmapPreview.length === 0 ? (
                <p className="text-sm font-semibold text-[#c7cfdb]">
                  I will build this with you as I learn your goal.
                </p>
              ) : null}
            </div>
          </div>

          <div id="mentor-progress" className="scroll-mt-24 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">
              Progress I am watching
            </div>
            <div className="mt-3 grid gap-2">
              {learningGoals.slice(0, 2).map((learningGoal) => (
                <div key={learningGoal.id} className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                  <div className="text-sm font-black text-white">{learningGoal.title}</div>
                  <ProgressBar value={learningGoal.progress} />
                </div>
              ))}
              {visibleRecommendations.map((recommendation) => (
                <p key={recommendation.id} className="rounded-lg border border-indigo-300/25 bg-indigo-300/10 p-3 text-sm font-semibold leading-5 text-indigo-100">
                  {recommendation.title}
                </p>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </DashboardCard>
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
      .select("id, course_id, activity_type, title, difficulty, estimated_minutes, xp, status, completed_at, sort_order, created_at")
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
        focus: "Your Mentor will learn what helps you best.",
        active: true,
      };
  const userGoals = ((goalsResult.data || []) as Record<string, unknown>[]).map(mapGoalRow);
  const userCourses = ((coursesResult.data || []) as Record<string, unknown>[]).map(mapCourseRow);
  const userSessions = ((sessionsResult.data || []) as Record<string, unknown>[]).map(mapSessionRow);
  const userActivities = (activitiesResult.data || []) as LearningPathActivityRow[];
  const userAchievements = ((achievementsResult.data || []) as Record<string, unknown>[]).map(mapAchievementRow);
  const userCertificates = ((certificatesResult.data || []) as Record<string, unknown>[]).map(mapCertificateRow);
  const firstPlanRow = ((plansResult.data || []) as Record<string, unknown>[])[0];
  const userPlan = firstPlanRow
    ? mapPlanRow(firstPlanRow, activeLearner.id)
    : {
        id: "starter-learning-path",
        learnerId: activeLearner.id,
        title: userGoals[0]?.title || "Starter learning path",
        summary: userGoals[0]?.target || "Your Mentor will help you choose a first goal.",
        primaryGoalId: userGoals[0]?.id,
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
  const learningReadinessSignals = [
    {
      label: "Confidence",
      value: `${learningIntelligence.mastery.confidence} confidence`,
    },
    {
      label: "Mastery",
      value: `${learningIntelligence.mastery.overallMasteryPercent}% demonstrated`,
    },
    {
      label: "Prerequisites",
      value: `${learningIntelligence.dependencyGraph.unlockedConcepts.length} ideas ready`,
    },
    {
      label: "Study consistency",
      value: `${progressSignals.currentStreakDays} day streak`,
    },
    {
      label: "Learning momentum",
      value: `${progressSignals.sessionsCompleted} lessons saved`,
    },
    {
      label: "Knowledge retention",
      value: `${learningIntelligence.weakness.repeatedReviewNeeds.length} review need${
        learningIntelligence.weakness.repeatedReviewNeeds.length === 1 ? "" : "s"
      }`,
    },
  ];
  const mentorHomeMission = buildMentorHomeMission({
    learnerName: activeLearner.name,
    learningGoals,
    learningCourses,
    learningSessions,
    learningActivities: userActivities,
    learningRecommendations,
    progressSignals,
  });

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="learning" label={`BeastLearning ${BEAST_LEARNING_VERSION}`} />
              <h1 className="beast-title">Your BeastLearning Mentor</h1>
              <p className="beast-subtitle">
                Start with the AI who knows your goal, remembers what changed,
                and keeps the path moving. When it is time to learn, your Mentor
                brings in the Tutor for instruction, practice, feedback, and
                mastery.
              </p>
            </div>
            <Link
              href="/dashboard/today"
              className="w-fit rounded-xl border border-indigo-300/40 bg-indigo-300/10 px-4 py-3 text-sm font-black text-indigo-100 transition hover:bg-indigo-300/15"
            >
              Back to Today
            </Link>
          </div>
        </section>

        <div id="guidance" className="scroll-mt-24">
          <MentorHome
            mission={mentorHomeMission}
            learningReadinessSignals={learningReadinessSignals}
            learningPlan={learningPlan}
            learningGoals={learningGoals}
            learningCourses={learningCourses}
            learningRecommendations={learningRecommendations}
          />
        </div>

        <section id="learning-access" className="grid scroll-mt-24 gap-4 xl:grid-cols-[1fr_0.9fr]">
          <DashboardCard accent="blue">
            <SectionHeader
              eyebrow="Learning access"
              title="Everything else stays available"
              description="The Mentor leads the next action, while courses, goals, study planning, review tools, and records remain close by."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["goals", "Goals", learningGoals[0]?.title || "Goal setup is available through BeastOS profile context."],
                ["study-plan", "Study Plan", learningPlan.summary],
                ["courses", "Courses", learningCourses[0]?.title || "Course access appears here when assigned."],
                ["flashcards", "Review", progressSignals.weakArea],
                ["achievements", "Achievements", `${learningAchievements.length} learning achievement record${learningAchievements.length === 1 ? "" : "s"}.`],
                ["certificate-access", "Certificates", `${learningCertificates.length} certificate record${learningCertificates.length === 1 ? "" : "s"}.`],
              ].map(([id, title, detail]) => (
                <div
                  key={id}
                  id={id}
                  className="scroll-mt-24 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <h3 className="font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                    {detail}
                  </p>
                </div>
              ))}
            </div>
          </DashboardCard>
        </section>

        <section id="wins" className="grid scroll-mt-24 gap-4 xl:grid-cols-[1fr_0.9fr]">
          <DashboardCard accent="green">
            <SectionHeader
              eyebrow="Wins"
              title="Wins worth noticing"
              description="Your Mentor notices effort, consistency, mastery, and meaningful milestones along the way."
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
      </div>
    </main>
  );
}
