import type {Metadata} from "next";
import Link from "next/link";

export const metadata:Metadata={
 title:"How BeastFusion Works | Buyer Walkthrough",
 description:"Understand the BeastFusion Professional workflow before buying: self-install, connect your tools, approve bounded AI work, review evidence and control production.",
 alternates:{canonical:"/beastfusion/how-it-works"},
 robots:{index:true,follow:true}
};
const steps=[
 {heading:"1. Install and activate",detail:"Purchase one license for one installation, download the private installer, and activate it with the key from your customer portal."},
 {heading:"2. Configure your workspace",detail:"Use the guided setup to connect your own repositories and selected AI provider. Keep provider credentials and billing under your control."},
 {heading:"3. Define a bounded assignment",detail:"Set a specific development objective, scope and operating limits before assigning work to the AI development workflow."},
 {heading:"4. Review the evidence",detail:"BeastFusion coordinates development, validation and independent review. Inspect reported results and outstanding issues before deciding what to accept."},
 {heading:"5. Approve consequential changes",detail:"Keep human approval over production changes and spending. The software supports the workflow; it does not guarantee bug-free code or autonomous business results."}
];
export default function HowBeastFusionWorks(){
 return <main className="min-h-screen bg-[#07090d] px-5 py-14 text-slate-100">
  <div className="mx-auto max-w-4xl">
   <p className="text-xs font-black uppercase tracking-[.2em] text-amber-200">BeastFusion Professional · Buyer guide</p>
   <h1 className="mt-3 text-4xl font-black">See the workflow before you buy.</h1>
   <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">BeastFusion is self-installed AI development orchestration software. It is designed for people managing software work who want structure, review and explicit control of releases—not a hosted done-for-you development agency.</p>
   <p className="mt-3 text-sm text-slate-400">This is a product walkthrough, not a live interactive demonstration. It describes the intended customer workflow; actual results depend on your setup and tools.</p>
   <ol className="mt-8 space-y-4">{steps.map(step=><li key={step.heading} className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
    <h2 className="text-xl font-bold">{step.heading}</h2><p className="mt-2 leading-7 text-slate-300">{step.detail}</p>
   </li>)}</ol>
   <section className="mt-9 rounded-2xl border border-amber-300/20 p-6">
    <h2 className="text-2xl font-black">Know what your purchase includes</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
     <div><h3 className="font-bold text-amber-200">Included</h3><p className="mt-2 text-sm leading-7 text-slate-300">One perpetual installation license, guided self-installation, the development and independent review workflow, AI-first support, and 12 months of software updates.</p></div>
     <div><h3 className="font-bold text-amber-200">Not included</h3><p className="mt-2 text-sm leading-7 text-slate-300">AI provider usage fees, hands-on installation by SEANGWORLD, guaranteed development outcomes, automatic ongoing update renewals, or included human consulting.</p></div>
    </div>
    <p className="mt-5 text-sm text-slate-400">Your own AI provider account and compatible development tools are required. Review the complete license, refund and support terms before purchase.</p>
   </section>
   <div className="mt-8 flex flex-wrap items-center gap-4"><Link href="/beastfusion" className="beast-button">Review BeastFusion Professional — $499</Link><Link href="/beastfusion/support" className="font-bold text-amber-200 underline">Ask a pre-purchase question</Link></div>
  </div>
 </main>;
}
