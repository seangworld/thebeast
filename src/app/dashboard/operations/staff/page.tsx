import Link from 'next/link';
import { OperationsWorkspaceShell } from '../OperationsWorkspaceShell';
import { StaffOperationsWorkspace } from '../../admin/development/StaffOperationsWorkspace';
import { StrategyProposalQueueWorkspace } from '../../admin/development/proposals/StrategyProposalQueueWorkspace';
import { staffDossiers, competencyScale, inventoryReconciliation, inventorySources } from '@/lib/staffDossiers';
import { requireStaffDossierOwner } from '@/lib/server/staffDossierOwner';
import { StaffRoster } from './StaffRoster';
export const dynamic='force-dynamic';
export default async function OperationsStaffPage() {
 await requireStaffDossierOwner();
 return <OperationsWorkspaceShell title="Staff & dossiers" purpose="Direct every SEANGWORLD department from one evidence-backed staff register.">
  <aside className="rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-5 text-sm leading-6 text-slate-300">No additional paid testing, credit purchases or evaluation services. Dossier updates are required at every ability, duty, permission, prompt, configuration and release change. This register remains readable without live telemetry; it does not activate agents.</aside>
  <StaffRoster staff={staffDossiers}/>
  <details className="rounded-xl border border-white/15 p-5"><summary className="min-h-11 cursor-pointer font-bold">Competency scale and inventory provenance</summary><ul className="space-y-2 text-sm text-slate-300">{competencyScale.map(x=><li key={x}>{x}</li>)}</ul><p className="mt-3 text-sm">Levels need role-specific evidence. Knight/autonomy labels are a separate framework. A released code version does not imply a released competency level.</p><ul className="mt-3 space-y-2 text-sm text-slate-300">{inventoryReconciliation.map(x=><li key={x}>{x}</li>)}{inventorySources.map(s=><li key={s.repository}>{s.repository} snapshot {s.commit.slice(0,8)} — source review, not live operational status.</li>)}</ul></details>
  <section aria-labelledby="growth-title" className="space-y-3"><h2 id="growth-title" className="text-2xl font-bold">Deferred improvements</h2><p className="text-sm text-slate-300">Prioritized gaps, required work and cost uncertainty stay with the dossier. Nothing here schedules paid testing.</p><div className="grid gap-3 md:grid-cols-2">{staffDossiers.flatMap(d=>d.deferred.map((g,i)=><Link key={d.id+i} className="min-w-0 rounded-xl border border-white/15 p-4" href={`/dashboard/operations/staff/${d.id}#deferred`}><p className="font-bold">{d.name} · {g.title}</p><p className="mt-1 text-sm text-cyan-200">{g.priority} priority · desired level {g.desiredLevel||'unassessed'}</p><p className="mt-2 text-sm text-slate-300">{g.cost}</p></Link>))}</div></section>
  <details className="rounded-xl border border-white/15 p-5"><summary className="min-h-11 cursor-pointer font-bold">Existing operations briefing & approval queue</summary><div className="mt-4 space-y-6"><StaffOperationsWorkspace/><StrategyProposalQueueWorkspace/></div></details>
 </OperationsWorkspaceShell>;
}
