import {
  DigitalProfessionalCard,
} from "./DigitalProfessionalCard";
import {
  digitalStaffDirector,
  digitalStaffSpecialists,
} from "@/lib/digitalStaff";

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
            Your Director helps you choose what matters most across Beast. Your
            specialists handle money, education and career, and health.
          </p>
        </header>

        <section aria-labelledby="professionals-heading">
          <h2
            id="professionals-heading"
            className="text-2xl font-black text-white"
          >
            How your Digital Staff works
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Start with the Director when a question crosses more than one part
            of your life. Go straight to a specialist when you already know
            which area needs help.
          </p>
          <div className="mx-auto mt-6 max-w-xl" data-digital-staff-level="director">
            <DigitalProfessionalCard professional={digitalStaffDirector} />
          </div>
          <div className="mx-auto h-8 w-px bg-violet-300/30" aria-hidden="true" />
          <div className="mx-auto h-px max-w-4xl bg-violet-300/30" aria-hidden="true" />
          <ol
            className="mt-6 grid gap-4 md:grid-cols-3"
            aria-label="Specialists reporting to the Director"
            data-digital-staff-level="specialists"
          >
            {digitalStaffSpecialists.map((professional) => (
              <li key={professional.id} className="min-w-0">
                <DigitalProfessionalCard professional={professional} />
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#111827] p-5" aria-labelledby="next-step-heading">
          <h2 id="next-step-heading" className="text-lg font-black text-white">
            What should I do next?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Ask the Director when you need one priority across Beast. Select a
            profile to understand a professional&apos;s role, capabilities,
            boundaries, assigned area, and conversation entry point.
          </p>
        </section>
      </div>
    </main>
  );
}
