import Link from "next/link";
import type { VeteranClaim } from "@/lib/health/veteranClaims";

const steps = [
  { id: "preparing", title: "Start with your history", action: "Add the issue you want help understanding. Start with what you know; you can fill in missing details later.", documents: "Gather all available decision letters: approvals, denials, increases, and mixed decisions, including older letters. No prior decisions? You can still begin.", help: "Taylor can explain each supplied decision and help organize a dated history without guessing at missing decisions." },
  { id: "gathering", title: "Organize your evidence", action: "Record what you have, what you have requested, and what remains uncertain in the evidence tracker below.", documents: "Add relevant service records, treatment records, test results, and factual statements. Label each document with its date and purpose. Keep conflicting records so they can be reviewed.", help: "Taylor can compare selected documents with your notes, identify supporting and conflicting evidence, and research current official guidance for your questions." },
  { id: "exam", title: "Prepare for an exam", action: "Write down your actual symptoms, their frequency, and examples of their effect on daily life. Follow your appointment letter and confirm arrangements with the exam provider.", documents: "Keep the exam notice and relevant records together. Uploading to Beast does not deliver anything to VA or your examiner.", help: "Taylor can help organize honest preparation notes and questions. Describe your experience accurately, including uncertainty; there is no script for a particular rating." },
  { id: "decision", title: "Understand a decision", action: "Add the complete new decision letter, whatever the outcome. Compare its issues and dates with your earlier letters.", documents: "Include all pages of the notice and any referenced records you have. If pages are missing or unreadable, note that rather than filling in the gaps.", help: "Taylor can explain stated reasons and favorable findings, research official review information, and prepare questions for an accredited representative. Check any deadline against your actual notice." },
  { id: "review", title: "Choose your next preparation task", action: "Save your next action and a follow-up date below. You can revisit every stage even after an issue is closed.", documents: "Keep later correspondence and newly obtained evidence with your history. Dates you enter here are personal reminders, not calculated filing deadlines.", help: "Ask Taylor to narrow the work to a few practical next steps based on what the evidence supports. Nothing is filed or sent by Beast." },
] as const;

export function VeteransPreparationGuide({ stage }: { stage?: VeteranClaim["stage"] }) {
  const recommended = stage === "submitted" ? "gathering" : stage === "closed" ? "review" : stage ?? "preparing";
  return <section className="rounded-xl border border-sky-800 p-4 space-y-3" aria-labelledby="preparation-guide-title">
    <h2 id="preparation-guide-title" className="text-xl font-bold">Your preparation guide</h2>
    <p className="text-sm text-slate-300">You don’t need to know what to ask AI. Start with your situation and let Taylor help you work through it. Every stage stays available; opening one does not change your saved status.</p>
    {steps.map(step => <details key={`${recommended}-${step.id}`} open={step.id === recommended} className="rounded-lg border border-slate-700 p-3">
      <summary className="cursor-pointer font-semibold">{step.title}{step.id === recommended ? " · Start here" : ""}</summary>
      <p className="mt-3 text-sm text-slate-200"><strong>What to do:</strong> {step.action}</p>
      <p className="mt-2 text-sm text-slate-200"><strong>Documents to gather:</strong> {step.documents}</p>
      <p className="mt-2 text-sm text-slate-300">{step.help}</p>
    </details>)}
    <p className="text-sm text-slate-300">Upload up to 5 documents at a time, totaling 25 MB. In Taylor’s conversation, select up to 2 original documents per turn for review. A review covers the selected material, not automatically your entire document history.</p>
    <div className="flex flex-wrap items-center gap-3"><Link target="_blank" rel="noopener noreferrer" href="/dashboard/health/documents" className="beast-button-secondary">Upload / organize documents</Link><Link target="_blank" rel="noopener noreferrer" href="/dashboard/health/ai-advisor?veterans=1" className="beast-button">Work through this with Taylor</Link></div>
    <p className="text-xs text-slate-400">Select your saved issue in Taylor. Save edits here first if you want those changes available there.</p>
    <div className="flex flex-wrap gap-4 text-sm"><a className="text-sky-300 underline" href="https://www.va.gov/disability/how-to-file-claim/evidence-needed/" target="_blank" rel="noopener noreferrer">VA evidence guidance</a><a className="text-sky-300 underline" href="https://www.va.gov/resources/va-claim-exam/" target="_blank" rel="noopener noreferrer">VA exam guidance</a></div>
  </section>;
}
