import Link from "next/link";
import { HistoricalKnowledgeReconciliation } from "./HistoricalKnowledgeReconciliation";

export default async function DigitalStaffReconciliationPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const professionalId = typeof params?.professionalId === "string" ? params.professionalId : undefined;
  const returnTo = typeof params?.returnTo === "string" && params.returnTo.startsWith("/dashboard/") ? params.returnTo : undefined;
  return <main className="beast-page"><div className="beast-container space-y-6"><Link href={returnTo || "/dashboard/digital-staff"} className="text-sm font-bold text-cyan-200">← {returnTo ? "Back to workspace" : "Digital Staff"}</Link><header><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Member-controlled review</p><h1 className="mt-2 text-4xl font-black text-white">Organize earlier conversations</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Review useful information from an earlier conversation and choose what should become a saved record.</p></header><HistoricalKnowledgeReconciliation professionalId={professionalId} returnTo={returnTo} /></div></main>;
}
