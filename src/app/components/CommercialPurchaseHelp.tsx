import Link from "next/link";
const items=[
 ["I can't sign in","Use Sign in to request a fresh email link. Open it in the same browser and on the same site where you started."],
 ["Checkout won't open","Sign in first, then return to the purchase page. If it still fails, contact support with the error text, not your card details."],
 ["I paid but don't see a license","Check Your BeastFusion while signed in with the purchase email. If missing, open a ticket; never purchase twice to fix this."],
 ["Setup or activation fails","Use the guided setup checks and report the step and error. Never send API keys, passwords, or private code in a ticket."]
];
export function CommercialPurchaseHelp({product="BeastFusion"}:{product?:string}){
 return <section aria-label={`${product} purchase help`} className="mt-8 rounded-2xl border border-white/15 bg-white/[.03] p-5">
 <h2 className="text-xl font-bold text-white">Need help buying or getting started?</h2>
 <p className="mt-2 text-sm text-slate-300">Start with the answers below. If you're still stuck, contact support. Urgent security or account concerns can be escalated to a person.</p>
 <div className="mt-4 space-y-3">{items.map(([question,answer])=><details key={question} className="rounded-xl border border-white/10 p-3"><summary className="cursor-pointer font-semibold text-amber-200">{question}</summary><p className="mt-2 text-sm text-slate-300">{answer}</p></details>)}</div>
 <div className="mt-5 flex flex-wrap gap-3"><Link className="beast-button" href="/beastfusion/support">Contact support</Link><Link className="beast-button" href="/login?next=%2Fbeastfusion">Sign in / Register</Link></div>
 <p className="mt-3 text-xs text-slate-400">Support begins with guided help and ticket triage; a human reviews escalated issues. Do not share payment card numbers or credentials.</p>
 </section>;
}