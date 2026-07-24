import Link from "next/link";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { LifelongEducationRoadmap } from "@/lib/education/lifelongRoadmap";
import { getRoadmapCardAction } from "@/lib/education/contextualActions";

const statusLabels = {
  known: "Current",
  exploring: "Exploring",
  "needs-context": "Discuss next",
} as const;

export default function EducationalCareerRoadmap({
  roadmap,
}: {
  roadmap: LifelongEducationRoadmap;
}) {
  return (
    <section id="educational-career-roadmap" className="scroll-mt-24">
      <span id="mentor-plan" className="block scroll-mt-24" aria-hidden="true" />
      <DashboardCard accent="learning">
        <SectionHeader
          eyebrow="Central artifact"
          title={roadmap.title}
          description={roadmap.description}
          action={<ModuleBadge module="learning" label="Lifelong roadmap" />}
        />

        <div className="mt-5 rounded-xl border border-indigo-300/30 bg-indigo-300/10 p-4 sm:p-5">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-indigo-200">
            Owned by your {roadmap.owner}
          </p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-indigo-50">
            {roadmap.updatePolicy}
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roadmap.sections.map((section) => {
            const action = getRoadmapCardAction(section);
            return (
              <article
                key={section.id}
                className="flex min-w-0 flex-col rounded-xl border border-[#2a3242] bg-[#111827] p-4 sm:p-5"
                data-roadmap-section={section.id}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-base font-black text-white">
                    {section.title}
                  </h3>
                  <span
                    className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#aeb9ca]"
                    data-roadmap-status={section.status}
                  >
                    {statusLabels[section.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm font-semibold leading-6 text-indigo-100">
                  {section.summary}
                </p>
                <ul className="mt-4 grid gap-2 text-sm leading-6 text-[#aeb9ca]">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-indigo-300" aria-hidden="true">
                        •
                      </span>
                      <span className="min-w-0">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={action.href}
                  className="mt-auto pt-5 text-sm font-black text-indigo-200 transition hover:text-white"
                >
                  {action.label} <span aria-hidden="true">→</span>
                </Link>
              </article>
            );
          })}
        </div>
      </DashboardCard>
    </section>
  );
}
