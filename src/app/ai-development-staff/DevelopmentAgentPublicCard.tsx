import Image from "next/image";
import Link from "next/link";
import type { publicDevelopmentAgentProfiles } from "@/lib/developmentAgentProfiles";

type PublicProfile = (typeof publicDevelopmentAgentProfiles)[number];

export function DevelopmentAgentPublicCard({ profile }: { profile: PublicProfile }) {
  const assessment = profile.capabilityAssessment;
  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-[#111827] p-5">
      <div className="flex items-start gap-4">
        <Image src={profile.portraitUrl} alt={profile.portraitAlt} width={72} height={72} className="h-[72px] w-[72px] rounded-2xl object-cover" />
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-200">Development &amp; Operations AI</p>
          <h2 className="mt-1 text-xl font-black text-white">{profile.name}</h2>
          <p className="mt-1 text-sm font-bold text-amber-200">{profile.title}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{profile.role}</p>
      <dl className="mt-5 grid gap-3 border-t border-white/10 pt-4 text-sm">
        <div><dt className="text-xs font-black uppercase tracking-wide text-slate-500">Software generation</dt><dd className="mt-1 font-bold text-white">{assessment.softwareGeneration}</dd></div>
        <div><dt className="text-xs font-black uppercase tracking-wide text-slate-500">Designed autonomy</dt><dd className="mt-1 font-bold text-white">Knight Level {assessment.autonomy.level} · User as {assessment.autonomy.userRole}</dd></div>
        <div><dt className="text-xs font-black uppercase tracking-wide text-slate-500">Authority</dt><dd className="mt-1 font-bold text-white">{assessment.authority.classification}</dd></div>
      </dl>
      <Link href={`/ai-development-staff/${profile.id}`} className="beast-button mt-6 inline-flex w-fit">View evidence and boundaries</Link>
    </article>
  );
}
