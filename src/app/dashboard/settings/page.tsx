import Link from "next/link";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  personalHubSections,
  personalInformationCanonicalRoute,
} from "@/lib/platform/personalHub";

export default function SettingsPage() {
  const availableSections = personalHubSections.filter(
    (section) => section.availability === "available"
  );
  const plannedSections = personalHubSections.filter(
    (section) => section.availability === "planned"
  );

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="beastos" label="Personal Hub" />
              <h1 className="beast-title">Your shared Beast profile</h1>
              <p className="beast-subtitle">
                Keep the information Beast uses across your applications in one
                place. Available settings open a real saved workflow; upcoming
                settings are clearly marked until their controls are ready.
              </p>
            </div>
            <Link
              href={personalInformationCanonicalRoute}
              className="beast-button"
            >
              Edit personal information
            </Link>
          </div>
        </section>

        <section aria-label="Available Personal Hub settings">
          <SectionHeader
            eyebrow="Available now"
            title="Manage your information"
            description="These settings are connected to your saved Beast account."
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {availableSections.map((section) => (
              <Link
                key={section.id}
                href={section.href}
                data-personal-hub-availability="available"
                className="group rounded-2xl border border-[#2a3242] bg-[#111827] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#38bdf8]/60 hover:bg-[#202634] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8]"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-black text-white">{section.label}</h2>
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide text-emerald-100">
                    Available
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#aeb9c8]">
                  {section.description}
                </p>
                <span className="mt-5 inline-flex text-sm font-black text-[#91cbff] group-hover:text-white">
                  Open settings <span aria-hidden="true" className="ml-1">→</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <DashboardCard accent="beastos">
          <SectionHeader
            eyebrow="Coming later"
            title="Planned Personal Hub settings"
            description="These areas are part of the Personal Hub plan, but they do not have approved saved workflows yet."
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plannedSections.map((section) => (
              <article
                key={section.id}
                id={section.id}
                data-personal-hub-availability="planned"
                className="scroll-mt-24 rounded-2xl border border-dashed border-[#344052] bg-[#0f1419] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-black text-[#d8dee8]">{section.label}</h2>
                  <span className="rounded-full border border-[#465266] bg-[#1a1f2b] px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide text-[#9aa7b8]">
                    Planned
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#7f8da3]">
                  {section.description}
                </p>
                <p className="mt-5 text-xs font-bold text-[#68768b]">
                  Not available yet
                </p>
              </article>
            ))}
          </div>
        </DashboardCard>
      </div>
    </main>
  );
}
