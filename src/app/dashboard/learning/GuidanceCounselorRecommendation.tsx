import Link from "next/link";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { LifelongEducationRoadmap } from "@/lib/education/lifelongRoadmap";
import type { LearningMissionControlModel } from "@/lib/learning/missionControl";

export default function GuidanceCounselorRecommendation({
  mission,
  roadmap,
}: {
  mission: LearningMissionControlModel["mission"];
  roadmap: LifelongEducationRoadmap;
}) {
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
      className="grid scroll-mt-24 gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]"
    >
      <DashboardCard accent="purple">
        <SectionHeader
          eyebrow="Current recommendation"
          title={mission.missionTitle}
          description={mission.recommendationReason}
          action={<ModuleBadge module="learning" label={mission.durationLabel} />}
        />
        <div className="mt-5 rounded-2xl border border-indigo-300/20 bg-indigo-300/[0.07] p-4">
          <p className="text-sm font-black text-white">{mission.missionLabel}</p>
          <p className="mt-2 text-sm leading-6 text-indigo-100">
            {mission.journeyProgressLabel}
          </p>
        </div>
        <Link
          href={mission.primaryAction.href}
          className="beast-button-primary mt-5 inline-flex w-full justify-center sm:w-fit"
        >
          {mission.primaryAction.label}
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
