import Link from "next/link";
import { BeastAdminShell } from "../admin/BeastAdminShell";
import { operationsVentures } from "@/lib/operationsNavigation";
import { OperationsFinancialSummary } from "./OperationsFinancialSummary";

export default function OperationsPage() {
  return <BeastAdminShell title="Operations" purpose="Choose a business to work on, review its results, or give your team direction." actions={<Link href="/dashboard/operations/briefing" className="min-h-11 rounded-xl bg-cyan-200 px-4 py-3 text-sm font-bold text-slate-950">Executive briefing</Link>}>
    <OperationsFinancialSummary />
    <section aria-labelledby="ventures-title">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><h2 id="ventures-title" className="text-2xl font-bold">Your ventures</h2><Link href="/dashboard/operations/opportunities" className="text-sm font-semibold text-cyan-200 hover:text-white">Explore opportunities →</Link></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{operationsVentures.map((venture) => <Link key={venture.href} href={venture.href} className="group flex min-w-0 flex-col rounded-2xl border border-white/10 bg-[#111c2b] p-6 transition hover:border-cyan-300/50 hover:bg-[#152338] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">{venture.tag}</p>
        <h3 className="mt-3 text-xl font-bold text-white">{venture.name}</h3>
        <p className="mb-6 mt-3 flex-1 text-base leading-7 text-slate-300">{venture.description}</p>
        <span className="text-sm font-bold text-cyan-200">Open workspace →</span>
      </Link>)}</div>
    </section>
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 p-5" aria-label="Shared team">
      <div><h2 className="text-lg font-bold">Your shared team</h2><p className="mt-1 text-base text-slate-400">Review agent work, blockers, and decisions across the businesses.</p></div>
      <Link href="/dashboard/operations/staff" className="min-h-11 rounded-xl border border-cyan-200/30 px-4 py-3 text-sm font-bold text-cyan-200">Agents & approvals</Link>
    </section>
  </BeastAdminShell>;
}
