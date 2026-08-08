import Link from "next/link";
import { HistoricalKnowledgeReconciliation } from "./HistoricalKnowledgeReconciliation";

export default function DigitalStaffReconciliationPage() {
  return <main className="beast-page"><div className="beast-container space-y-6"><Link href="/dashboard/digital-staff" className="text-sm font-bold text-cyan-200">← Digital Staff</Link><header><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">AP-104 · Member-controlled review</p><h1 className="mt-2 text-4xl font-black text-white">Organize earlier conversations</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Review structured knowledge found in your earlier conversations with Avery Stone, Money Coach, Guidance Counselor, and Health Advisor.</p></header><HistoricalKnowledgeReconciliation /></div></main>;
}
