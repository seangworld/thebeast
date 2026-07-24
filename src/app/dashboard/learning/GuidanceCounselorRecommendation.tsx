import Link from "next/link";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { LifelongEducationRoadmap } from "@/lib/education/lifelongRoadmap";
import type { LearningMissionControlModel } from "@/lib/learning/missionControl";
import { buildGuidanceCounselorMissionAssignment } from "@/lib/learning/missionAssignment";

export default function GuidanceCounselorRecommendation({
  mission,
  roadmap,
  learnerName,
}: {
  mission: LearningMissionControlModel["mission"];
  roadmap: LifelongEducationRoadmap;
  learnerName: string;
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
      data-adaptive-reason={mission.recommendationReason}
      data-roadmap-progress={mission.journeyProgressLabel}
      className="grid scroll-mt-24 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]"
    >
      <DashboardCard accent="purple">
        <SectionHeader
          eyebrow="Current recommendation · Today’s assignment from your Guidance Counselor"
          title={mission.missionTitle}
          description={assignment.introduction}
          action={<ModuleBadge module="learning" label={mission.durationLabel} />}
        />
        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["Why I chose this", assignment.why],
            ["Expected outcome", assignment.expectedOutcome],
            ["Roadmap connection", assignment.roadmapConnection],
            ["What happens after", assignment.afterCompletion],
          ].map(([label, detail]) => (
            <div
              key={label}
              className="rounded-2xl border border-indigo-300/20 bg-indigo-300/[0.07] p-4"
            >
              <dt className="text-xs font-black uppercase tracking-[0.12em] text-indigo-200">
                {label}
              </dt>
              <dd className="mt-2 text-sm leading-6 text-indigo-50">
                {detail}
              </dd>
            </div>
          ))}
        </dl>
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

      <DashboardCard accent="learning">
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
    </section>
  );
}
