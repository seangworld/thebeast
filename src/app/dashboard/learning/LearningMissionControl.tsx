import Link from "next/link";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { LearningMissionControlModel } from "@/lib/learning/missionControl";

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#090d14]" aria-hidden="true">
      <div
        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-300"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[#343e50] bg-[#111722] p-4 text-sm leading-6 text-[#9aa7b8]">
      {children}
    </p>
  );
}

export default function LearningMissionControl({ model }: { model: LearningMissionControlModel }) {
  return (
    <section aria-labelledby="learning-mission-control-title" className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <ModuleBadge module="learning" label="Learning Mission Control" />
          <h1 id="learning-mission-control-title" className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Your learning, clearly in view
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#aeb8c7]">
            See your momentum, your next mission, and the evidence your Mentor is using to guide you.
          </p>
        </div>
        <Link href="#mentor-session" className="beast-button-secondary w-fit">
          Talk with your Mentor
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardCard accent="learning" className="min-h-[310px]">
          <div className="flex h-full flex-col justify-between gap-6">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="beast-kicker">Learning Health Score</p>
                <p className="mt-3 text-6xl font-black tracking-tight text-white">
                  {model.healthScore}<span className="text-2xl text-[#7f8da3]">/100</span>
                </p>
                <p className="mt-2 font-bold text-indigo-200">{model.healthLabel}</p>
              </div>
              <div className="rounded-2xl border border-indigo-300/30 bg-indigo-300/10 px-4 py-3 text-right">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-200">This week</p>
                <p className="mt-1 text-sm font-semibold text-white">{model.weekly.sessionsCompleted}</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {model.healthFactors.map((factor) => (
                <div key={factor.label} className="rounded-xl border border-[#2b3445] bg-[#111722] p-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold text-white">{factor.label}</span>
                    <span className="text-[#aeb8c7]">{factor.value}/{factor.maximum}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#7f8da3]">{factor.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        <DashboardCard accent="purple" className="min-h-[310px]">
          <p className="beast-kicker">Current Mission</p>
          <h2 className="mt-3 text-2xl font-black text-white">{model.mission.missionTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-[#b8c2d1]">{model.mission.recommendationReason}</p>
          <div className="mt-5 rounded-xl border border-[#2b3445] bg-[#111722] p-4">
            <div className="flex justify-between gap-3 text-sm">
              <span className="font-bold text-white">{model.mission.missionLabel}</span>
              <span className="text-indigo-200">{model.mission.durationLabel}</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#8f9cad]">{model.mission.journeyProgressLabel}</p>
          </div>
          <Link href={model.mission.primaryAction.href} className="beast-button-primary mt-5 inline-flex w-full justify-center">
            {model.mission.primaryAction.label}
          </Link>
        </DashboardCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <DashboardCard accent="blue">
          <SectionHeader eyebrow="Weekly Progress" title={model.weekly.currentGoalProgress} />
          <div className="mt-5 space-y-3 text-sm text-[#b8c2d1]">
            <p>{model.weekly.summary}</p>
            <p>{model.weekly.studyTime}</p>
            <p className="font-semibold text-white">{model.weekly.nextWeekRecommendation}</p>
          </div>
        </DashboardCard>

        <DashboardCard accent="learning">
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

        <DashboardCard accent="yellow">
          <SectionHeader eyebrow="Upcoming Reviews" title={model.upcomingReviews.length ? `${model.upcomingReviews.length} ready for review` : "Nothing overdue"} />
          <div className="mt-5 space-y-3">
            {model.upcomingReviews.length ? model.upcomingReviews.map((activity) => (
              <Link key={activity.id} href={`/dashboard/education/activities/${activity.id}`} className="block rounded-xl border border-[#343e50] bg-[#111722] p-3 transition hover:border-indigo-300/50">
                <p className="font-bold text-white">{activity.title}</p>
                <p className="mt-1 text-xs text-[#9aa7b8]">{activity.session_next_recommendation || "Review this concept with your Mentor."}</p>
              </Link>
            )) : <EmptyLine>Your review queue is clear. New reviews appear only when saved learning evidence calls for one.</EmptyLine>}
          </div>
        </DashboardCard>

        <DashboardCard accent="green">
          <SectionHeader eyebrow="Achievements" title={model.achievements.length ? "Progress worth recognizing" : "Your milestones will be earned"} />
          <div className="mt-5 space-y-3">
            {model.achievements.length ? model.achievements.map((achievement) => (
              <div key={achievement.id} className="rounded-xl border border-green-400/25 bg-green-400/5 p-3">
                <p className="font-bold text-white">{achievement.title}</p>
                <p className="mt-1 text-xs leading-5 text-[#aeb8c7]">{achievement.message}</p>
              </div>
            )) : <EmptyLine>Complete real learning work to unlock meaningful achievements.</EmptyLine>}
          </div>
        </DashboardCard>

        <DashboardCard accent="purple">
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

        <DashboardCard accent="blue">
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
