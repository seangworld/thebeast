import Link from "next/link";
import { ModuleBadge, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { personalHubSections, personalInformationCanonicalRoute } from "@/lib/platform/personalHub";

export default function SettingsPage() {
  // Family retains its original anchor for existing links; the hub shows one combined card.
  const availableSections = personalHubSections.filter(section => section.availability === "available" && section.id !== "family");
  const plannedSections = personalHubSections.filter(section => section.availability === "planned");
  return <main className="beast-page"><div className="beast-container space-y-7">
    <section className="beast-page-header">
      <ModuleBadge module="beastos" label="Personal Hub" />
      <h1 className="beast-title mt-3">Your space in Beast</h1>
      <p className="beast-subtitle">Your personal details, family, goals, and documents—all within reach.</p>
      <Link href={personalInformationCanonicalRoute} className="beast-button mt-5">Edit personal information</Link>
    </section>
    <section aria-label="Available Personal Hub settings">
      <SectionHeader title="What would you like to manage?" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {availableSections.map(section => <Link key={section.id} href={section.href} data-personal-hub-availability="available" className="group min-w-0 rounded-2xl border border-slate-700 bg-[#111827] p-5 transition hover:border-sky-300/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300">
          <h2 className="text-lg font-bold text-white">{section.label}</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">{section.description}</p>
          <span aria-hidden="true" className="mt-5 inline-block text-sm font-semibold text-sky-300">Open →</span>
        </Link>)}
      </div>
    </section>
    <details className="rounded-xl border border-slate-800 p-5">
      <summary className="cursor-pointer text-sm font-semibold text-slate-400">Features coming later</summary>
      <p className="mt-3 text-sm text-slate-400">These settings aren’t available yet.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {plannedSections.map(section => <article key={section.id} id={section.id} data-personal-hub-availability="planned" className="scroll-mt-24">
          <h2 className="text-sm font-semibold text-slate-300">{section.label}</h2><p className="mt-1 text-sm text-slate-500">{section.description}</p>
        </article>)}
      </div>
    </details>
  </div></main>;
}
