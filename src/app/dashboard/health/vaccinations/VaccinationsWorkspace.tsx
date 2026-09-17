"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { normalizeHealthRecord, type HealthRecord } from "@/lib/health/foundation";
import { emptyVaccination, isVaccination, vaccinationDraft, vaccinationDueLabel, vaccinationValues, validateVaccination, type VaccinationDraft } from "@/lib/health/vaccinations";

export function VaccinationsWorkspace() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [documents, setDocuments] = useState<{ id: string; title: string }[]>([]);
  const [draft, setDraft] = useState<VaccinationDraft>(emptyVaccination);
  const [selected, setSelected] = useState<HealthRecord>();
  const [dirty, setDirty] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const saving = useRef(false);
  const newId = useRef("");
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  async function load() {
    setReady(false); setError("");
    try {
      const client = createClient();
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in to view vaccination records.");
      const [health, docs] = await Promise.all([
        client.from("beast_health_records").select("*").eq("owner_id", auth.user.id).in("record_type", ["procedure", "profile"]).neq("status", "archived").order("updated_at", { ascending: false }).limit(1000),
        client.from("beast_documents").select("id,title").eq("owner_id", auth.user.id).eq("category", "Health").not("status", "in", '("Archived","Deleted")').order("updated_at", { ascending: false }).limit(1000),
      ]);
      if (health.error || docs.error || health.data.length === 1000 || docs.data.length === 1000) throw new Error("The complete vaccination and document list could not be loaded. Try again.");
      setRecords(health.data.map(normalizeHealthRecord).filter((r): r is HealthRecord => Boolean(r && isVaccination(r))));
      setDocuments(docs.data); setReady(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Records unavailable."); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!dirty) return;
    const protect = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", protect);
    return () => window.removeEventListener("beforeunload", protect);
  }, [dirty]);
  function edit(key: keyof VaccinationDraft, value: string) { setDraft(current => ({ ...current, [key]: value })); setDirty(true); setMessage(""); }
  function reset(record?: HealthRecord) { setSelected(record); setDraft(record ? vaccinationDraft(record) : emptyVaccination()); setDirty(false); newId.current = ""; setMessage(""); setError(""); }
  async function save() {
    if (saving.current || !ready) return;
    const problem = validateVaccination(draft, today);
    if (problem) { setError(problem); return; }
    saving.current = true; setBusy(true); setError(""); setMessage("");
    try {
      const client = createClient();
      const { data: auth, error: authError } = await client.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in before saving.");
      if (selected && selected.ownerId !== auth.user.id) throw new Error("Your session changed. Reload before saving.");
      if (!newId.current) newId.current = crypto.randomUUID();
      const id = selected?.id || newId.current;
      const values = { ...vaccinationValues(draft, selected), updated_at: new Date().toISOString() };
      const query = selected
        ? client.from("beast_health_records").update(values).eq("id", id).eq("owner_id", auth.user.id).eq("updated_at", selected.updatedAt)
        : client.from("beast_health_records").insert({ id, owner_id: auth.user.id, ...values });
      const { data, error: writeError } = await query.select("*").maybeSingle();
      if (writeError) throw new Error("Could not confirm the save. Your edits remain here. If your connection dropped, copy them and reload to check before retrying.");
      if (!data) throw new Error("This record changed in another session. Copy your edits and reload before saving again.");
      const saved = normalizeHealthRecord(data);
      if (!saved || saved.ownerId !== auth.user.id || saved.id !== id) throw new Error("Could not confirm the saved record.");
      setRecords(current => [saved, ...current.filter(r => r.id !== id)]); reset(saved); setMessage("Vaccination record saved.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Save failed. Your edits are still here."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <div className="space-y-5">
    <p className="text-sm text-slate-300">These are recorded dates, not a personalized vaccination schedule. Confirm next doses with your provider. Due-date reminders appear here; email and push reminders are not enabled.</p>
    <div className="flex flex-wrap gap-3"><button className="beast-button-secondary" disabled={dirty || busy} onClick={() => void load()}>Reload records</button><Link className="beast-button-secondary" target="_blank" rel="noopener noreferrer" href="/dashboard/health/documents">Health documents</Link></div>
    {error && <p role="alert" className="text-red-200">{error}</p>}{message && <p role="status" className="text-green-200">{message}</p>}
    {!ready && !error && <p role="status">Loading records…</p>}
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="space-y-3" aria-label="Saved vaccination records">
        {ready && !records.length && <p>No vaccination records saved. Your vaccination history is unknown.</p>}
        {records.map(record => { const item = vaccinationDraft(record); return <article key={record.id} className="rounded-xl border border-white/15 p-4"><h2 className="font-bold">{item.name}{item.dose ? ` · Dose ${item.dose}` : ""}</h2><p>Dose status: {item.administrationStatus}</p><p>Date received: {item.receivedOn || "unknown"}</p><p>{vaccinationDueLabel(item.dueOn, today)}</p>{item.dueOn && <p className="text-sm text-slate-300">Date source: {item.dueSource || "unknown"}</p>}<button className="beast-button-secondary mt-3" disabled={dirty || busy} onClick={() => reset(record)}>Review / edit</button></article>; })}
      </section>
      <form className="space-y-4 rounded-xl border border-white/15 p-4" onSubmit={event => { event.preventDefault(); void save(); }}>
        <h2 className="font-bold">{selected ? "Edit vaccination" : "Add vaccination"}</h2>
        <fieldset disabled={!ready || busy} className="space-y-4">
          <label className="block text-sm">Dose status<select className="beast-input mt-1 w-full" value={draft.administrationStatus} onChange={event => edit('administrationStatus',event.target.value)}><option value="unknown">Unknown</option><option value="received">Received</option><option value="planned">Planned</option></select></label>
          {([['name' ,'Vaccine name','text'],['dose','Dose number or label','text'],['receivedOn','Date received (leave blank if unknown)','date'],['dueOn','Next dose due (if known)','date'],['provider','Provider / location','text']] as const).map(([key,label,type]) => <label key={key} className="block text-sm">{label}<input className="beast-input mt-1 w-full" type={type} maxLength={key === 'name' ? 160 : 2000} value={draft[key]} onChange={event => edit(key,event.target.value)} /></label>)}
          <label className="block text-sm">Next-dose date source<select className="beast-input mt-1 w-full" value={draft.dueSource} onChange={event => edit('dueSource',event.target.value)}><option value="">Unknown / no date</option><option value="provider">Provider instruction</option><option value="document">Documented schedule</option><option value="member">Member-entered date, unverified</option></select></label>
          <label className="block text-sm">Source document<select className="beast-input mt-1 w-full" value={draft.documentId} onChange={event => edit('documentId',event.target.value)}><option value="">No document linked</option>{draft.documentId && !documents.some(doc => doc.id === draft.documentId) && <option value={draft.documentId}>Previously linked health record</option>}{documents.map(doc => <option key={doc.id} value={doc.id}>{doc.title}</option>)}</select></label>
          <label className="block text-sm">Notes<textarea className="beast-input mt-1 w-full" maxLength={2000} value={draft.notes} onChange={event => edit('notes',event.target.value)} /></label>
          <div className="flex flex-wrap gap-3"><button className="beast-button-primary" disabled={!dirty}>{busy ? "Saving…" : "Save vaccination"}</button><button type="button" className="beast-button-secondary" onClick={() => reset(selected)}>Discard edits</button>{!dirty && <button type="button" className="beast-button-secondary" onClick={() => reset()}>New vaccination</button>}</div>
        </fieldset>
      </form>
    </div>
  </div>;
}
