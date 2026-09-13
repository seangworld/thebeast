"use client";

import Link from "next/link";
import { useState } from "react";

type StartMode = "idea" | "opportunity" | "client";

const startModes: Array<{ id: StartMode; label: string; title: string; description: string }> = [
  { id: "idea", label: "I have an idea", title: "Start with my idea", description: "Choose the output, provide the idea once, and continue in the working factory." },
  { id: "opportunity", label: "Find it for me", title: "Find something worth making", description: "Use BeastHunter to find and rank opportunities before spending generation credits." },
  { id: "client", label: "Client work", title: "Complete a client package", description: "Turn a client brief and files into a reviewed, organized delivery package." },
];

const factoryOptions = {
  idea: [
    { title: "Book or ebook", detail: "Create one master manuscript, then prepare Kindle, paperback, and hardcover outputs as selected.", href: "/dashboard/operations/publishing", action: "Open Book Factory", status: "Available" },
    { title: "Video", detail: "Prepare the topic, script, content calendar, and approval handoff for production in FacelessReels.", href: "/dashboard/operations/marketing/video-growth", action: "Open Video Production", status: "Available" },
    { title: "Campaign content", detail: "Prepare coordinated social and email copy for manual use without paying a posting provider.", href: "/dashboard/operations/marketing", action: "Open Content Production", status: "Available" },
  ],
  opportunity: [
    { title: "Revenue opportunity", detail: "Search once, compare evidence and owner fit, then move only selected ideas into production.", href: "/dashboard/operations/opportunities", action: "Find Opportunities", status: "Available" },
    { title: "KDP opportunity", detail: "Search and select book opportunities directly inside the Publishing factory.", href: "/dashboard/operations/publishing", action: "Find Books to Create", status: "Available" },
  ],
  client: [
    { title: "Code audit package", detail: "Upload a codebase ZIP and receive findings, priorities, recommendations, and client-ready delivery files without using AI credits.", href: "/dashboard/operations/production/code-audit", action: "Create Code Audit", status: "Available" },
    { title: "Custom client package", detail: "Collect the brief, source files, requested outputs, due date, and delivery requirements in one job.", href: "", action: "Connection pending", status: "Next factory" },
  ],
} as const;

const factories = [
  { name: "Book Factory", state: "Available", detail: "KDP research, manuscript, quality review, packaging, and upload handoff.", href: "/dashboard/operations/publishing" },
  { name: "Video Production", state: "FacelessReels", detail: "BeastMarketing coordinates discovery, scripts, approvals, publishing plans, and analytics.", href: "/dashboard/operations/marketing/video-growth" },
  { name: "Content Production", state: "Available", detail: "Create social and email materials for copy-and-paste use or later connected publishing.", href: "/dashboard/operations/marketing" },
  { name: "Client Packages", state: "Code audit available", detail: "Create a bounded static code review and download an organized client delivery package.", href: "/dashboard/operations/production/code-audit" },
] as const;

export function ProductionWorkspace() {
  const [mode, setMode] = useState<StartMode>("idea");

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-cyan-300/10 via-[#111c2b] to-[#0d1522] p-5 sm:p-7" aria-labelledby="production-start-title">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Start production</p>
        <h2 id="production-start-title" className="mt-2 text-3xl font-black text-white">What do you want finished?</h2>
        <p className="mt-2 max-w-3xl text-base leading-7 text-slate-300">Choose how you want to begin. The detailed tools stay underneath; this is the front door.</p>

        <div className="mt-6 grid gap-3 md:grid-cols-3" role="tablist" aria-label="Production starting point">
          {startModes.map((item) => {
            const selected = item.id === mode;
            return (
              <button key={item.id} id={`production-${item.id}-tab`} type="button" role="tab" aria-selected={selected} aria-controls="production-options" onClick={() => setMode(item.id)} className={`min-h-28 rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200 ${selected ? "border-cyan-200 bg-cyan-200/15" : "border-white/10 bg-black/10 hover:border-white/25"}`}>
                <span className={`text-xs font-bold uppercase tracking-widest ${selected ? "text-cyan-200" : "text-slate-500"}`}>{item.label}</span>
                <span className="mt-2 block text-lg font-bold text-white">{item.title}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-400">{item.description}</span>
              </button>
            );
          })}
        </div>

        <div id="production-options" role="tabpanel" aria-labelledby={`production-${mode}-tab`} className="mt-5 grid gap-3 lg:grid-cols-3">
          {factoryOptions[mode].map((option) => (
            <article key={option.title} className="flex min-w-0 flex-col rounded-2xl border border-white/10 bg-[#0b111b]/70 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold text-white">{option.title}</h3>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${option.href ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200" : "border-amber-300/30 bg-amber-300/10 text-amber-100"}`}>{option.status}</span>
              </div>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-300">{option.detail}</p>
              {option.href ? <Link href={option.href} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-200 px-4 py-3 text-sm font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">{option.action} →</Link> : <span className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-slate-500" aria-disabled="true">{option.action}</span>}
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="production-flow-title">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">One repeatable workflow</p>
          <h2 id="production-flow-title" className="mt-2 text-2xl font-bold text-white">From idea to money-ready output</h2>
        </div>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["1", "Choose", "Use your idea, an opportunity, or a client brief."],
            ["2", "Set the run", "Select outputs, volume, deadline, and cost limit."],
            ["3", "Agents produce", "Research, create, inspect, revise, and package."],
            ["4", "You review", "Only exceptions and owner decisions return to you."],
            ["5", "Publish or deliver", "Download, upload, send, measure, and improve."],
          ].map(([number, title, detail]) => <li key={number} className="rounded-2xl border border-white/10 bg-[#111c2b] p-5"><span className="text-sm font-black text-cyan-200">{number}</span><h3 className="mt-3 font-bold text-white">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p></li>)}
        </ol>
      </section>

      <section aria-labelledby="factory-status-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">Production network</p><h2 id="factory-status-title" className="mt-2 text-2xl font-bold text-white">Your factories</h2></div><p className="max-w-xl text-sm leading-6 text-slate-400">Status describes the currently connected workflow. It does not claim that an external account, automatic publishing, or autonomous run is active.</p></div>
        <div className="grid gap-3 md:grid-cols-2">
          {factories.map((factory) => <article key={factory.name} className="rounded-2xl border border-white/10 bg-[#111c2b] p-5"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-bold text-white">{factory.name}</h3><span className="shrink-0 rounded-full border border-white/10 px-2.5 py-1 text-xs font-bold text-slate-300">{factory.state}</span></div><p className="mt-2 text-sm leading-6 text-slate-400">{factory.detail}</p>{factory.href ? <Link href={factory.href} className="mt-4 inline-block text-sm font-bold text-cyan-200 hover:text-white">Open factory →</Link> : null}</article>)}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-5" aria-labelledby="autonomy-title">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">Autonomous runs</p>
        <h2 id="autonomy-title" className="mt-2 text-xl font-bold text-white">Designed for work that continues after you leave</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">The production front door is active now. Durable timed runs, unified progress, batch review, and client-package execution require the next BeastFusion connection. Until that connection is verified, this page routes only to existing working factories and does not pretend that background work has started.</p>
      </section>
    </div>
  );
}
