import Link from "next/link";
import { OperationsWorkspaceShell } from "./OperationsWorkspaceShell";
import { operationsVentures } from "@/lib/operationsNavigation";
import { OperationsFinancialSummary } from "./OperationsFinancialSummary";

export default function OperationsPage() {
  return <OperationsWorkspaceShell title="SEANGWORLD HQ" purpose="Run the company across every venture: produce revenue, review performance, direct the team, and make the decisions only you can make." actions={<Link href="/dashboard/operations/production" className="min-h-11 rounded-xl bg-cyan-200 px-4 py-3 text-sm font-bold text-slate-950">Start production</Link>}>
    <OperationsFinancialSummary />
    <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]" aria-label="Owner priorities">
      <Link href="/dashboard/operations/production" className="group rounded-2xl border border-cyan-300/30 bg-gradient-to-br from-cyan-300/15 to-slate-900 p-6 transition hover:border-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-200">Priority work</p>
        <h2 className="mt-3 text-2xl font-bold text-white">Make something that earns</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-slate-300">Start with your idea, let BeastHunter find an opportunity, or prepare a client package. BeastFusion routes the work to the right factory.</p>
        <span className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-cyan-200 px-4 py-3 text-sm font-bold text-slate-950">Open Production →</span>
      </Link>
      <Link href="/dashboard/operations/briefing" className="rounded-2xl border border-white/10 bg-[#111c2b] p-6 transition hover:border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Executive attention</p>
        <h2 className="mt-3 text-xl font-bold text-white">Review the company briefing</h2>
        <p className="mt-2 text-base leading-7 text-slate-300">See verified changes, risks, opportunities, and decisions across SEANGWORLD.</p>
        <span className="mt-5 block text-sm font-bold text-cyan-200">Open briefing →</span>
      </Link>
    </section>
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
  </OperationsWorkspaceShell>;
}
