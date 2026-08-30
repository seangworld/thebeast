import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DigitalProfessionalPortraitPlaceholder,
  DigitalProfessionalStatusBadge,
} from "../DigitalProfessionalCard";
import {
  digitalProfessionals,
  getDigitalProfessional,
} from "@/lib/digitalStaff";
import { getMemberSpecialistAssessment } from "@/lib/memberAgentCapabilityFramework";

export function generateStaticParams() {
  return digitalProfessionals.map(({ id }) => ({ professionalId: id }));
}

export default async function DigitalProfessionalPage({
  params,
}: {
  params: Promise<{ professionalId: string }>;
}) {
  const { professionalId } = await params;
  const professional = getDigitalProfessional(professionalId);
  if (!professional) notFound();
  const capabilityAssessment = getMemberSpecialistAssessment(professional.canonicalId);

  const sections = [
    ["Responsibilities", professional.responsibilities],
    ["Experience", professional.experience],
    ["Capabilities", professional.capabilities],
    ["Boundaries", professional.limitations],
    ["Data this professional can access", professional.dataAccess],
    ["Data this professional cannot access", professional.unavailableData],
  ] as const;
  return (
    <main className="beast-page">
      <div className="beast-container space-y-6">
        <Link
          href="/dashboard/digital-staff"
          className="text-sm font-bold text-cyan-200 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
        >
          ← Digital Staff
        </Link>

        <header className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
              <DigitalProfessionalPortraitPlaceholder
                professional={professional}
                size="profile"
              />
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                  {professional.team} · About Me
                </p>
                <h1 className="mt-2 break-words text-4xl font-black text-white">
                  {professional.name}
                </h1>
                <p className="mt-1 text-xl font-bold text-cyan-100">
                  {professional.role}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {professional.title}
                </p>
              </div>
            </div>
            <DigitalProfessionalStatusBadge professional={professional} />
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-300">
            {professional.biography}
          </p>
          {professional.conversationHref ? (
            <Link
              href={professional.conversationHref}
              className="beast-button mt-5 inline-flex"
            >
              Start a conversation with {professional.name}
            </Link>
          ) : null}
          <div className="mt-5 rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-cyan-200">
              Mission
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white">
              {professional.mission}
            </p>
          </div>
        </header>

        {capabilityAssessment ? (
          <section className="rounded-2xl border border-indigo-300/20 bg-indigo-300/5 p-5" aria-labelledby="capability-assessment-heading">
            <h2 id="capability-assessment-heading" className="text-xl font-black text-white">Capability, autonomy, and authority</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{capabilityAssessment.softwareGeneration} · Knight Level {capabilityAssessment.autonomy.level}, user as {capabilityAssessment.autonomy.userRole} · {capabilityAssessment.authority.classification}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{capabilityAssessment.autonomy.conciseDefinition}</p>
            <p className="mt-3 text-xs text-slate-400">Environment-bound self-assessment {capabilityAssessment.assessedVersion}, assessed {capabilityAssessment.assessedAt}. This is not certification or a universal industry standard.</p>
            <div className="mt-4 flex flex-wrap gap-3"><Link href={`/ai-specialists/${professional.id}`} className="beast-button-secondary">View public evidence</Link><Link href="/ai-specialists/methodology" className="beast-button-secondary">Assessment methodology</Link></div>
          </section>
        ) : null}

        <dl className="grid gap-4 sm:grid-cols-2">
          {[
            ["Team", professional.team],
            ["Reports to", professional.reportsTo],
            ["Assigned modules", professional.assignedModules.join(", ")],
            ["Status", professional.statusLabel],
            ["Version", professional.version],
            ["Last activity", professional.lastActivity],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-[#111827] p-4"
            >
              <dt className="text-xs font-black uppercase tracking-wide text-slate-400">
                {label}
              </dt>
              <dd className="mt-2 text-sm font-bold capitalize text-white">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        {professional.directReports.length ? (
          <section className="rounded-2xl border border-violet-300/20 bg-violet-300/5 p-5" aria-labelledby="direct-reports-heading">
            <h2 id="direct-reports-heading" className="text-lg font-black text-white">
              Specialists reporting to the Director
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {professional.directReports.map((professionalId) => {
                const report = getDigitalProfessional(professionalId);
                return report ? (
                  <Link
                    key={professionalId}
                    href={report.href}
                    className="rounded-xl border border-white/10 p-4 font-bold text-cyan-100 hover:border-cyan-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
                  >
                    {report.name}
                    <span className="mt-1 block text-xs font-normal text-slate-400">
                      {report.role} · {report.team}
                    </span>
                  </Link>
                ) : null;
              })}
            </div>
          </section>
        ) : null}

        <section
          className="rounded-2xl border border-white/10 bg-[#111827] p-5"
          aria-labelledby="relationships-heading"
        >
          <h2 id="relationships-heading" className="text-lg font-black text-white">
            Collaborates With
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {professional.collaboratesWith.map((relationship) => {
              const collaborator = relationship.professionalId
                ? getDigitalProfessional(relationship.professionalId)
                : null;
              const content = (
                <>
                  <p className="font-bold text-white">{relationship.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {relationship.relationship}
                  </p>
                </>
              );
              return collaborator ? (
                <Link
                  key={relationship.label}
                  href={collaborator.href}
                  className="rounded-xl border border-white/10 p-4 hover:border-cyan-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={relationship.label}
                  className="rounded-xl border border-white/10 p-4"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map(([title, items]) => (
            <section
              key={title}
              className="rounded-2xl border border-white/10 bg-[#111827] p-5"
            >
              <h2 className="text-lg font-black text-white">{title}</h2>
              {items.length ? (
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-300">
                  {items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  None while this professional is not released.
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
