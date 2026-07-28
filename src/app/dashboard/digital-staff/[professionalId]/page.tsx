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

export function generateStaticParams() {
  return digitalProfessionals.map(({ id }) => ({ professionalId: id }));
}

export default function DigitalProfessionalPage({
  params,
}: {
  params: { professionalId: string };
}) {
  const professional = getDigitalProfessional(params.professionalId);
  if (!professional) notFound();

  const sections = [
    ["Responsibilities", professional.responsibilities],
    ["Experience", professional.experience],
    ["Capabilities", professional.capabilities],
    ["Limitations", professional.limitations],
    ["Data this professional can access", professional.dataAccess],
    ["Data this professional cannot access", professional.unavailableData],
  ] as const;
  const reportsTo = professional.reportsToId
    ? getDigitalProfessional(professional.reportsToId)
    : null;

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
          <div className="mt-5 rounded-xl border border-cyan-300/15 bg-cyan-300/5 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-cyan-200">
              Mission
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-white">
              {professional.mission}
            </p>
          </div>
        </header>

        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            ["Reports to", professional.reportsTo],
            ["Version", professional.version],
            ["Release status", professional.releaseStatus],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/10 bg-[#111827] p-4"
            >
              <dt className="text-xs font-black uppercase tracking-wide text-slate-400">
                {label}
              </dt>
              <dd className="mt-2 text-sm font-bold capitalize text-white">
                {label === "Reports to" && reportsTo ? (
                  <Link
                    href={reportsTo.href}
                    className="text-cyan-200 hover:text-cyan-100"
                  >
                    {value}
                  </Link>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>

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

        <aside className="rounded-xl border border-dashed border-white/15 p-4">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
            Portrait status
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {professional.portrait.portrait_url ? (
              <>
                Approved portrait:{" "}
                <span className="break-all font-mono text-xs text-slate-400">
                  {professional.portrait.portrait_url}
                </span>
                . Initials remain available if the image cannot be loaded.
              </>
            ) : (
              <>
                Placeholder reference:{" "}
                <span className="break-all font-mono text-xs text-slate-400">
                  {professional.portrait.placeholder_reference}
                </span>
                . No uploaded or generated portrait is attached.
              </>
            )}
          </p>
        </aside>
      </div>
    </main>
  );
}
