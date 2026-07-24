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
  const roadmapItems = roadmap.sections
    .filter((section) => section.status !== "known")
    .slice(0, 3);

  return (
    <section
      aria-labelledby="guidance-counselor-recommendation-title"
      className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]"
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
          description="A quick view of the roadmap your Guidance Counselor is maintaining with you."
        />
        <ul className="mt-5 grid gap-3">
          {(roadmapItems.length > 0 ? roadmapItems : roadmap.sections.slice(0, 3)).map(
            (section) => (
              <li
                key={section.id}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-3"
              >
                <p className="text-sm font-black text-white">{section.title}</p>
                <p className="mt-1 text-sm leading-6 text-[#aeb9ca]">
                  {section.summary}
                </p>
              </li>
            )
          )}
        </ul>
        <Link
          href="#educational-career-roadmap"
          className="beast-button-secondary mt-5 inline-flex w-full justify-center sm:w-fit"
        >
          View full roadmap
        </Link>
      </DashboardCard>
    </section>
  );
}
