import {
  DigitalProfessionalCard,
} from "./DigitalProfessionalCard";
import {
  getDigitalProfessional,
  digitalStaffDirector,
  digitalStaffSpecialists,
} from "@/lib/digitalStaff";
import Link from "next/link";
import { OwnerDevelopmentStaffDirectory } from "./OwnerDevelopmentStaffDirectory";

const staffIntents = [
  { professionalId: "fusion-director", title: "Choose my next priority", description: "Work out what matters most across your life." },
  { professionalId: "money-coach", title: "Plan my money", description: "Understand your bills, budget, and financial tradeoffs." },
  { professionalId: "guidance-counselor", title: "Plan education or career", description: "Explore your goals and possible next steps." },
  { professionalId: "tutor", title: "Get help learning", description: "Work through a question or practice a skill." },
  { professionalId: "health-advisor", title: "Prepare for a health appointment", description: "Organize questions and understand your health records." },
] as const;

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

        <section aria-labelledby="staff-intent-heading">
          <h2 id="staff-intent-heading" className="text-2xl font-black text-white">
            What would you like help with?
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
            Choose a goal to open the right conversation. Not sure where to start? Choose your next priority with the Director.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {staffIntents.map((intent) => {
              const professional = getDigitalProfessional(intent.professionalId);
              if (!professional) return null;
              const canConverse = Boolean(professional.conversationHref) &&
                (professional.status === "available" || professional.status === "limited");
              return (
                <li key={intent.professionalId} className="min-w-0">
                  <Link
                    href={canConverse ? professional.conversationHref! : professional.href}
                    prefetch={false}
                    className="block h-full rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5 transition hover:border-cyan-300/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
                  >
                    <h3 className="text-lg font-black text-white">{intent.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{intent.description}</p>
                    <p className="mt-3 text-xs font-bold text-cyan-200">{professional.name} · {professional.role}</p>
                    <p className="mt-2 text-xs text-slate-400">{professional.statusLabel}</p>
                    <span className="mt-4 inline-block text-sm font-bold text-cyan-200">
                      {canConverse ? "Open conversation →" : "View profile →"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <details className="rounded-2xl border border-white/10 bg-[#111827] p-5">
          <summary className="cursor-pointer rounded text-lg font-black text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">
            Advanced: staff profiles and development details
          </summary>
          <div className="mt-6 space-y-8">
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

            <OwnerDevelopmentStaffDirectory />

            <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5" aria-labelledby="development-ai-evidence-heading">
              <h2 id="development-ai-evidence-heading" className="text-lg font-black text-white">How BeastFusion&apos;s development AI works</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Public-safe profiles explain the Development &amp; Operations agents&apos; demonstrated capabilities, designed autonomy, important limitations, and authority boundaries without exposing private execution evidence.</p>
              <Link href="/ai-development-staff" className="beast-button mt-4 inline-flex">Explore development AI evidence</Link>
            </section>

          </div>
        </details>

        <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5" aria-labelledby="historical-knowledge-heading">
          <h2 id="historical-knowledge-heading" className="text-lg font-black text-white">Organize earlier conversations</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Your Digital Staff can organize useful information from conversations that happened before structured review was available. Nothing is saved as an authoritative record until you review it.</p>
          <Link href="/dashboard/digital-staff/reconciliation" className="beast-button mt-4 inline-flex">Review earlier knowledge</Link>
        </section>
      </div>
    </main>
  );
}
