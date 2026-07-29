import {
  DigitalProfessionalCard,
} from "./DigitalProfessionalCard";
import { digitalProfessionals } from "@/lib/digitalStaff";

export default function DigitalStaffPage() {
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
            Meet the Digital Professionals who guide and support you across
            your Beast ecosystem.
          </p>
        </header>

        <section aria-labelledby="professionals-heading">
          <h2
            id="professionals-heading"
            className="text-2xl font-black text-white"
          >
            Your professionals
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Each professional works within their area and uses only the
            permissioned context needed to support you.
          </p>
          <ol
            className="mt-6 grid gap-4 md:grid-cols-3"
            aria-label="Member-facing Digital Professionals"
          >
            {digitalProfessionals.map((professional) => (
              <li key={professional.id} className="min-w-0">
                <DigitalProfessionalCard professional={professional} />
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
