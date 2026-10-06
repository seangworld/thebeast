"use client";
import {useMemo,useState} from "react";
import Link from "next/link";

const steps=[
 ["Welcome","Set up BeastFusion without vendor installation."],
 ["System check","Verify runtime, storage, HTTPS and secure secret storage."],
 ["Administrator","Create the first local/workspace administrator."],
 ["Workspace","Name the organization and workspace."],
 ["GitHub","Connect GitHub with least-privilege repository access."],
 ["Repositories","Choose repositories Fusion may manage."],
 ["AI provider","Connect your own provider credentials (BYOK)."],
 ["Authority","Choose what Fusion may do and what always needs approval."],
 ["Budget","Set AI and operational spending ceilings."],
 ["Validate","Run connection, policy, repository and readiness checks."],
 ["Launch","Open the BeastFusion Control Center."]
] as const;

export default function BeastFusionSetupPage(){
 const [index,setIndex]=useState(0);const [done,setDone]=useState<number[]>([]);
 const pct=useMemo(()=>Math.round((done.length/steps.length)*100),[done]);
 const complete=()=>{setDone(v=>Array.from(new Set([...v,index])));setIndex(v=>Math.min(v+1,steps.length-1));};
 return <main className="min-h-screen bg-[#07090d] px-4 py-10 text-slate-100">
  <div className="mx-auto max-w-4xl">
   <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">BeastFusion 5 Setup</p>
   <h1 className="mt-2 text-3xl font-black">Self-service installation wizard</h1>
   <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">This wizard is designed for customer self-installation. BeastFusion will not ask the vendor to install your environment, and BYOK credentials remain customer-controlled.</p>
   <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-amber-300" style={{width:`${pct}%`}} /></div>
   <div className="mt-8 grid gap-5 md:grid-cols-[240px_1fr]">
    <nav className="space-y-2">{steps.map(([name],i)=><button key={name} onClick={()=>setIndex(i)} className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${i===index?"border-amber-300/50 bg-amber-300/10 text-white":"border-white/10 text-slate-400"}`}><span className="mr-2">{done.includes(i)?"✓":i+1}</span>{name}</button>)}</nav>
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
     <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-200">Step {index+1} of {steps.length}</p>
     <h2 className="mt-2 text-2xl font-black">{steps[index][0]}</h2><p className="mt-3 text-sm leading-6 text-slate-300">{steps[index][1]}</p>
     {steps[index][0]==="AI provider"?<div className="mt-5 rounded-xl border border-cyan-300/20 bg-cyan-300/[0.05] p-4 text-sm text-slate-300"><strong className="text-white">BYOK:</strong> Your provider bills you directly. If your credential is missing or invalid, Fusion stops instead of falling back to a vendor-funded key.</div>:null}
     {steps[index][0]==="Authority"?<div className="mt-5 space-y-2 text-sm text-slate-300"><p>Recommended defaults:</p><p>✓ Develop on approved work</p><p>✓ Open governed changes</p><p>✓ Independent review required</p><p>✗ Production release without explicit approval</p><p>✗ Unapproved spending</p></div>:null}
     <div className="mt-8 flex flex-wrap gap-3">{index>0?<button className="beast-button" onClick={()=>setIndex(v=>v-1)}>Back</button>:null}{index<steps.length-1?<button className="beast-button" onClick={complete}>Save & continue</button>:<Link className="beast-button" href="/dashboard/operations/fusion">Launch BeastFusion</Link>}</div>
    </section>
   </div>
  </div>
 </main>
}
