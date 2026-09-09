import Link from "next/link";
import { getDigitalProfessional } from "@/lib/digitalStaff";

const staffIntents = [
  { professionalId: "fusion-director", title: "Choose my next priority", description: "Work out what matters most across your life." },
  { professionalId: "money-coach", title: "Plan my money", description: "Understand your bills, budget, and financial tradeoffs." },
  { professionalId: "guidance-counselor", title: "Plan education or career", description: "Explore your goals and possible next steps." },
  { professionalId: "tutor", title: "Get help learning", description: "Work through a question or practice a skill." },
  { professionalId: "health-advisor", title: "Prepare for a health appointment", description: "Organize questions and understand your health records." },
] as const;

export function StaffIntentChoices({ headingId, compact = false }: { headingId: string; compact?: boolean }) {
  return (
  <section aria-labelledby={headingId}>
    <h2 id={headingId} className="text-2xl font-black text-white">
      What would you like help with?
    </h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
      Choose a goal to open the right conversation. Not sure where to start? Choose your next priority with the Director.
    </p>
    <ul className={compact ? "mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3" : "mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
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
              className={`block h-full rounded-2xl border border-cyan-300/20 bg-cyan-300/5 ${compact ? "p-3" : "p-5"} transition hover:border-cyan-300/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200`}
            >
              <h3 className={compact ? "text-base font-black text-white" : "text-lg font-black text-white"}>{intent.title}</h3>
              {!compact ? <p className="mt-2 text-sm leading-6 text-slate-300">{intent.description}</p> : null}
              <p className="mt-3 text-xs font-bold text-cyan-200">{professional.name} · {professional.role}</p>
              <p className="mt-2 text-xs text-slate-400">{professional.statusLabel}</p>
              <span className={`${compact ? "mt-2" : "mt-4"} inline-block text-sm font-bold text-cyan-200`}>
                {canConverse ? "Open conversation →" : "View profile →"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  </section>
  );
}
