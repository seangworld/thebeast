import Link from 'next/link';
import { OperationsWorkspaceShell } from '../OperationsWorkspaceShell';
import type { Dossier } from '@/lib/staffDossiers/types';
import { currentLevelLabel, targetLevelLabel, formatStaffDate } from '@/lib/staffDossiers/presentation';
import { StaffSupportingRecords } from './StaffSupportingRecords';
const section='space-y-3 border-t border-white/15 py-5';
function List({items}:{items:readonly string[]}){return <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-slate-300">{items.map((x,i)=><li key={i}>{x}</li>)}</ul>;}
export function StaffDossierDetail({d}:{d:Dossier}) {
 const plan=d.deferred[0];
 const changes=d.recentChanges.slice(0,3);
 return <OperationsWorkspaceShell title={d.name} purpose={`${d.role} · ${d.departments.join(' / ')}`} showGuidance={false} actions={<Link className="min-h-11 rounded-lg border border-cyan-200/30 px-4 py-3" href="/dashboard/operations/staff">← Staff Management</Link>}>
  <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-400"><p>Last evaluated: <time dateTime={d.lastEvaluatedAt||undefined}>{formatStaffDate(d.lastEvaluatedAt)}</time></p><p>Dossier updated: <time dateTime={d.reviewedAt}>{formatStaffDate(d.reviewedAt)}</time></p></div>
  <section className={section}><h2 className="text-xl font-bold">1. Job & current assignment</h2><p>{d.mission}</p><List items={d.duties}/><p className="text-sm"><strong>Current assignment:</strong> {d.assignment}</p></section>
  <section className={section}><h2 className="text-xl font-bold">2. Assessment & competency</h2>
   <p className="text-lg font-semibold">{d.latestAssessment?.title||'Not evaluated'}</p>
   {d.latestAssessment&&<><p className="text-sm text-slate-400">{formatStaffDate(d.latestAssessment.date)} · {d.latestAssessment.reviewer}</p><p className="text-sm text-slate-300">{d.latestAssessment.note}</p></>}
   <div className="flex flex-wrap gap-x-10 gap-y-2"><p><strong>Current:</strong> {currentLevelLabel(d)}</p><p><strong>Target:</strong> {targetLevelLabel(d)}</p></div>
   {d.levelMapping&&<p className="text-sm text-slate-300">{d.levelMapping.scope}</p>}
   <p className="text-sm text-slate-300"><strong>Role requirement:</strong> {d.targetRequirement}</p>
   {!!d.strengths.length&&<><h3 className="font-semibold">Demonstrated strengths</h3><List items={d.strengths}/></>}
  </section>
  <section className={section}><h2 className="text-xl font-bold">3. Known limitations</h2><List items={[...d.limitations,...d.blockers]}/></section>
  <section className={section} id="development-plan"><h2 className="text-xl font-bold">4. Development plan</h2>{plan?<><h3 className="font-semibold">{plan.title}</h3><p className="text-sm text-slate-300">{plan.requiredWork}</p><p className="text-sm"><strong>Required evidence:</strong> {plan.success}</p><p className="text-sm"><strong>Estimated cost:</strong> {plan.cost}</p></>:<p className="text-sm text-slate-300">No next improvement has been specified.</p>}</section>
  <section className={section}><h2 className="text-xl font-bold">5. Recent changes</h2><ul className="space-y-3 text-sm text-slate-300">{changes.map((h,i)=><li key={i}><span className="text-slate-400">{formatStaffDate(h.date)}</span> — {h.summary}</li>)}</ul></section>
  <details id="supporting-records" className="rounded-lg border border-white/15 p-4"><summary className="min-h-11 cursor-pointer py-2 font-semibold">Supporting records</summary>
   <div className="mt-3 space-y-4">{d.levelMapping&&<section className="space-y-2 text-sm"><h2 className="font-bold">Competency mapping rationale</h2><p>{d.levelMapping.rationale}</p><p>{formatStaffDate(d.levelMapping.reviewedAt)} · {d.levelMapping.reviewer}</p>{d.levelMapping.evidenceUrls.map(url=><a className="block break-all text-cyan-200 underline" key={url} href={url}>Mapping source</a>)}</section>}
   <StaffSupportingRecords d={d}/></div>
  </details>
 </OperationsWorkspaceShell>;
}
