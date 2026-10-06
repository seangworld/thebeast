import Link from "next/link";
import { OperationsWorkspaceShell } from "../OperationsWorkspaceShell";

const sections=[
 {title:"Projects",detail:"Portfolio and repository health, readiness, and current governed state.",href:"/dashboard/admin/modules"},
 {title:"Work Queue",detail:"Approved, blocked, waiting, and next work with recorded reasons.",href:"/dashboard/admin/development"},
 {title:"Approvals",detail:"Human decisions and release gates that Fusion will not bypass.",href:"/dashboard/admin/development/proposals"},
 {title:"Agents",detail:"Developer, Reviewer, Observer, Research/Planning and Outcome roles.",href:"/dashboard/admin/development#agents"},
 {title:"Releases",detail:"Release readiness, validation evidence, and rollback awareness.",href:"/dashboard/admin/releases"},
 {title:"Costs",detail:"Company costs and bounded AI/operational spending visibility.",href:"/dashboard/operations/finances"},
 {title:"Evidence",detail:"Canonical development execution history and immutable evidence links.",href:"/dashboard/admin/execution-history"},
 {title:"Diagnostics",detail:"Platform health, failures, configuration gaps, and next actions.",href:"/dashboard/admin/platform-health"}
];

export default function BeastFusionOperationsPage(){
 return <OperationsWorkspaceShell title="BeastFusion Control Center" purpose="Operate governed software development across projects without requiring paid AI calls for routine status, routing, approvals, or explanations.">
  <div className="space-y-6">
   <section className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-5">
    <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">BeastFusion v4 operator workspace</p>
    <h2 className="mt-2 text-2xl font-black text-white">One place to understand and control Fusion</h2>
    <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-300">The Control Center uses BeastFusion&apos;s canonical governance state. Routine status and &quot;why&quot; explanations are deterministic; consequential actions continue to stop at their configured human gates.</p>
    <div className="mt-4 flex flex-wrap gap-3"><Link className="beast-button" href="/dashboard/admin/development">Open live work</Link><Link className="beast-button" href="/dashboard/admin/platform-health">Check health</Link></div>
   </section>
   <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{sections.map(item=><Link key={item.title} href={item.href} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-amber-300/30 hover:bg-white/[0.05]"><h3 className="font-black text-white">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{item.detail}</p><span className="mt-4 inline-block text-xs font-black uppercase tracking-[0.14em] text-amber-200">Open →</span></Link>)}</section>
   <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h2 className="text-lg font-black text-white">Operating rule</h2><p className="mt-2 text-sm leading-6 text-slate-300">Fusion may analyze, route, develop, review, validate, explain, and report within authorization. Production release, spending, paid services, destructive operations, and other configured consequential gates remain explicit decisions.</p></section>
  </div>
 </OperationsWorkspaceShell>
}
