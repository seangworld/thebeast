import {
  DigitalProfessionalCard,
  DigitalProfessionalStatusBadge,
} from "./DigitalProfessionalCard";
import { digitalProfessionals } from "@/lib/digitalStaff";

export default function DigitalStaffPage() {
  const director = digitalProfessionals.find(
    (professional) => professional.id === "fusion-director"
  )!;
  const team = digitalProfessionals.filter(
    (professional) => professional.id !== director.id
  );

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
            BeastOS Digital Staff
          </p>
          <h1 className="mt-2 text-4xl font-black text-white">
            Digital Staff
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Meet the Digital Professionals who coordinate, guide, and assist
            across your Beast ecosystem.
          </p>
        </header>

        <section aria-labelledby="organization-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2
                id="organization-heading"
                className="text-2xl font-black text-white"
              >
                Organization chart
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                The Owner retains decision authority. The Fusion Director
                coordinates; each specialist retains product responsibility.
              </p>
            </div>
            <DigitalProfessionalStatusBadge professional={director} />
          </div>

          <ol className="mt-6">
            <li>
              <div className="mx-auto max-w-xl">
                <DigitalProfessionalCard professional={director} />
              </div>
              <div aria-hidden="true" className="mx-auto h-8 w-px bg-white/20" />
              <ol
                className="grid gap-4 md:grid-cols-3"
                aria-label="Professionals reporting to the Fusion Director"
              >
                {team.map((professional) => (
                  <li key={professional.id} className="min-w-0">
                    <DigitalProfessionalCard professional={professional} />
                  </li>
                ))}
              </ol>
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}
