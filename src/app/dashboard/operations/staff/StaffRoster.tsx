'use client';
import { useState } from 'react';
import Link from 'next/link';
import { filterStaffDossiers } from '@/lib/staffDossiers/filter';
import { staffGroups, currentLevelLabel, targetLevelLabel, formatStaffDate } from '@/lib/staffDossiers/presentation';
import type { Dossier } from '@/lib/staffDossiers/types';
const columns='lg:grid-cols-[1.1fr_1.2fr_.65fr_1.7fr_1fr_.8fr]';
export function StaffRoster({staff}:{staff:readonly Dossier[]}) {
 const [query,setQuery]=useState(''),[department,setDepartment]=useState(''),[lifecycle,setLifecycle]=useState('');
 const departments=Array.from(new Set(staff.flatMap(d=>d.departments))).sort();
 const visible=filterStaffDossiers(staff,{query,department,lifecycle});
 const input='mt-1 min-h-11 w-full rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-white';
 return <section aria-label="Staff register" className="space-y-5">
  <div className="grid gap-3 sm:grid-cols-3">
   <label className="text-sm">Search staff<input className={input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Name, role or alias" /></label>
   <label className="text-sm">Department<select aria-label="Department" className={input} value={department} onChange={e=>setDepartment(e.target.value)}><option value="">All departments</option>{departments.map(d=><option key={d}>{d}</option>)}</select></label>
   <label className="text-sm">Status<select aria-label="Status" className={input} value={lifecycle} onChange={e=>setLifecycle(e.target.value)}><option value="">All statuses</option>{['planned','active','limited','paused','retired'].map(x=><option key={x}>{x}</option>)}</select></label>
  </div>
  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm" aria-label="Separate record counts">{staffGroups.map(g=><span key={g.kind}>{g.label}: <strong>{staff.filter(d=>d.recordKind===g.kind).length}</strong></span>)}</div>
  {!visible.length&&<p role="status" className="py-4 text-slate-300">No records match these filters.</p>}
  {staffGroups.map(g=>{const rows=visible.filter(d=>d.recordKind===g.kind);if(!rows.length)return null;return <section key={g.kind} aria-labelledby={`group-${g.kind}`} className="space-y-2">
   <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id={`group-${g.kind}`} className="text-lg font-bold">{g.label} <span className="text-sm font-normal text-slate-400">({rows.length}{rows.length!==staff.filter(d=>d.recordKind===g.kind).length?` of ${staff.filter(d=>d.recordKind===g.kind).length}`:''})</span></h2></div>
   <p className="text-xs text-slate-400">{g.description}</p>
   {!!rows.length&&<><div aria-hidden="true" className={`hidden gap-4 border-b border-white/20 px-3 py-2 text-xs text-slate-400 lg:grid ${columns}`}>{['Name','Department / Role','Status','Latest assessment','Current / Target','Last evaluated'].map(x=><span key={x}>{x}</span>)}</div>
   <ul className="divide-y divide-white/10">{rows.map(d=><li key={d.id} className={`grid min-w-0 grid-cols-2 items-start gap-x-4 gap-y-2 px-3 py-3 text-sm lg:gap-y-0 ${columns}`}>
    <div className="col-span-2 min-w-0 lg:col-span-1"><Link className="inline-block min-h-11 py-2 font-bold text-cyan-200 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200" href={`/dashboard/operations/staff/${encodeURIComponent(d.id)}`}>{d.name}</Link></div>
    <div className="col-span-2 min-w-0 lg:col-span-1"><span className="sr-only">Department / Role: </span><p className="break-words">{d.departments.join(' · ')}</p><p className="text-xs text-slate-400">{d.role}</p></div>
    <div><span className="block text-xs text-slate-400 lg:sr-only">Status</span><span className="capitalize">{d.lifecycle}</span></div>
    <div className="min-w-0"><span className="block text-xs text-slate-400 lg:sr-only">Latest assessment</span><p className="break-words">{d.latestAssessment?.title||'Not evaluated'}</p>{d.latestAssessment&&<p className="mt-1 text-xs text-slate-400">{d.latestAssessment.reviewer}</p>}</div>
    <div className="min-w-0"><span className="block text-xs text-slate-400 lg:sr-only">Current / Target</span><p>{currentLevelLabel(d)}</p><p className="text-xs text-slate-400">Target: {targetLevelLabel(d)}</p></div>
    <div><span className="block text-xs text-slate-400 lg:sr-only">Last evaluated</span><time dateTime={d.lastEvaluatedAt||undefined}>{formatStaffDate(d.lastEvaluatedAt)}</time></div>
   </li>)}</ul></>}
  </section>;})}
 </section>;
}
