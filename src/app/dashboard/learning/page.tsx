import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCard,
  DashboardCard,
  MetricTile,
  ModuleBadge,
  SectionHeader,
  moduleAccents,
} from "@/app/components/design/DashboardPrimitives";
import { BEAST_LEARNING_VERSION } from "@/lib/appVersion";
import {
  getLearningActivityRoute,
  getNewestReadyLearningActivity,
  type LearningActivityRunnerRow,
} from "@/lib/learning/activityRunner";
import { getProfileDisplayName } from "@/lib/profile";
import { buildLearningAchievementUnlocks } from "@/lib/learning/achievements";
import { mockLearningCertificates } from "@/lib/learning/certificates";
import { buildLearningIntelligenceSnapshot } from "@/lib/learning/intelligenceEngine";
import { buildLearnerPortfolio } from "@/lib/learning/portfolio";
import { buildLearningFoundationIntelligence } from "@/lib/platform/recommendationEngine";
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
import LearningExperiencePanel from "./LearningExperiencePanel";
import LearningGoalBuilder from "./LearningGoalBuilder";
import LearningIntelligencePanel from "./LearningIntelligencePanel";
import LearningKnowledgePanel from "./LearningKnowledgePanel";
import LearningPathTemplates from "./LearningPathTemplates";
import PrivateBetaPanels from "./PrivateBetaPanels";
import StudySessionCommandCard from "./StudySessionCommandCard";
import { mockParentDashboard } from "@/lib/learning/parentDashboard";
import type {
  ModuleSummary,
  PlatformActivity,
  PlatformNotification,
  PlatformTimelineEvent,
} from "@/lib/platform/types";
import {
  mockLearners,
  mockLearningAchievements,
  mockLearningCourses,
  mockLearningGoals,
  mockLearningPlan,
  mockLearningQuickActions,
  mockLearningSessions,
  mockStudySessionCommand,
} from "@/lib/learning/mockData";
import { buildLearningProgressSignals } from "@/lib/learning/progressSignals";
import { buildLearningRecommendations } from "@/lib/learning/recommendations";
import { buildLearningDashboardContent } from "@/lib/learning/dashboardContent";
import { buildLearningExperienceDashboard } from "@/lib/learning/experience";
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

function LearnerSwitcher({ learners }: { learners: typeof mockLearners }) {
  return (
    <div className="grid gap-3">
      {learners.map((learner) => (
        <div
          key={learner.id}
          className={`rounded-xl border p-4 ${
            learner.active
              ? "border-indigo-300/45 bg-indigo-300/10"
              : "border-[#2a3242] bg-[#111827]"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-black text-white">{learner.name}</div>
              <div className="mt-1 text-xs font-bold uppercase text-[#7f8da3]">
                {learner.role}
              </div>
            </div>
            <ModuleBadge
              module={learner.active ? "learning" : "family"}
              label={learner.active ? "Active" : "Soon"}
              comingSoon={!learner.active}
            />
          </div>
          <p className="mt-3 text-sm leading-5 text-[#c7cfdb]">{learner.focus}</p>
        </div>
      ))}
    </div>
  );
}

function CourseCard({ course }: { course: LearningCourse }) {
  return (
    <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase text-[#7f8da3]">
            {course.category}
          </div>
          <h3 className="mt-1 text-lg font-black text-white">{course.title}</h3>
        </div>
        <span className="rounded-full border border-indigo-300/40 bg-indigo-300/10 px-3 py-1 text-xs font-bold text-indigo-100">
          {course.priority}
        </span>
      </div>
      <ProgressBar value={course.progress} />
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm text-[#c7cfdb]">
        <span>{course.progress}% explored</span>
        <span>{course.estimatedCompletion}</span>
      </div>
      <div className="mt-3 text-xs font-bold uppercase text-[#7f8da3]">
        {course.status}
      </div>
    </div>
  );
}

function GoalCard({ goal }: { goal: LearningGoal }) {
  return (
    <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-black text-white">{goal.title}</h3>
          <div className="mt-1 text-xs font-bold uppercase text-[#7f8da3]">
            {goal.category}
          </div>
        </div>
        <span className="rounded border border-[#2a3242] bg-[#0f1419] px-2 py-1 text-xs font-bold text-[#dbe3ef]">
          {goal.status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-5 text-[#c7cfdb]">{goal.target}</p>
      <ProgressBar value={goal.progress} />
      <div className="mt-2 text-sm font-bold text-indigo-100">
        {goal.progress}% shaped with your Mentor
      </div>
    </div>
  );
}

function RecommendationRow({
  recommendation,
}: {
  recommendation: LearningRecommendation;
}) {
  return (
    <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <ModuleBadge module={recommendation.module} />
        <span className="rounded-full border border-[#2a3242] px-2 py-1 text-xs font-bold text-[#dbe3ef]">
          {recommendation.priority}
        </span>
      </div>
      <h3 className="mt-3 font-black text-white">{recommendation.title}</h3>
      <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
        {recommendation.summary}
      </p>
      <p className="mt-3 text-xs font-semibold uppercase text-[#7f8da3]">
        {recommendation.recommendedAction}
      </p>
    </div>
  );
}

function PlatformSignalCard({
  summary,
  notification,
  activity,
  timelineEvent,
}: {
  summary: ModuleSummary;
  notification: PlatformNotification;
  activity: PlatformActivity;
  timelineEvent: PlatformTimelineEvent;
}) {
  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Shared Platform"
        title="Learning service signals"
        description="Learning uses the same module summary, notification, activity, timeline, and recommendation contracts as BeastOS Today."
      />
      <div className="mt-5 grid gap-3">
        <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
          <ModuleBadge module={summary.module} />
          <div className="mt-3 font-black text-white">{summary.label}</div>
          <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">{summary.summary}</p>
        </div>
        <AlertCard
          severity={notification.severity}
          title={notification.title}
          message={notification.summary || "Learning notification reserved."}
          href={notification.actionUrl}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">Activity</div>
            <div className="mt-2 font-black text-white">{activity.title}</div>
            <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">{activity.summary}</p>
          </div>
          <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-bold uppercase text-[#7f8da3]">Timeline</div>
            <div className="mt-2 font-black text-white">{timelineEvent.title}</div>
            <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">
              {timelineEvent.summary}
            </p>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

function getFirstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function MentorConversationCenter({
  learnerName,
  goal,
  currentProgress,
  todayRecommendation,
  estimatedTime,
  recommendationReason,
  mentorSignals,
  readyActivity,
  learningReadinessSignals,
  learningPlan,
  learningGoals,
  learningCourses,
  learningRecommendations,
}: {
  learnerName: string;
  goal: string;
  currentProgress: string;
  todayRecommendation: string;
  estimatedTime: string;
  recommendationReason: string;
  mentorSignals: { label: string; value: string }[];
  learningReadinessSignals: { label: string; value: string }[];
  learningPlan: LearningPlan;
  learningGoals: LearningGoal[];
  learningCourses: LearningCourse[];
  learningRecommendations: LearningRecommendation[];
  readyActivity?: LearningPathActivityRow;
}) {
  const firstName = getFirstName(learnerName);
  const activeRole = readyActivity ? "Mentor with Tutor ready" : "Mentor";
  const roadmapPreview = learningCourses.slice(0, 3);
  const visibleRecommendations = learningRecommendations.slice(0, 3);

  return (
    <DashboardCard accent="learning">
      <SectionHeader
        eyebrow="Persistent Mentor Conversation"
        title="Stay here. I will move us through the learning."
        description="The conversation stays in one place. I handle onboarding, goals, roadmap, memory, progress, recommendations, and next steps. When teaching is needed, I bring the Tutor into this same flow."
        action={<ModuleBadge module="learning" label={activeRole} />}
      />

      <div id="mentor-session" className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section
          className="grid min-h-[620px] content-between gap-5 rounded-2xl border border-indigo-300/35 bg-[#0b1020] p-4 sm:p-5"
          aria-label="Persistent BeastLearning Mentor conversation"
        >
          <div className="grid gap-4">
            {[
              {
                role: "Mentor",
                title: `Hi ${firstName}. I am here with you.`,
                body:
                  "We will stay in this conversation. You do not need to hunt through pages to figure out what to do next.",
              },
              {
                role: "Mentor",
                title: "Here is what I am holding for you.",
                body: `Your current goal is ${goal}. Right now we are focused on ${currentProgress}. I will keep the roadmap, memory, progress, and next steps together.`,
              },
              {
                role: "Mentor",
                title: "Here is why I am choosing today's step.",
                body: recommendationReason,
              },
            ].map((message) => (
              <div
                key={message.title}
                className="max-w-3xl rounded-2xl border border-indigo-300/30 bg-indigo-300/10 p-4"
              >
                <div className="text-xs font-black uppercase text-indigo-100">
                  {message.role}
                </div>
                <h3 className="mt-2 text-lg font-black text-white">{message.title}</h3>
                <p className="mt-2 text-sm leading-6 text-indigo-50">{message.body}</p>
              </div>
            ))}

            <div className="max-w-3xl rounded-2xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-black uppercase text-[#7f8da3]">
                Mentor
              </div>
              <h3 className="mt-2 text-lg font-black text-white">
                {readyActivity ? "I am bringing the Tutor in now." : "I am still building the first teaching moment."}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                {readyActivity
                  ? `${readyActivity.title} is ready. I chose it because it fits where you are now and gives the Tutor a focused starting point.`
                  : "Tell me your goal or return to Today, and I will prepare the first useful lesson without making you manage a workflow."}
              </p>
            </div>

            {readyActivity ? (
              <div className="ml-auto max-w-3xl rounded-2xl border border-cyan-300/35 bg-cyan-300/10 p-4">
                <div className="text-xs font-black uppercase text-cyan-100">
                  Tutor
                </div>
                <h3 className="mt-2 text-lg font-black text-white">
                  I can teach this right here.
                </h3>
                <p className="mt-2 text-sm leading-6 text-cyan-50">
                  We will start with one idea, try one question, use hints if
                  you need them, check mastery, and then I will hand the result
                  back to your Mentor.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-cyan-200/25 bg-[#0f1419]/80 p-3">
                    <div className="text-xs font-bold uppercase text-[#7f8da3]">
                      Lesson
                    </div>
                    <div className="mt-1 text-sm font-black text-white">
                      {readyActivity.title}
                    </div>
                  </div>
                  <div className="rounded-xl border border-cyan-200/25 bg-[#0f1419]/80 p-3">
                    <div className="text-xs font-bold uppercase text-[#7f8da3]">
                      Time
                    </div>
                    <div className="mt-1 text-sm font-black text-white">
                      {estimatedTime}
                    </div>
                  </div>
                  <div className="rounded-xl border border-cyan-200/25 bg-[#0f1419]/80 p-3">
                    <div className="text-xs font-bold uppercase text-[#7f8da3]">
                      Role
                    </div>
                    <div className="mt-1 text-sm font-black text-white">
                      Tutor teaches
                    </div>
                  </div>
                </div>
                <Link
                  href={getLearningActivityRoute(readyActivity.id)}
                  className="beast-button mt-4 inline-flex"
                >
                  Open full Tutor workspace
                </Link>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3 border-t border-[#2a3242] pt-4">
            <a href="#mentor-session" className="beast-button">
              Continue here
            </a>
            <a href="#mentor-plan" className="beast-button-secondary">
              Show me my plan
            </a>
            <a href="#mentor-progress" className="beast-button-secondary">
              Show me how I am doing
            </a>
          </div>
        </section>

        <aside className="grid content-start gap-3">
          <div className="rounded-2xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="text-xs font-black uppercase text-[#7f8da3]">
              Conversation Memory
            </div>
            <div className="mt-3 grid gap-3">
              {mentorSignals.map((signal) => (
                <div key={signal.label} className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-3">
                  <div className="text-xs font-bold uppercase text-indigo-100">
                    {signal.label}
                  </div>
                  <p className="mt-1 text-sm leading-5 text-[#c7cfdb]">
                    {signal.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {[
              ["Goal", goal],
              ["Now", currentProgress],
              ["Recommendation", todayRecommendation],
              ["Time", estimatedTime],
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
  const userLearners = [
    activeLearner,
    ...learnerProfileRows.slice(1).map((learner) => ({
      id: String(learner.id),
      name: String(learner.display_name || "Learner"),
      role: String(learner.learner_role || "Learner"),
      focus: String(learner.focus || "Learning path"),
      active: false,
    })),
  ];
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
  const learnerList =
    demoModeEnabled && userGoals.length === 0 ? mockLearners : userLearners;
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
  const learningQuickActions =
    demoModeEnabled && userGoals.length === 0 ? mockLearningQuickActions : [];
  const learningPathReadyActivity = getNewestReadyLearningActivity(userActivities);
  const intelligence = buildLearningFoundationIntelligence();
  const learningAccent = moduleAccents.learning;
  const privateBeta = await loadLearningPrivateBetaData({
    supabase,
    userId: user.id,
    learnerName: activeLearner.name,
    goals: learningGoals,
    sessions: learningSessions,
    certificates: learningCertificates,
  });
  const summary = intelligence.moduleSummaries[0];
  const notification = intelligence.notifications[0];
  const activity = intelligence.activities[0];
  const timelineEvent = intelligence.timelineEvents[0];
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
  const learningExperience = buildLearningExperienceDashboard({
    learnerName: learnerPortfolio.learnerName,
    progress: progressSignals,
    goals: learningGoals,
    achievements: achievementUnlocks,
    parentDashboard,
    certificateCount: learningCertificates.length,
    certificateTitle: learningCertificates[0]?.pathName,
    certificateVerification: learningCertificates[0]?.verificationPlaceholder,
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
  const primaryGoalTitle = learningGoals[0]?.title || learningPlan.title || "your learning goal";
  const currentProgressLabel =
    learningCourses.find((course) => course.status === "In progress")?.title ||
    studySession.currentFocus ||
    "Learning path setup";
  const todayRecommendationTitle =
    learningPathReadyActivity?.title ||
    learningRecommendations[0]?.title ||
    progressSignals.recommendedNextAction;
  const estimatedTimeLabel = learningPathReadyActivity?.estimated_minutes
    ? `${learningPathReadyActivity.estimated_minutes} minutes`
    : studySession.estimatedTime || "20 minutes";
  const recommendationReason =
    learningRecommendations[0]?.reason ||
    "It matches your current goal, readiness, and next available learning step.";
  const mentorSignals = [
    {
      label: "What I remember",
      value:
        learningIntelligence.memory.recentlyStudied[0]
          ? `Last time, ${learningIntelligence.memory.recentlyStudied[0]} was part of your work. I will connect today back to that.`
          : "I will remember what you tell me today so the next lesson starts closer to where you are.",
    },
    {
      label: "Review I am watching",
      value:
        learningIntelligence.weakness.repeatedReviewNeeds[0] ||
        learningIntelligence.weakness.lowMasteryConcepts[0]
          ? `I may slow us down around ${
              learningIntelligence.weakness.repeatedReviewNeeds[0] ||
              learningIntelligence.weakness.lowMasteryConcepts[0]
            } so it sticks.`
          : "No urgent review is standing out, so we can keep building forward.",
    },
    {
      label: "How I am adapting",
      value: `Your current understanding is around ${learningIntelligence.mastery.overallMasteryPercent}%, so I am choosing ${learningIntelligence.adaptivePlan.nextRecommendedLesson} as the next useful step.`,
    },
  ];

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
          <MentorConversationCenter
            learnerName={activeLearner.name}
            goal={primaryGoalTitle}
            currentProgress={currentProgressLabel}
            todayRecommendation={todayRecommendationTitle}
            estimatedTime={estimatedTimeLabel}
            recommendationReason={recommendationReason}
            mentorSignals={mentorSignals}
            learningReadinessSignals={learningReadinessSignals}
            learningPlan={learningPlan}
            learningGoals={learningGoals}
            learningCourses={learningCourses}
            learningRecommendations={learningRecommendations}
            readyActivity={learningPathReadyActivity}
          />
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Supporting progress details">
          {progressSignals.snapshotTiles.map((progress) => (
            <MetricTile
              key={progress.id}
              label={progress.label}
              value={progress.value}
              detail={progress.detail}
              icon={progress.icon}
              tone={progress.tone}
            />
          ))}
        </section>

        <div id="progress" className="scroll-mt-24">
          <LearningExperiencePanel experience={learningExperience} />
        </div>

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <DashboardCard accent="learning">
            <SectionHeader
              eyebrow="Memory"
              title="What I remember about you"
              description="This is the context your Mentor uses to keep recommendations personal without asking you to repeat yourself."
            />
            <div className="mt-5">
              <LearnerSwitcher learners={learnerList} />
            </div>
          </DashboardCard>

          <DashboardCard accent="learning">
            <SectionHeader
              eyebrow="Mentor Reasoning"
              title="How today was chosen"
              description="Your Mentor weighs confidence, mastery, review needs, momentum, and goals before choosing what happens next."
            />
            <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_1fr]">
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Learning Readiness
                </div>
                <div className="mt-3 text-4xl font-black text-white">
                  {progressSignals.readinessScore}%
                </div>
                <div className="mt-4 grid gap-2">
                  {learningReadinessSignals.map((signal) => (
                    <div
                      key={signal.label}
                      className="rounded-lg border border-[#2a3242] bg-[#0f1419] p-3"
                    >
                      <div className="text-xs font-bold uppercase text-[#7f8da3]">
                        {signal.label}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-[#dbe3ef]">
                        {signal.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    My roadmap for you
                  </div>
                  <h3 className="mt-2 text-xl font-black text-white">
                    {learningPlan.title}
                  </h3>
                  <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
                    {learningPlan.summary}
                  </p>
                </div>
                <div
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: `${learningAccent.color}66`,
                    background: `${learningAccent.color}1A`,
                  }}
                >
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Why this helps
                  </div>
                  <p className="mt-2 text-sm leading-5 text-indigo-100">
                    {progressSignals.recommendedNextAction}
                  </p>
                  <div className="mt-3 text-xs font-bold uppercase text-[#7f8da3]">
                    We may review: {progressSignals.weakArea}
                  </div>
                </div>
              </div>
            </div>
          </DashboardCard>
        </section>

        <div id="continue-learning" className="scroll-mt-24">
          <StudySessionCommandCard session={studySession} />
        </div>

        <DashboardCard accent="learning">
          <SectionHeader
            eyebrow="Continue"
            title={learningPathReadyActivity?.title || "Your Mentor is getting the next lesson ready"}
            description={
              learningPathReadyActivity
                ? "Your Mentor has brought the Tutor into the conversation above. Stay there unless you want the full Tutor workspace."
                : "Stay with your Mentor above. The first learning step will appear there when it is ready."
            }
            action={
              <ModuleBadge
                module="learning"
                label={learningPathReadyActivity?.status || "Waiting"}
              />
            }
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#mentor-session" className="beast-button">
              Continue with my Mentor
            </a>
            {learningPathReadyActivity ? (
              <Link
                href={getLearningActivityRoute(learningPathReadyActivity.id)}
                className="beast-button-secondary"
              >
                Open full Tutor workspace
              </Link>
            ) : null}
          </div>
        </DashboardCard>

        <section id="learning-path" className="grid scroll-mt-24 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <DashboardCard accent="learning">
            <SectionHeader
              eyebrow="Roadmap"
              title="Where we're headed"
              description="This is the roadmap your Mentor keeps adjusting as you learn, struggle, recover, and grow."
            />
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {learningCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
              {learningCourses.length === 0 ? (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold text-[#c7cfdb]">
                  Your Mentor will build this path as it learns more about your goal.
                </div>
              ) : null}
            </div>
          </DashboardCard>

          <DashboardCard accent="purple">
            <SectionHeader
              eyebrow="Next Steps"
              title="What we may work on soon"
              description="These are possible next moves. Your Mentor will choose the right one based on how today goes."
            />
            <div className="mt-5 grid gap-3">
              {learningSessions.map((lesson) => (
                <div
                  key={lesson.id}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-bold uppercase text-[#7f8da3]">
                      {lesson.when}
                    </div>
                    <span className="rounded-full border border-[#2a3242] px-2 py-1 text-xs font-bold text-[#dbe3ef]">
                      {lesson.duration}
                    </span>
                  </div>
                  <h3 className="mt-2 font-black text-white">{lesson.title}</h3>
                  <p className="mt-1 text-sm text-[#c7cfdb]">{lesson.courseTitle}</p>
                </div>
              ))}
            </div>
          </DashboardCard>
        </section>

        <section id="goals" className="grid scroll-mt-24 gap-4 xl:grid-cols-[1fr_0.9fr]">
          <DashboardCard accent="learning">
            <SectionHeader
              eyebrow="Goals"
              title="What we're working toward"
              description="Your Mentor uses these goals to explain why each lesson matters and when the plan should change."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {learningGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
              {learningGoals.length === 0 ? (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold text-[#c7cfdb]">
                  Your Mentor will help you name your first goal in conversation.
                </div>
              ) : null}
            </div>
          </DashboardCard>

          <DashboardCard accent="green">
            <SectionHeader
              eyebrow="Achievements"
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

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <DashboardCard accent="learning">
            <SectionHeader
              eyebrow="Recommendations"
              title="Why your Mentor is choosing these steps"
              description="These are the reasons behind your next lesson, review, or practice."
            />
            <div className="mt-5 grid gap-3">
              {learningRecommendations.map((recommendation) => (
                <RecommendationRow
                  key={recommendation.id}
                  recommendation={recommendation}
                />
              ))}
            </div>
          </DashboardCard>

          <PlatformSignalCard
            summary={summary}
            notification={notification}
            activity={activity}
            timelineEvent={timelineEvent}
          />
        </section>

        <DashboardCard accent="learning">
            <SectionHeader
              eyebrow="More Support"
              title="Helpful options when you need them"
              description="Use these only when they help. Your Mentor keeps the main path simple."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {learningQuickActions.map((action) => (
              <div
                key={action.id}
                className={`rounded-xl border p-4 transition ${
                  action.active
                    ? "border-indigo-300/45 bg-indigo-300/10"
                    : "border-[#2a3242] bg-[#111827] opacity-80"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-white">{action.label}</h3>
                  {!action.active ? (
                    <span className="rounded border border-[#2a3242] px-2 py-1 text-xs font-bold uppercase text-[#7f8da3]">
                      When useful
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
                  {action.detail}
                </p>
              </div>
            ))}
            {learningQuickActions.length === 0 ? (
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold text-[#c7cfdb]">
                Your Mentor will offer more options after your learning path has enough context.
              </div>
            ) : null}
          </div>
        </DashboardCard>

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
