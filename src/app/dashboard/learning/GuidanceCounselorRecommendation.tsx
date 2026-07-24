import Link from "next/link";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { LifelongEducationRoadmap } from "@/lib/education/lifelongRoadmap";
import type { GuidanceWorkflowRecommendation } from "@/lib/education/guidanceWorkflow";
import type { LearningMissionControlModel } from "@/lib/learning/missionControl";
import { buildGuidanceCounselorMissionAssignment } from "@/lib/learning/missionAssignment";

export default function GuidanceCounselorRecommendation({
  mission,
  roadmap,
  learnerName,
  nextAction,
}: {
  mission: LearningMissionControlModel["mission"];
  roadmap: LifelongEducationRoadmap;
  learnerName: string;
  nextAction: GuidanceWorkflowRecommendation;
}) {
  const assignment = buildGuidanceCounselorMissionAssignment(
    learnerName,
    mission
  );
  const roadmapStatus = roadmap.sections.reduce(
    (summary, section) => ({
      ...summary,
      [section.status]: summary[section.status] + 1,
    }),
    { known: 0, exploring: 0, "needs-context": 0 }
  );

  return (
    <section
      id="mentor-session"
      aria-labelledby="guidance-counselor-recommendation-title"
      data-guidance-next-action={nextAction.action}
      data-adaptive-reason={mission.recommendationReason}
      data-roadmap-progress={mission.journeyProgressLabel}
      className="scroll-mt-24 space-y-5 sm:space-y-6"
      data-guidance-decision-flow="recommendation-roadmap-assignment"
    >
      <DashboardCard accent="purple" className="h-full transition-[border-color,box-shadow] duration-300 hover:border-indigo-300/30 hover:shadow-[0_20px_55px_rgba(0,0,0,0.2)]">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:items-end">
          <SectionHeader
            eyebrow={`Current recommendation · ${nextAction.eyebrow}`}
            title={nextAction.title}
            description={nextAction.introduction}
            action={<ModuleBadge module="learning" label="One next step" />}
          />
          <div className="rounded-2xl border border-indigo-300/20 bg-indigo-300/[0.07] p-4 sm:p-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-200">
              Why I’m recommending this
            </p>
            <p className="mt-2 text-sm leading-6 text-indigo-50">
              {nextAction.why}
            </p>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-indigo-200">
              What we’ll get from it
            </p>
            <p className="mt-2 text-sm leading-6 text-indigo-50">
              {nextAction.outcome}
            </p>
          </div>
        </div>
        <Link
          href={nextAction.href}
          className="beast-button-primary mt-5 inline-flex w-full justify-center sm:w-fit"
        >
          {nextAction.actionLabel}
        </Link>
      </DashboardCard>

      <DashboardCard accent="learning" className="h-full transition-[border-color,box-shadow] duration-300 hover:border-cyan-300/25 hover:shadow-[0_20px_55px_rgba(0,0,0,0.2)]">
        <SectionHeader
          eyebrow="Educational Roadmap summary"
          title="Where we are heading"
          description="A status overview of the roadmap below, without repeating every roadmap item."
        />
        <dl className="mt-5 grid grid-cols-3 gap-3">
          {[
            ["Current", roadmapStatus.known],
            ["Exploring", roadmapStatus.exploring],
            ["Discuss next", roadmapStatus["needs-context"]],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-[#2a3242] bg-[#111827] p-3 text-center"
            >
              <dt className="text-xs font-bold uppercase tracking-wide text-[#8f9cad]">
                {label}
              </dt>
              <dd className="mt-2 text-2xl font-black text-white">{value}</dd>
            </div>
          ))}
        </dl>
        <Link
          href="#mentor-plan"
          className="beast-button-secondary mt-5 inline-flex w-full justify-center sm:w-fit"
        >
          View full roadmap
        </Link>
      </DashboardCard>

      <DashboardCard accent="purple" className="h-full transition-[border-color,box-shadow] duration-300 hover:border-indigo-300/30 hover:shadow-[0_20px_55px_rgba(0,0,0,0.2)]">
        <SectionHeader
          eyebrow="Today’s assignment from your Guidance Counselor"
          title={mission.missionTitle}
          description={assignment.introduction}
          action={<ModuleBadge module="learning" label={mission.durationLabel} />}
        />
        <div className="mt-5 rounded-2xl border border-indigo-300/20 bg-indigo-300/[0.07] p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-indigo-200">
            Why I chose this assignment
          </p>
          <p className="mt-2 text-sm leading-6 text-indigo-50">
            {assignment.why}
          </p>
        </div>
        <details className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <summary className="cursor-pointer text-sm font-black text-indigo-100">
            What this assignment will accomplish
          </summary>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["Expected outcome", assignment.expectedOutcome],
              ["Roadmap connection", assignment.roadmapConnection],
              ["What happens after", assignment.afterCompletion],
            ].map(([label, detail]) => (
              <div key={label}>
                <dt className="text-xs font-black uppercase tracking-[0.12em] text-[#9aa7b8]">
                  {label}
                </dt>
                <dd className="mt-2 text-sm leading-6 text-[#dbe3ef]">
                  {detail}
                </dd>
              </div>
            ))}
          </dl>
        </details>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-[#aeb8c7]">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            {mission.missionLabel}
          </span>
          <span>{mission.journeyRemainingLabel}</span>
        </div>
        <Link
          href={mission.primaryAction.href}
          data-adaptive-action={mission.primaryAction.label}
          className="beast-button-primary mt-5 inline-flex w-full justify-center sm:w-fit"
        >
          {assignment.actionLabel}
        </Link>
      </DashboardCard>
    </section>
  );
}
