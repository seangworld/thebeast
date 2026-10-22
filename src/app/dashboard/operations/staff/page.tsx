import { OperationsWorkspaceShell } from '../OperationsWorkspaceShell';
import { StaffOperationsWorkspace } from '../../admin/development/StaffOperationsWorkspace';
import { StrategyProposalQueueWorkspace } from '../../admin/development/proposals/StrategyProposalQueueWorkspace';
import { staffDossiers, competencyScale, inventoryReconciliation, inventorySources } from '@/lib/staffDossiers';
import { requireStaffDossierOwner } from '@/lib/server/staffDossierOwner';
import { StaffRoster } from './StaffRoster';
export const dynamic='force-dynamic';
export default async function OperationsStaffPage() {
 await requireStaffDossierOwner();
 return <OperationsWorkspaceShell title="Staff Management" purpose="Review staff, prior results and the next useful improvement." showGuidance={false}>
  <StaffRoster staff={staffDossiers}/>
  <details className="rounded-lg border border-white/15 p-4"><summary className="min-h-11 cursor-pointer py-2 font-semibold">Supporting records</summary>
   <div className="space-y-4 text-sm text-slate-300"><h2 className="font-bold">Competency scale & inventory</h2><ul>{competencyScale.map(x=><li key={x}>{x}</li>)}</ul><p>Knight/autonomy is a separate framework. Numeric mappings use role evidence, not scores or release versions.</p><ul className="space-y-2">{inventoryReconciliation.map(x=><li key={x}>{x}</li>)}{inventorySources.map(s=><li key={s.repository}>{s.repository} snapshot {s.commit.slice(0,8)}</li>)}</ul>
   <p>Dossier maintenance and no-paid-testing policies remain in force. Improvement plans are inside each dossier.</p>
   <StaffOperationsWorkspace/><StrategyProposalQueueWorkspace/></div>
  </details>
 </OperationsWorkspaceShell>;
}
