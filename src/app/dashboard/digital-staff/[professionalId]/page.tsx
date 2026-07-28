import Link from "next/link";
import { notFound } from "next/navigation";
import {
  digitalProfessionals,
  digitalProfessionalStatusStyles,
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
    ["Capabilities", professional.capabilities],
    ["Limitations", professional.limitations],
    ["Data this professional can access", professional.dataAccess],
    ["Data this professional cannot access", professional.unavailableData],
    ["Collaborating professionals", professional.collaborators],
  ] as const;

  return (
    <main className="beast-page">
      <div className="beast-container space-y-6">
        <Link href="/dashboard/digital-staff" className="text-sm font-bold text-cyan-200 hover:text-cyan-100">
          ← Digital Staff
        </Link>
        <header className="rounded-2xl border border-white/10 bg-[#111827] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">{professional.team}</p>
              <h1 className="mt-2 text-4xl font-black text-white">{professional.name}</h1>
              <p className="mt-1 text-xl font-bold text-cyan-100">{professional.role}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${digitalProfessionalStatusStyles[professional.status]}`}>
              {professional.statusLabel}
            </span>
          </div>
          <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-300">{professional.biography}</p>
          <p className="mt-4 text-sm font-semibold text-white">Mission: {professional.mission}</p>
        </header>

        <dl className="grid gap-4 sm:grid-cols-3">
          {[
            ["Reports to", professional.reportsTo],
            ["Version", professional.version],
            ["Release status", professional.releaseStatus],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/10 bg-[#111827] p-4">
              <dt className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-2 text-sm font-bold capitalize text-white">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="grid gap-4 md:grid-cols-2">
          {sections.map(([title, items]) => (
            <section key={title} className="rounded-2xl border border-white/10 bg-[#111827] p-5">
              <h2 className="text-lg font-black text-white">{title}</h2>
              {items.length ? (
                <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-300">
                  {items.map((item) => <li key={item}>• {item}</li>)}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-400">None while this professional is not released.</p>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
