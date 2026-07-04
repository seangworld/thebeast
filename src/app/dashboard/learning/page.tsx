import Link from "next/link";
import {
  AlertCard,
  DashboardCard,
  HealthGauge,
  MetricTile,
  ModuleBadge,
  SectionHeader,
  moduleAccents,
} from "@/app/components/design/DashboardPrimitives";
import { BEAST_LEARNING_VERSION } from "@/lib/appVersion";
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
import type {
  LearningCourse,
  LearningGoal,
  LearningRecommendation,
} from "@/lib/learning/types";

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

function LearnerSwitcher() {
  return (
    <div className="grid gap-3">
      {mockLearners.map((learner) => (
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
        <span>{course.progress}% complete</span>
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
        {goal.progress}% mapped
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

export default async function LearningPage() {
  const intelligence = buildLearningFoundationIntelligence();
  const learningAccent = moduleAccents.learning;
  const activeLearner = mockLearners.find((learner) => learner.active) || mockLearners[0];
  const privateBeta = await loadLearningPrivateBetaData({ learner: activeLearner });
  const summary = intelligence.moduleSummaries[0];
  const notification = intelligence.notifications[0];
  const activity = intelligence.activities[0];
  const timelineEvent = intelligence.timelineEvents[0];
  const progressSignals = buildLearningProgressSignals({
    goals: mockLearningGoals,
    courses: mockLearningCourses,
    plan: mockLearningPlan,
    sessions: mockLearningSessions,
    achievements: mockLearningAchievements,
    studySession: mockStudySessionCommand,
  });
  const learningRecommendations: LearningRecommendation[] =
    buildLearningRecommendations({
      progress: progressSignals,
      currentPlanTitle: mockLearningPlan.title,
      activeGoalsCount: progressSignals.activeGoalsCount,
      currentFocus: mockStudySessionCommand.currentFocus,
    });
  const learningIntelligence = buildLearningIntelligenceSnapshot({
    goals: mockLearningGoals,
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
    goalsCreated: mockLearningGoals.length,
    goalsCompleted: mockLearningGoals.filter((goal) => goal.status === "Completed")
      .length,
    masteredSkills: 0,
    foundingStudent: true,
  });
  const learnerPortfolio = buildLearnerPortfolio({
    learnerName: activeLearner.name || "Learner",
    goals: mockLearningGoals,
    progress: progressSignals,
    certificates: mockLearningCertificates,
    achievementCount: achievementUnlocks.filter((achievement) => achievement.unlocked)
      .length,
  });
  const learningExperience = buildLearningExperienceDashboard({
    learnerName: learnerPortfolio.learnerName,
    progress: progressSignals,
    goals: mockLearningGoals,
    achievements: achievementUnlocks,
    parentDashboard: mockParentDashboard,
  });

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="learning" label={`BeastLearning ${BEAST_LEARNING_VERSION}`} />
              <h1 className="beast-title">Learning Command Center</h1>
              <p className="beast-subtitle">
                Goals, courses, study rhythm, progress, and achievements now have
                a permanent home inside BeastOS.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="w-fit rounded-xl border border-indigo-300/40 bg-indigo-300/10 px-4 py-3 text-sm font-black text-indigo-100 transition hover:bg-indigo-300/15"
            >
              Back to Today
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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

        <PrivateBetaPanels beta={privateBeta} />

        <LearningExperiencePanel experience={learningExperience} />

        <LearningAIOrchestrationPanel orchestration={aiOrchestration} />

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <DashboardCard accent="learning">
            <SectionHeader
              eyebrow="Student Profiles"
              title="Learner context"
              description="One current learner is active now. Family learner switching has a permanent visual home for future support."
            />
            <div className="mt-5">
              <LearnerSwitcher />
            </div>
          </DashboardCard>

          <DashboardCard accent="learning">
            <SectionHeader
              eyebrow="Learning Snapshot"
              title="Readiness and direction"
              description="The foundation tracks plan shape, progress signals, and future tutoring context without AI or quiz logic."
            />
            <div className="mt-5 grid gap-4 lg:grid-cols-[0.7fr_1fr]">
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <HealthGauge score={progressSignals.readinessScore} />
                <div className="mt-4 text-center text-sm font-semibold text-[#c7cfdb]">
                  Readiness placeholder
                </div>
              </div>
              <div className="grid gap-3">
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <div className="text-xs font-bold uppercase text-[#7f8da3]">
                    Current plan
                  </div>
                  <h3 className="mt-2 text-xl font-black text-white">
                    {mockLearningPlan.title}
                  </h3>
                  <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
                    {mockLearningPlan.summary}
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
                    Recommended next action
                  </div>
                  <p className="mt-2 text-sm leading-5 text-indigo-100">
                    {progressSignals.recommendedNextAction}
                  </p>
                  <div className="mt-3 text-xs font-bold uppercase text-[#7f8da3]">
                    Weak area: {progressSignals.weakArea}
                  </div>
                </div>
              </div>
            </div>
          </DashboardCard>
        </section>

        <div id="study-plan" className="scroll-mt-24">
          <StudySessionCommandCard session={mockStudySessionCommand} />
        </div>

        <LearningIntelligencePanel snapshot={learningIntelligence} />

        <LearningKnowledgePanel knowledge={knowledgeDashboard} />

        <div id="flashcards" className="scroll-mt-24">
          <LearningContentIntelligencePanel content={learningDashboardContent} />
        </div>

        <section id="courses" className="grid scroll-mt-24 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <DashboardCard accent="learning">
            <SectionHeader
              eyebrow="Current Learning Plan"
              title="Courses"
              description="Course records support title, category, progress, estimated completion, status, and priority."
            />
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {mockLearningCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          </DashboardCard>

          <DashboardCard accent="purple">
            <SectionHeader
              eyebrow="Upcoming Lessons"
              title="Next study blocks"
              description="Lesson scheduling is presentation-only for now and ready for future calendar integration."
            />
            <div className="mt-5 grid gap-3">
              {mockLearningSessions.map((lesson) => (
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
              eyebrow="Learning Goals"
              title="Editable goal cards"
              description="These cards establish the future user-defined goal model without changing the database yet."
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {mockLearningGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </DashboardCard>

          <DashboardCard accent="green">
            <SectionHeader
              eyebrow="Achievements"
              title="Progress markers"
              description="Achievement UI is ready for streaks, completions, mastery, and certifications."
            />
            <div className="mt-5 grid gap-3">
              {mockLearningAchievements.map((achievement) => (
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
                      {achievement.earned ? "Earned" : "Reserved"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        </section>

        <LearningGoalBuilder />

        <GuidanceCounselorMode />

        <LearningPathTemplates templates={learningPathTemplates} />

        <div id="achievements" className="scroll-mt-24">
          <AchievementEnginePanel achievements={achievementUnlocks} />
        </div>

        <section id="certificates" className="grid scroll-mt-24 gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <CertificatePreviewPanel certificates={mockLearningCertificates} />
          <LearnerPortfolioPanel portfolio={learnerPortfolio} />
        </section>

        <div id="parent-view" className="scroll-mt-24">
          <ParentDashboardPanel dashboard={mockParentDashboard} />
        </div>

        <StudyPlannerPanel planner={mockStudyPlanner} />

        <UploadFoundationPanel uploads={mockLearningUploads} />

        <AISpecialistsPanel specialists={learningSpecialists} />

        <div id="feedback" className="scroll-mt-24">
          <BetaFeedbackPanel />
        </div>

        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <DashboardCard accent="learning">
            <SectionHeader
              eyebrow="Recommendations"
              title="Learning guidance"
              description="Recommendations use the shared BeastOS recommendation contract. Future AI can populate the same shape later."
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
            eyebrow="Quick Actions"
            title="Learning launchpad"
            description="Common learning actions are mapped now, with future engines clearly reserved."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {mockLearningQuickActions.map((action) => (
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
                      Soon
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-5 text-[#c7cfdb]">
                  {action.detail}
                </p>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </main>
  );
}
