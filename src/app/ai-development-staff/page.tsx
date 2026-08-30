import Link from "next/link";
import { publicDevelopmentAgentProfiles } from "@/lib/developmentAgentProfiles";
import { DevelopmentAgentPublicCard } from "./DevelopmentAgentPublicCard";

export default function PublicDevelopmentStaffPage() {
  return (
    <main className="min-h-screen bg-[#0b1018] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/10 via-[#111827] to-amber-300/[0.06] p-6 sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">BeastFusion engineering evidence</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">Capable agents. Explicit limits. Owner authority preserved.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">These profiles separate software generation, demonstrated capability, designed autonomy, and governance authority. A higher autonomy classification never grants permission to act outside an approved package.</p>
          <div className="mt-6 flex flex-wrap gap-3"><Link href="/ai-development-staff/methodology" className="beast-button">How assessment works</Link><Link href="/release-notes" className="beast-button-secondary">Release notes</Link></div>
        </header>
        <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Development and Operations AI profiles">
          {publicDevelopmentAgentProfiles.map((profile) => <DevelopmentAgentPublicCard key={profile.id} profile={profile} />)}
        </section>
        <p className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm leading-6 text-slate-400">Public profiles are a sanitized projection of the same code-owned assessment used by BeastAdmin. They omit execution state, private repository details, credentials, member data, and security-sensitive configuration.</p>
      </div>
    </main>
  );
}
