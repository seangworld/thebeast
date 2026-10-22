'use client';
import { useState } from 'react';
import Link from 'next/link';
import { filterStaffDossiers } from '@/lib/staffDossiers/filter';
import type { Dossier } from '@/lib/staffDossiers/types';
// Filtering operates only on the authorized server payload; no profile registry is imported into a public bundle.
export function StaffRoster({staff}:{staff:readonly Dossier[]}) {
 const [query,setQuery]=useState(''),[department,setDepartment]=useState(''),[lifecycle,setLifecycle]=useState(''),[competency,setCompetency]=useState(''),[dimension,setDimension]=useState<'target'|'demonstrated'|'released'>('demonstrated');
 const departments=Array.from(new Set(staff.flatMap(d=>d.departments))).sort();
 const visible=filterStaffDossiers(staff,{query,department,lifecycle,competency,dimension});
 const input='mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-white';
 return <section aria-labelledby="staff-roster-title" className="space-y-5">
  <div><h2 id="staff-roster-title" className="text-2xl font-bold">Staff roster</h2><p className="mt-2 text-slate-300">One dossier per identity. Deployment, availability and evidence of ability are separate. Unassessed does not mean L0.</p></div>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
   <label className="text-sm">Find staff<input className={input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, role or alias" /></label>
   <label className="text-sm">Department<select aria-label="Department" className={input} value={department} onChange={e=>setDepartment(e.target.value)}><option value="">All departments</option>{departments.map(d=><option key={d}>{d}</option>)}</select></label>
   <label className="text-sm">Lifecycle<select aria-label="Lifecycle" className={input} value={lifecycle} onChange={e=>setLifecycle(e.target.value)}><option value="">All lifecycle states</option>{['planned','active','limited','paused','retired'].map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="text-sm">Competency dimension<select aria-label="Competency dimension" className={input} value={dimension} onChange={e=>setDimension(e.target.value as typeof dimension)}>{['target','demonstrated','released'].map(x=><option key={x}>{x}</option>)}</select></label>
   <label className="text-sm">Competency level<select aria-label="Competency level" className={input} value={competency} onChange={e=>setCompetency(e.target.value)}><option value="">All levels</option>{['unassessed','L1','L2','L3','L4','L5'].map(x=><option key={x}>{x}</option>)}</select></label>
  </div>
  <p role="status" className="text-sm text-slate-400">{visible.length} of {staff.length} staff records · Availability not live-verified</p>
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map(d=><Link key={d.id} href={`/dashboard/operations/staff/${encodeURIComponent(d.id)}`} className="min-w-0 rounded-xl border border-white/15 bg-slate-900 p-5 hover:border-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200">
   <p className="text-xs text-cyan-200">{d.departments.join(' · ')} · {d.lifecycle}</p><h3 className="mt-2 text-xl font-bold">{d.name}</h3><p className="mt-1 text-slate-300">{d.role}</p>
   <dl className="mt-4 space-y-1 text-sm">{(['target','demonstrated','released'] as const).map(k=><div key={k} className="flex justify-between gap-2"><dt className="capitalize">{k}</dt><dd>{d[k]||'Unassessed'}</dd></div>)}</dl>
   <p className="mt-3 text-xs text-slate-400">Reviewed {d.reviewedAt} · {d.releases.length ? 'Release history recorded' : 'Release not reconciled'}</p><span className="mt-4 inline-block py-2 text-sm font-bold text-cyan-200">Open dossier →</span>
  </Link>)}</div>
  {!visible.length&&<p className="rounded-xl border border-white/15 p-5">No staff match these filters.</p>}
 </section>;
}
