"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buildClaimGuidance, claimStages, claimTypes, draftClaimStatement, emptyVeteranClaim, evidenceLabels, evidenceStatuses, vaResources, type EvidenceKey, type VeteranClaim } from "@/lib/health/veteranClaims";
import { loadVeteranClaims, saveVeteranClaim } from "@/lib/health/veteranClaimsPersistence";

export function VeteransClaimsWorkspace() {
  const [claims, setClaims] = useState<VeteranClaim[]>([]);
  const [draft, setDraft] = useState<VeteranClaim | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const pending = useRef(false);
  async function load() {
    setLoading(true); setError("");
    try { const rows = await loadVeteranClaims(createClient()); setClaims(rows); setDraft(rows[0] || null); setDirty(false); setLoadFailed(false); }
    catch (e) { setLoadFailed(true); setError(e instanceof Error ? e.message : "Claims could not be loaded."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  function edit(next: VeteranClaim) { setDraft(next); setDirty(true); setMessage(""); }
  async function save() {
    if (!draft || pending.current) return;
    pending.current = true; setSaving(true); setError(""); setMessage("");
    try { const saved = await saveVeteranClaim(createClient(), draft); setClaims(current => [saved, ...current.filter(c => c.id !== saved.id)]); setDraft(saved); setDirty(false); setMessage("Claim saved. Nothing has been submitted to VA."); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not confirm the save. Your edits are still here."); }
    finally { pending.current = false; setSaving(false); }
  }
  const guidance = draft ? buildClaimGuidance(draft) : null;
  return <div className="space-y-5">
    <p className="rounded-xl border border-sky-900 bg-slate-900 p-4 text-base leading-relaxed text-slate-300">This is a preparation workspace, not a VA representative or filing service. Statuses are entered by you and do not sync with VA. Use accredited help for representation or deciding a review route. Avoid entering SSNs, account passwords, or VA file numbers.</p>
    <div className="flex flex-wrap gap-3">
      <Link target="_blank" rel="noopener noreferrer" href="/dashboard/health/ai-advisor" className="inline-flex min-h-11 items-center rounded-lg border border-violet-300 bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300">Ask Health Advisor — select Veterans assistance</Link>
      <button className="beast-button-primary" disabled={loading || saving || dirty || loadFailed} onClick={() => { setDraft(emptyVeteranClaim(crypto.randomUUID())); setDirty(true); setMessage(""); setError(""); }}>Add claim / issue</button>
      <button className="beast-button-secondary" disabled={loading || saving || dirty} onClick={() => void load()}>Reload claims</button>
      <Link target="_blank" rel="noopener noreferrer" href="/dashboard/health/documents" className="beast-button-secondary">Health documents</Link>
    </div>
    {error ? <p role="alert" className="text-amber-200">{error}</p> : null}
    {message ? <p role="status" className="text-emerald-300">{message}</p> : null}
    {loading ? <p role="status">Loading your claims…</p> : <div className="grid min-w-0 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-2" aria-label="Your claims"><h2 className="text-lg font-bold">Your claims</h2>
        {claims.length === 0 && !loadFailed ? <p className="text-sm text-slate-400">Start with one condition or issue. You can add more later.</p> : null}
        {claims.map(claim => <button key={claim.id} disabled={saving || dirty} aria-pressed={draft?.id === claim.id} className={`w-full break-words rounded-xl border p-3 text-left ${draft?.id === claim.id ? "border-sky-400" : "border-slate-700"}`} onClick={() => { setDraft(claim); setError(""); setMessage(""); }}><span className="block font-semibold">{claim.title}</span><span className="text-xs text-slate-400">{claimStages[claim.stage]}{claim.nextActionDate ? ` · Follow up ${claim.nextActionDate}` : ""}</span></button>)}
      </aside>
      {draft && guidance ? <div className="min-w-0 space-y-5">
        <form className="space-y-4 rounded-xl border border-slate-700 p-4" onSubmit={event => { event.preventDefault(); void save(); }}>
          <fieldset disabled={saving} className="space-y-4">
            <legend className="text-xl font-bold">Claim details</legend>
            <label className="block text-sm">Condition or issue<input className="beast-input mt-1" required maxLength={160} value={draft.title} onChange={e => edit({ ...draft, title: e.target.value })} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">Claim type<select className="beast-input mt-1" value={draft.claimType} onChange={e => edit({ ...draft, claimType: e.target.value as VeteranClaim["claimType"] })}>{Object.entries(claimTypes).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-sm">Your reported status<select className="beast-input mt-1" value={draft.stage} onChange={e => edit({ ...draft, stage: e.target.value as VeteranClaim["stage"] })}>{Object.entries(claimStages).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div>
            {([ ["serviceContext", "Service or event context"], ["impactNotes", "Symptoms and everyday impact"], ["timeline", "Dated notes / timeline"], ["nextAction", "Your next action"] ] as const).map(([key,label]) => <label key={key} className="block text-sm">{label}<textarea className="beast-input mt-1 min-h-24" maxLength={6000} value={draft.details[key]} placeholder={key === "timeline" ? "Date — what happened — record or source. Add new entries on separate lines." : "Use your own facts and note anything you are unsure about."} onChange={e => edit({ ...draft, details: { ...draft.details, [key]: e.target.value } })} /></label>)}
            <label className="block text-sm">Follow-up date<input className="beast-input mt-1" type="date" value={draft.nextActionDate} onChange={e => edit({ ...draft, nextActionDate: e.target.value })} /><span className="mt-1 block text-xs text-slate-400">A date you choose, not a calculated VA filing deadline. Check the dates in your VA notice.</span></label>
            <h3 className="text-lg font-bold">Evidence tracker</h3>
            <p className="text-sm text-slate-400">Mark what you have and where it is. This tracks references; it does not upload or submit evidence.</p>
            {(Object.keys(evidenceLabels) as EvidenceKey[]).map(key => <div key={key} className="grid gap-2 rounded-lg border border-slate-800 p-3 sm:grid-cols-2">
              <label className="text-sm">{evidenceLabels[key]}<select className="beast-input mt-1" value={draft.details.evidence[key].status} onChange={e => edit({ ...draft, details: { ...draft.details, evidence: { ...draft.details.evidence, [key]: { ...draft.details.evidence[key], status: e.target.value as keyof typeof evidenceStatuses } } } })}>{Object.entries(evidenceStatuses).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label className="text-sm">Source / location for {evidenceLabels[key].toLowerCase()}<input className="beast-input mt-1" maxLength={800} value={draft.details.evidence[key].reference} placeholder="Document title, date, provider, or records request" onChange={e => edit({ ...draft, details: { ...draft.details, evidence: { ...draft.details.evidence, [key]: { ...draft.details.evidence[key], reference: e.target.value } } } })} /></label>
            </div>)}
            <details className="rounded-lg border border-slate-700 p-3"><summary className="cursor-pointer font-bold">Personal statement working draft</summary>
              <p className="my-2 text-sm text-slate-400">Build a draft from your notes. No medical opinion or facts are added. Review it before sharing with an accredited representative.</p>
              <button type="button" disabled={Boolean(draft.details.statement)} className="beast-button-secondary" onClick={() => { const statement = draftClaimStatement(draft); if (statement.length > 6000) { setError("Shorten your notes before creating a statement draft (6,000-character limit)."); return; } edit({ ...draft, details: { ...draft.details, statement } }); }}>Create draft from my notes</button>
              <label className="mt-3 block text-sm">Editable draft<textarea className="beast-input mt-1 min-h-64" maxLength={6000} value={draft.details.statement} onChange={e => edit({ ...draft, details: { ...draft.details, statement: e.target.value } })} /></label>
              <p className="text-xs text-slate-400">An existing draft will not be overwritten. Clear it first if you want to regenerate it.</p>
            </details>
            <div className="flex flex-wrap items-center gap-3"><button type="submit" className="beast-button-primary" disabled={!dirty}>{saving ? "Saving…" : "Save claim"}</button><button type="button" className="beast-button-secondary" disabled={!dirty} onClick={() => { setDraft(claims.find(c => c.id === draft.id) || null); setDirty(false); setError(""); }}>Discard unsaved edits</button><span className="text-sm text-slate-400">{dirty ? "Unsaved changes — save before switching claims." : "Saved"}</span></div>
          </fieldset>
        </form>
        <section className="space-y-3 rounded-xl border border-sky-800 p-4" aria-labelledby="va-guide-title"><h2 id="va-guide-title" className="text-xl font-bold">VA Claims Guide</h2><p className="text-sm text-slate-400">Guided preparation based on your selected claim type, evidence tracker, and official VA resources.</p><p>{guidance.lane}</p>
          <h3 className="font-semibold">Items to review</h3>{guidance.gaps.length ? <ul className="list-disc space-y-1 pl-5">{guidance.gaps.map(gap => <li key={gap}>{gap}</li>)}</ul> : <p>Your selected tracker items are marked available or not applicable. This does not establish that your evidence is sufficient.</p>}
          <h3 className="font-semibold">Questions for your clinician or accredited representative</h3><ul className="list-disc space-y-1 pl-5">{guidance.questions.map(q => <li key={q}>{q}</li>)}</ul>
        </section>
      </div> : <p className="text-slate-400">Select a saved claim or add an issue to begin.</p>}
    </div>}
    <section className="rounded-xl border border-slate-700 p-4"><h2 className="font-bold">Official VA resources</h2><div className="mt-3 flex flex-wrap gap-4">{vaResources.map(resource => <a key={resource.href} href={resource.href} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline">{resource.label}</a>)}</div><p className="mt-3 text-xs text-slate-400">Resources reviewed September 17, 2026. Follow the current VA page and your decision notice for requirements and deadlines.</p></section>
  </div>;
}
