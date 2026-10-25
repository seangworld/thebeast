'use client';
import {useRef} from 'react';
import Image from 'next/image';
import {talentAppearance,type AppearanceTalent} from '@/lib/agencyAppearance';
export function AppearanceReference({talent}:{talent:AppearanceTalent}){
 const reference=talentAppearance[talent],dialog=useRef<HTMLDialogElement>(null);
 const src=`/api/admin/agency/appearance?talent=${talent}`;
 return <figure className="min-w-0 space-y-2">
  <button type="button" className="rounded border border-white/20 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200" aria-label={`Enlarge ${reference.name} appearance reference`} onClick={()=>dialog.current?.showModal()}><Image unoptimized src={src} width={reference.width} height={reference.height} alt={`${reference.name}: ${reference.description}`} className="h-40 w-32 rounded object-contain"/></button>
  <figcaption><p className="font-semibold">{reference.name}</p><p>Appearance reference</p><p className="text-sm text-slate-300">Not approved for publishing.</p></figcaption>
  <details className="text-sm text-slate-300"><summary className="cursor-pointer">Source &amp; provenance</summary>{talent==='cole'?<><p>{talentAppearance.cole.provenance}</p><p>Original approved PNG bytes preserved in private storage. 1254 × 1254. Supersedes the Pinterest-attributed blue-shirt portrait and two-sleeve requirement.</p></>:<><p>Recovered unchanged from the AI Agency chat. {reference.width} × {reference.height} JPEG. No upscale or recreation.</p><a className="text-cyan-200 underline" href={reference.source} target="_blank" rel="noreferrer">{reference.sourceLabel}</a><p>Creator-original provenance and reuse rights remain unverified. Owner approval covers appearance only.</p></>}</details>
  <dialog ref={dialog} aria-label={`${reference.name} appearance reference`} className="max-h-[95dvh] w-[min(95vw,60rem)] rounded-xl border border-white/20 bg-slate-950 p-4 text-white backdrop:bg-black/80"><form method="dialog" className="mb-3 flex justify-end"><button className="min-h-11 rounded border border-white/30 px-4">Close image</button></form><Image unoptimized src={src} width={reference.width} height={reference.height} alt={`${reference.name}: ${reference.description}`} className="mx-auto max-h-[70dvh] w-auto max-w-full object-contain"/><p className="mt-3">{reference.name} · Appearance reference · Not approved for publishing.</p></dialog>
 </figure>;
}
