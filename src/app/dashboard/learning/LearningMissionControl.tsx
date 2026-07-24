import Link from "next/link";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { LearningMissionControlModel } from "@/lib/learning/missionControl";
import type { Observation } from "@/lib/platform/agents";

function ProgressBar({ value }: { value: number }) {
  const clampedValue = Math.max(0, Math.min(100, value));
  return (
    <div
      className="h-2.5 overflow-hidden rounded-full border border-white/[0.04] bg-[#090d14]"
      role="progressbar"
      aria-label={`Learning progress ${clampedValue}%`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampedValue}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-indigo-300 to-cyan-300 transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-28 items-start gap-3 rounded-2xl border border-dashed border-[#343e50] bg-gradient-to-br from-[#111722] to-[#0d131d] p-4 sm:p-5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-300/20 bg-indigo-300/[0.07] text-sm font-black text-indigo-200" aria-hidden="true">
        L
      </span>
      <p className="text-sm leading-6 text-[#9aa7b8]">{children}</p>
    </div>
  );
}

const polishedCard =
  "h-full transition duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_20px_55px_rgba(0,0,0,0.22)] motion-reduce:transition-none";

export default function LearningMissionControl({
  model,
  insights,
  showCurrentMission = true,
  showWeeklyProgress = true,
  showAchievements = true,
}: {
  model: LearningMissionControlModel;
  insights: readonly Observation[];
  showCurrentMission?: boolean;
  showWeeklyProgress?: boolean;
  showAchievements?: boolean;
}) {
  return (
    <section id="mentor-progress" aria-labelledby="learning-mission-control-title" className="scroll-mt-24 space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-5 border-b border-white/[0.07] pb-6 sm:pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <ModuleBadge module="learning" label="Learning Mission Control" />
          <h1 id="learning-mission-control-title" className="mt-4 max-w-4xl text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl">
            Your learning, clearly in view
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#aeb8c7] sm:text-base sm:leading-7">
            See your momentum, your next mission, and the evidence your Mentor is using to guide you.
          </p>
        </div>
        <Link href="#mentor-session" className="beast-button-secondary w-full justify-center sm:w-fit">
          Talk with your Mentor
        </Link>
      </div>

      <div className={`grid items-stretch gap-5 ${showCurrentMission ? "xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]" : ""}`}>
        <DashboardCard accent="learning" className={`min-h-[300px] ${polishedCard}`}>
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="beast-kicker">Learning Health Score</p>
                <p className="mt-4 text-6xl font-black tracking-[-0.055em] text-white sm:text-7xl">
                  {model.health.score ?? "—"}<span className="ml-1 text-xl tracking-normal text-[#7f8da3] sm:text-2xl">/100</span>
                </p>
                <p className="mt-3 text-base font-bold text-indigo-200">{model.health.label}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-left sm:grid-cols-1 sm:text-right">
                <div className="rounded-2xl border border-indigo-300/25 bg-indigo-300/[0.08] px-3 py-3 sm:px-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-200">Previous score</p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {model.health.previousScore ?? "Not available"}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#343e50] bg-[#111722] px-3 py-3 sm:px-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8f9cad]">Trend</p>
                  <p className="mt-1 text-sm font-semibold capitalize text-white">
                    {model.health.trend}
                    {model.health.change === null ? "" : ` (${model.health.change > 0 ? "+" : ""}${model.health.change})`}
                  </p>
                </div>
              </div>
            </div>
            <details className="group rounded-2xl border border-[#30394a] bg-[#0c111b] p-4 transition-colors open:border-indigo-300/30 open:bg-[#0e1420]">
              <summary className="cursor-pointer rounded-lg font-black text-indigo-100 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-300/60">
                How the score is calculated
              </summary>
              <p className="mt-3 text-xs leading-5 text-[#8f9cad]">
                {model.health.formula}
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {model.health.factors.map((factor) => (
                <div key={factor.id} className="rounded-xl border border-[#2b3445] bg-[#111722] p-3 transition-colors hover:border-indigo-300/25">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-white">{factor.label}</span>
                    <span className="text-[#aeb8c7]">
                      {factor.score === null ? "Not scored" : `${factor.score}/100`} · {factor.weight}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#aeb8c7]">{factor.explanation}</p>
                  <p className="mt-1 text-xs leading-5 text-[#7f8da3]">{factor.evidence}</p>
                </div>
              ))}
              </div>
              <div className="mt-4 rounded-xl border border-indigo-300/20 bg-indigo-300/5 p-3">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-200">
                  Ways to improve
                </p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-[#b8c2d1]">
                  {model.health.waysToImprove.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs leading-5 text-[#7f8da3]">
                  {model.health.limitations[0]}
                </p>
              </div>
            </details>
          </div>
        </DashboardCard>

        {showCurrentMission ? <DashboardCard accent="purple" className={`min-h-[300px] ${polishedCard}`}>
          <div className="flex h-full flex-col">
            <p className="beast-kicker">Current Mission</p>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">{model.mission.missionTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-[#b8c2d1]">{model.mission.recommendationReason}</p>
            <div className="mt-5 rounded-2xl border border-[#2b3445] bg-gradient-to-br from-[#131a27] to-[#0e141e] p-4">
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-bold text-white">{model.mission.missionLabel}</span>
                <span className="text-indigo-200">{model.mission.durationLabel}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[#8f9cad]">{model.mission.journeyProgressLabel}</p>
            </div>
            <Link href={model.mission.primaryAction.href} className="beast-button-primary mt-auto inline-flex w-full justify-center">
              {model.mission.primaryAction.label}
            </Link>
          </div>
        </DashboardCard> : null}
      </div>

      {insights.length > 0 ? (
        <DashboardCard accent="learning" className={polishedCard}>
          <SectionHeader
            eyebrow="Mentor Insights"
            title="What your learning evidence is showing"
            description="Educational observations drawn from your saved work. Open Explain Why to see the records and rule behind each one."
          />
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {insights.slice(0, 4).map((insight) => (
              <article
                key={insight.id}
                className="min-w-0 rounded-2xl border border-[#30394a] bg-[#111722] p-4 transition duration-300 hover:border-indigo-300/30 hover:bg-[#141b28] motion-reduce:transition-none sm:p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full border border-indigo-300/30 bg-indigo-300/10 px-2.5 py-1 text-xs font-black text-indigo-100">
                    {insight.type}
                  </span>
                  <span className="text-xs font-bold text-[#8f9cad]">
                    {Math.round(insight.assessment.confidence * 100)}% confidence
                  </span>
                </div>
                <h3 className="mt-3 break-words text-lg font-black text-white">
                  {insight.presentation.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-[#b8c2d1]">
                  {insight.presentation.summary}
                </p>
                <details className="mt-4 rounded-xl border border-[#343e50] bg-[#0c111b] p-3">
                  <summary className="cursor-pointer text-sm font-black text-indigo-100">
                    Explain Why
                  </summary>
                  <div className="mt-3 space-y-3 text-sm leading-6 text-[#aeb8c7]">
                    <p>{insight.presentation.whyNoticed}</p>
                    <p>{insight.presentation.whyItMayMatter}</p>
                    <p className="text-xs text-[#7f8da3]">
                      Evidence: {insight.evidence.map((item) => `${item.label}: ${String(item.value)}`).join(" · ")}
                    </p>
                    <p className="text-xs text-[#7f8da3]">
                      Limitation: {insight.provenance.limitations[0]}
                    </p>
                  </div>
                </details>
                {insight.presentation.workspaceTarget ? (
                  <Link
                    href={insight.presentation.workspaceTarget}
                    className="mt-4 inline-flex text-sm font-black text-indigo-200 transition hover:text-white"
                  >
                    Open related learning workspace
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        </DashboardCard>
      ) : null}

      <div className="grid items-stretch gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {showWeeklyProgress ? <DashboardCard accent="blue" className={polishedCard}>
          <SectionHeader eyebrow="Weekly Progress" title={model.weekly.currentGoalProgress} />
          <div className="mt-5 space-y-3 text-sm text-[#b8c2d1]">
            <p>{model.weekly.summary}</p>
            <p>{model.weekly.studyTime}</p>
            <p className="font-semibold text-white">{model.weekly.nextWeekRecommendation}</p>
          </div>
        </DashboardCard> : null}

        <DashboardCard accent="learning" className={polishedCard}>
          <SectionHeader eyebrow="Current Courses" title={model.courses.length ? `${model.courses.length} in progress` : "Ready when you are"} />
          <div className="mt-5 space-y-4">
            {model.courses.length ? model.courses.map((course) => (
              <div key={course.id}>
                <div className="mb-2 flex justify-between gap-3 text-sm">
                  <span className="truncate font-bold text-white">{course.title}</span>
                  <span className="text-indigo-200">{course.progress}%</span>
                </div>
                <ProgressBar value={course.progress} />
              </div>
            )) : <EmptyLine>Your Mentor will place active courses here after your first goal is set.</EmptyLine>}
          </div>
        </DashboardCard>

        <DashboardCard accent="yellow" className={polishedCard}>
          <SectionHeader eyebrow="Upcoming Reviews" title={model.upcomingReviews.length ? `${model.upcomingReviews.length} ready for review` : "Nothing overdue"} />
          <div className="mt-5 space-y-3">
            {model.upcomingReviews.length ? model.upcomingReviews.map((activity) => (
              <Link key={activity.id} href={`/dashboard/education/activities/${activity.id}`} className="block rounded-xl border border-[#343e50] bg-[#111722] p-3 transition duration-200 hover:border-indigo-300/50 hover:bg-[#151c29] motion-reduce:transition-none">
                <p className="font-bold text-white">{activity.title}</p>
                <p className="mt-1 text-xs text-[#9aa7b8]">{activity.session_next_recommendation || "Review this concept with your Mentor."}</p>
              </Link>
            )) : <EmptyLine>Your review queue is clear. New reviews appear only when saved learning evidence calls for one.</EmptyLine>}
          </div>
        </DashboardCard>

        {showAchievements ? <DashboardCard accent="green" className={polishedCard}>
          <SectionHeader eyebrow="Achievements" title={model.achievements.length ? "Progress worth recognizing" : "Your milestones will be earned"} />
          <div className="mt-5 space-y-3">
            {model.achievements.length ? model.achievements.map((achievement) => (
              <div key={achievement.id} className="rounded-xl border border-green-400/25 bg-green-400/5 p-3">
                <p className="font-bold text-white">{achievement.title}</p>
                <p className="mt-1 text-xs leading-5 text-[#aeb8c7]">{achievement.message}</p>
              </div>
            )) : <EmptyLine>Complete real learning work to unlock meaningful achievements.</EmptyLine>}
          </div>
        </DashboardCard> : null}

        <DashboardCard accent="purple" className={polishedCard}>
          <SectionHeader eyebrow="Knowledge Growth" title={model.knowledgeGrowth.headline} />
          <p className="mt-4 text-sm leading-6 text-[#aeb8c7]">{model.knowledgeGrowth.detail}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {model.knowledgeGrowth.dimensions.map((dimension) => (
              <span key={dimension.id} className="rounded-full border border-[#343e50] bg-[#111722] px-3 py-1.5 text-xs font-bold text-[#d8deea]">
                {dimension.label}: {dimension.level.replace("-", " ")}
              </span>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard accent="blue" className={polishedCard}>
          <SectionHeader eyebrow="Recent Activity" title={model.recentActivity.length ? "Your latest learning signals" : "No activity yet"} />
          <div className="mt-5 space-y-3">
            {model.recentActivity.length ? model.recentActivity.slice(0, 4).map((event) => (
              <div key={event.id} className="border-l-2 border-indigo-300/45 pl-3">
                <p className="text-sm font-bold text-white">{event.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8f9cad]">{event.detail}</p>
              </div>
            )) : <EmptyLine>Your completed sessions, reflections, and goal changes will appear here.</EmptyLine>}
          </div>
        </DashboardCard>
      </div>
    </section>
  );
}
