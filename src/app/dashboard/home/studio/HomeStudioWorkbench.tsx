"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { HomeStudioFloorPlan } from "./HomeStudioFloorPlan";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import {
  buildHomeStudioClientQuote, createHomeStudioVersion, homeStudioBudgetSummary,
  homeStudioLayoutIssues, homeStudioPaymentLink, normalizeHomeStudioWorkspace,
  parseHomeStudioBackup, normalizeHomeStudioMoney, HOME_STUDIO_MAX_BACKUP_BYTES, HOME_STUDIO_MAX_VERSIONS,
  type HomeStudioProject, type HomeStudioPlan, type HomeStudioPlacement, type HomeStudioVersion,
  type HomeStudioWorkspaceData,
} from "@/lib/homeStudio";

const input = "mt-1 w-full min-w-0 rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-white";
function download(name: string, text: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function HomeStudioWorkbench({ project, plan, busy, stale, onWorkspace, onRestore, onImport }: {
  project: HomeStudioProject; plan: HomeStudioPlan | null; busy: boolean; stale: boolean;
  onWorkspace: (data: HomeStudioWorkspaceData) => void;
  onRestore: (version: HomeStudioVersion) => void;
  onImport: (data: { project: HomeStudioProject; plan: HomeStudioPlan | null }) => void;
}) {
  const data = project.workspace || normalizeHomeStudioWorkspace(null);
  const [notice, setNotice] = useState("");
  const [label, setLabel] = useState("");
  const [compareId, setCompareId] = useState("");
  const [importing, setImporting] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);
  const compare = data.versions.find(v => v.id === compareId);
  const locked = busy || importing;
  const patch = (change: Partial<HomeStudioWorkspaceData>) => { if (!locked) onWorkspace({ ...data, ...change }); };
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file || busy) return;
    setImporting(true);
    try {
      if (file.size > HOME_STUDIO_MAX_BACKUP_BYTES) throw new Error("Choose a Home Studio JSON backup under 500 KB.");
      const next = parseHomeStudioBackup(await file.text());
      if (!window.confirm(`Import “${next.project.roomName}” as a new unsaved project? Current unsaved work and session photos will be replaced.`)) return;
      onImport(next); setNotice("Backup imported as a new project. Save project to keep it in your account. Photos are not part of the backup.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "Unable to read this backup."); }
    finally { setImporting(false); }
  }
  function changePlacement(index: number, changes: Partial<HomeStudioPlacement>) {
    patch({ layout: data.layout.map((item, i) => index === i ? { ...item, ...changes } : item) });
  }
  return <DashboardCard accent="home">
    <SectionHeader eyebrow="Project workbench" title="Budget, layouts, versions, and delivery" description="Keep practical project details with your room. Use Save project above after making changes. These tools do not call the AI provider." />
    <fieldset disabled={locked} className="mt-5 min-w-0 space-y-5">
      <details className="rounded-xl border border-slate-700 p-4" open>
        <summary className="cursor-pointer font-bold text-cyan-100">Budget tracker</summary>
        <label className="mt-4 block text-sm">Shopping budget limit (USD)<input aria-label="Shopping budget limit (USD)" className={input} inputMode="decimal" value={data.budgetLimit} maxLength={9} placeholder="1000.00" onChange={e => { if (/^\d{0,6}(\.\d{0,2})?$/.test(e.target.value)) patch({ budgetLimit: e.target.value }); }} /></label>
        <p className="mt-3 text-sm leading-6 text-slate-200" aria-live="polite">{homeStudioBudgetSummary(project, plan)}</p>
        <p className="mt-2 text-xs text-slate-400">Enter quantities and prices in the shopping list below. The AI planning ranges are not used as actual prices. This tracker does not change the working budget in your design brief.</p>
      </details>
      <details className="rounded-xl border border-slate-700 p-4">
        <summary className="cursor-pointer font-bold text-cyan-100">Measured furniture and openings</summary>
        <p className="mt-3 text-sm text-slate-300">Use {project.measurementUnit}. X is distance from the left (west) wall; Y is distance from the top (north) wall. Width runs left to right; depth runs top to bottom. Door and window rectangles mark their position and clearance area; they do not simulate a door swing.</p>
        <button type="button" className="beast-button-secondary mt-3" disabled={data.layout.length >= 24} onClick={() => patch({ layout: [...data.layout, { id: crypto.randomUUID(), label: `Item ${data.layout.length + 1}`, kind: "Furniture", x: 0, y: 0, width: 1, depth: 1 }] })}>Add layout item</button>
        {data.layout.map((item, index) => <fieldset key={item.id} className="mt-4 min-w-0 rounded-lg border border-slate-700 p-3"><legend className="px-1 text-sm font-bold">Layout item {index + 1}</legend>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">Label<input className={input} value={item.label} maxLength={60} onChange={e => changePlacement(index, { label: e.target.value })} /></label>
            <label className="text-sm">Kind<select className={input} value={item.kind} onChange={e => changePlacement(index, { kind: e.target.value as HomeStudioPlacement["kind"] })}>{["Furniture", "Door", "Window"].map(k => <option key={k}>{k}</option>)}</select></label>
            {(["x", "y", "width", "depth"] as const).map(key => <label key={key} className="text-sm">{key.toUpperCase()} ({project.measurementUnit})<input className={input} type="number" min={key === "x" || key === "y" ? 0 : 0.01} max={999} step="0.01" value={item[key]} onChange={e => { const n = Number(e.target.value); if (Number.isFinite(n) && n >= 0 && n <= 999) changePlacement(index, { [key]: n }); }} /></label>)}
          </div><div className="mt-3 flex flex-wrap gap-3"><button type="button" className="beast-button-secondary" onClick={() => changePlacement(index, { width: item.depth, depth: item.width })}>Rotate 90°</button><button type="button" className="beast-button-secondary" onClick={() => { if (window.confirm(`Remove ${item.label} from this layout?`)) patch({ layout: data.layout.filter((_, i) => i !== index) }); }}>Remove layout item</button></div>
        </fieldset>)}
        {homeStudioLayoutIssues(project).length ? <ul className="mt-3 space-y-2 text-sm text-amber-200" role="status">{homeStudioLayoutIssues(project).map((issue, i) => <li key={i}>{issue}</li>)}</ul> : null}
        <p className="mt-3 text-xs text-slate-400">The diagram above updates as you edit. Check every clearance on site. Layout changes are manual and do not regenerate the AI plan.</p>
      </details>
      <details className="rounded-xl border border-slate-700 p-4">
        <summary className="cursor-pointer font-bold text-cyan-100">Design versions and comparison</summary>
        <p className="mt-3 text-sm text-slate-300">Keep up to five named snapshots of the brief, plan, shopping list, budget, and layout. Photos are session-only. Snapshots become durable when you save the project or download a backup.</p>
        <label className="mt-3 block text-sm">Version name<input className={input} value={label} maxLength={80} placeholder="Option A — keep the desk" onChange={e => setLabel(e.target.value)} /></label>
        <button className="beast-button-secondary mt-3" type="button" disabled={!plan || stale || data.versions.length >= HOME_STUDIO_MAX_VERSIONS} onClick={() => { if (plan) { patch({ versions: [...data.versions, createHomeStudioVersion(project, plan, label, crypto.randomUUID(), new Date().toISOString())] }); setLabel(""); setNotice("Snapshot added. Save project to keep it."); } }}>Keep design version</button>
        <div className="mt-3 space-y-3">{data.versions.map(v => <article className="rounded-lg border border-slate-700 p-3" key={v.id}><h3 className="font-bold">{v.label}</h3><p className="text-xs text-slate-400">{v.createdAt ? new Date(v.createdAt).toLocaleString() : "Imported version"}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" className="beast-button-secondary" onClick={() => setCompareId(v.id)}>Compare</button><button type="button" className="beast-button-secondary" onClick={() => { if (window.confirm("Restore this version? Current unsaved brief, plan, shopping, and layout edits will be replaced. Existing snapshots remain.")) onRestore(v); }}>Restore version</button><button type="button" className="beast-button-secondary" onClick={() => { if (window.confirm(`Remove snapshot “${v.label}”?`)) patch({ versions: data.versions.filter(item => item.id !== v.id) }); }}>Remove version</button></div></article>)}</div>
        {compare ? <div className="mt-4 grid gap-4 md:grid-cols-2">{[{ title: "Current design", project, plan }, { title: compare.label, project: { ...compare.project, workspace: { ...data, budgetLimit: compare.budgetLimit, layout: compare.layout } }, plan: compare.plan }].map((v, i) => <article key={i} className="min-w-0 rounded-lg bg-slate-950 p-4"><h3 className="font-bold text-cyan-100">{v.title}</h3><p className="mt-2 text-sm">{v.project.style} · {v.project.roomLength || "?"} × {v.project.roomWidth || "?"} {v.project.measurementUnit}</p><p className="mt-2 text-sm">{v.plan?.summary || "No plan"}</p><HomeStudioFloorPlan project={v.project} /><p className="mt-2 text-xs text-slate-300">{homeStudioBudgetSummary(v.project, v.plan)}</p><ul className="mt-2 list-inside list-disc text-sm">{v.plan?.layoutPlan.map((line, n) => <li key={n}>{line}</li>)}</ul></article>)}</div> : null}
      </details>
      <details className="rounded-xl border border-slate-700 p-4">
        <summary className="cursor-pointer font-bold text-cyan-100">Client intake, quote, and delivery</summary>
        <p className="mt-3 text-sm text-slate-300">For client projects, share the <a className="text-cyan-300 underline" href="/home-studio/intake" target="_blank" rel="noopener noreferrer">room intake form</a>. The client downloads their brief and sends it to you through your agreed channel. Import that file below. Home Studio does not send messages automatically.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {([['name','Client name',100],['email','Client email',200],['fee','Quoted service fee (USD)',9],['dueDate','Target delivery date',10],['paymentLink','Stripe Payment Link or invoice URL',1500]] as const).map(([key, title, max]) => <label key={key} className="text-sm">{title}<input className={input} type={key === "dueDate" ? "date" : key === "email" ? "email" : "text"} value={data.client[key]} maxLength={max} onChange={e => patch({client:{...data.client,[key]:e.target.value}})} /></label>)}
          <label className="text-sm">Delivery stage<select className={input} value={data.client.stage} onChange={e => patch({client:{...data.client,stage:e.target.value as typeof data.client.stage}})}>{["Intake","Designing","Ready for review","Delivered"].map(stage => <option key={stage}>{stage}</option>)}</select></label>
          <label className="text-sm">Payment record (manual)<select className={input} value={data.client.payment} onChange={e => patch({client:{...data.client,payment:e.target.value as typeof data.client.payment}})}>{["Not recorded","Unpaid","Paid externally"].map(value => <option key={value}>{value}</option>)}</select></label>
        </div>
        <label className="mt-3 block text-sm">Agreed scope and revisions<textarea className={input} value={data.client.scope} maxLength={1600} rows={4} onChange={e => patch({client:{...data.client,scope:e.target.value}})} placeholder="Deliverables, included revisions, exclusions, and delivery arrangements" /></label>
        {data.client.paymentLink && !homeStudioPaymentLink(data.client.paymentLink) ? <p className="mt-2 text-sm text-amber-200">Use an HTTPS buy.stripe.com or invoice.stripe.com link.</p> : null}
        <button type="button" className="beast-button-secondary mt-3" disabled={!project.roomName || !data.client.name || !data.client.scope || !normalizeHomeStudioMoney(data.client.fee) || Boolean(data.client.paymentLink && !homeStudioPaymentLink(data.client.paymentLink))} onClick={() => download("home-studio-proposal.html",buildHomeStudioClientQuote(project),"text/html")}>Download client proposal</button>
        <p className="mt-3 text-xs leading-5 text-slate-400">Create a matching Payment Link or invoice in your Stripe account, then paste it here. Payment is recorded manually after checking Stripe; no charge, verification, or delivery happens here. Use the printable design packet below for delivery. Keep the JSON backup private: it contains internal client notes and version history.</p>
      </details>
      <details className="rounded-xl border border-slate-700 p-4">
        <summary className="cursor-pointer font-bold text-cyan-100">Backup and restore</summary>
        <p className="mt-3 text-sm text-slate-300">Backups contain the current brief, plan, shopping details, versions, layout, and client record. Images are excluded. Imports open as a new project and never overwrite an existing saved project automatically.</p>
        <div className="mt-3 flex flex-wrap gap-3"><button className="beast-button-secondary" type="button" disabled={!project.roomName.trim() || stale} onClick={() => download("home-studio-backup.json", JSON.stringify({ schemaVersion: 2, project, plan, photosStored: false }, null, 2))}>Download full backup</button><button className="beast-button-secondary" type="button" onClick={() => importInput.current?.click()}>{importing ? "Reading backup…" : "Import project or client brief"}</button></div>
        <input ref={importInput} type="file" accept="application/json,.json" className="sr-only" aria-label="Import Home Studio JSON" onChange={importFile} />
      </details>
    </fieldset>
    {notice ? <p role="status" className="mt-4 text-sm text-cyan-100">{notice}</p> : null}
  </DashboardCard>;
}
