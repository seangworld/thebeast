import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { developmentAgentProfiles, getPublicDevelopmentAgentProfile } from "@/lib/developmentAgentProfiles";

export function generateStaticParams() {
  return developmentAgentProfiles.map(({ id }) => ({ agentId: id }));
}

export async function generateMetadata({ params }: { params: Promise<{ agentId: string }> }): Promise<Metadata> {
  const { agentId } = await params;
  const profile = getPublicDevelopmentAgentProfile(agentId);
  if (!profile) return {};
  return { title: `${profile.name} | BeastFusion AI`, description: profile.role, alternates: { canonical: `/ai-development-staff/${profile.id}` }, robots: { index: true, follow: true } };
}

function EvidenceList({ items }: { items: readonly string[] }) {
  return <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-300">{items.map((item) => <li key={item}>• {item}</li>)}</ul>;
}

export default async function PublicDevelopmentAgentPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const profile = getPublicDevelopmentAgentProfile(agentId);
  if (!profile) notFound();
  const assessment = profile.capabilityAssessment;
  return (
    <main className="min-h-screen bg-[#0b1018] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/ai-development-staff" className="inline-flex text-sm font-bold text-cyan-200">← Development &amp; Operations AI</Link>
        <header className="rounded-3xl border border-cyan-300/20 bg-[#111827] p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <Image src={profile.portraitUrl} alt={profile.portraitAlt} width={112} height={112} className="h-28 w-28 rounded-3xl object-cover" priority />
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Evidence-backed AI profile</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">{profile.name}</h1><p className="mt-2 text-lg font-bold text-amber-200">{profile.title}</p></div>
          </div>
          <p className="mt-6 max-w-4xl leading-7 text-slate-300">{profile.purpose}</p>
        </header>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Assessment summary">
          {[
            ["Software", assessment.softwareGeneration],
            ["Capability evidence", "OpenAI four qualitative dimensions"],
            ["Designed autonomy", `Knight L${assessment.autonomy.level} · ${assessment.autonomy.userRole}`],
            ["Authority", assessment.authority.classification],
          ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-[#111827] p-4"><h2 className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</h2><p className="mt-2 text-sm font-bold leading-6 text-white">{value}</p></div>)}
        </section>
        <section className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-5"><h2 className="text-sm font-black uppercase tracking-wide text-amber-200">Authority boundary</h2><p className="mt-2 font-bold leading-7">{profile.authorityBoundary}</p><EvidenceList items={assessment.authority.prohibited} /></section>
        <section className="rounded-2xl border border-white/10 bg-[#111827] p-5"><h2 className="text-xl font-black">Designed autonomy assessment</h2><p className="mt-3 leading-7 text-slate-300">Knight Level {assessment.autonomy.level}: {assessment.autonomy.conciseDefinition}</p><EvidenceList items={assessment.autonomy.evidence} /><p className="mt-4 text-sm text-slate-400">Self-assessed on {assessment.assessedAt} for {assessment.assessedVersion}. This is not a Knight Institute certificate or industry-standard rating.</p></section>
        <section className="grid gap-4 md:grid-cols-2">
          {assessment.capability.map((item) => <article key={item.dimension} className="rounded-2xl border border-white/10 bg-[#111827] p-5"><h2 className="text-lg font-black">{item.label}</h2><p className="mt-2 text-sm leading-6 text-slate-300">{item.demonstrated}</p><h3 className="mt-4 text-xs font-black uppercase tracking-wide text-cyan-200">Evidence</h3><EvidenceList items={item.evidence} /><p className="mt-4 text-xs leading-5 text-slate-400">Limitation: {item.limitation}</p></article>)}
        </section>
        <section className="grid gap-4 md:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-[#111827] p-5"><h2 className="text-xl font-black">Demonstrated capabilities</h2><EvidenceList items={profile.demonstratedCapabilities} /></div><div className="rounded-2xl border border-white/10 bg-[#111827] p-5"><h2 className="text-xl font-black">Important limitations</h2><EvidenceList items={profile.limitations} /></div></section>
        <Link href="/ai-development-staff/methodology" className="beast-button inline-flex">Read the assessment methodology</Link>
      </div>
    </main>
  );
}
