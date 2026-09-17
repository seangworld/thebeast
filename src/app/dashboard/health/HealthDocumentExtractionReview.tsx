"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  HealthDocumentExtraction,
  HealthDocumentExtractionCategory,
  HealthDocumentExtractionItem,
} from "@/lib/health/documentExtraction";
import { loadCanonicalMemberHealthRecords } from "@/lib/health/canonicalRecords";
import type { HealthRecord } from "@/lib/health/foundation";
import { healthDocumentMatches } from "@/lib/health/documentReconciliation";
import { createClient } from "@/lib/supabase/client";

type HealthDocument = { id: string; title: string; fileName: string; updatedAt: string; bucket: string; path: string };
type ExtractionRow = {
  id: string; document_id: string; content_fingerprint: string;
  extraction_version: string; status: string; summary: string | null;
  error_message: string | null; created_at: string; completed_at: string | null;
};
type ItemRow = {
  id: string; extraction_id: string; category: string; label: string; value: string;
  occurred_on: string | null; source_excerpt: string | null; confidence: number | null;
  status: string; approved_record_id: string | null;
};

const categoryLabels: Record<HealthDocumentExtractionCategory, string> = {
  diagnosis: "Diagnosis", condition: "Condition", medication: "Medication",
  procedure: "Procedure", provider: "Provider", appointment: "Appointment",
  lab_value: "Lab value", allergy: "Allergy", vaccination: "Vaccination",
  instruction: "Instruction", date: "Date", facility: "Facility",
};

export function HealthDocumentExtractionReview() {
  const [healthRecords, setHealthRecords] = useState<HealthRecord[]>([]);
  const [reviews, setReviews] = useState<Record<string, { title: string; status: string; assertion: string; target: string; date: string }>>({});
  const [fileConsent, setFileConsent] = useState(false);
  const [documents, setDocuments] = useState<HealthDocument[]>([]);
  const [extractions, setExtractions] = useState<HealthDocumentExtraction[]>([]);
  const [items, setItems] = useState<HealthDocumentExtractionItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function reviewDefaults(item: HealthDocumentExtractionItem) { return { title: /^(medication|condition|diagnosis|procedure|vaccination|vaccine|allergy|provider|appointment|facility|lab|date|instruction)$/i.test(item.label) ? "" : item.label, status: "", assertion: "", target: "", date: "" }; }

  async function load() {
    const client = createClient();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) throw new Error("Sign in is required.");
    const ownerId = auth.user.id;
    const canonical = await loadCanonicalMemberHealthRecords(client, ownerId);
    setHealthRecords(canonical);
    const [documentResult, extractionResult] = await Promise.all([
      client.from("beast_documents")
        .select("id, title, file_name, updated_at, storage_bucket, storage_path")
        .eq("owner_id", ownerId).eq("category", "Health")
        .not("status", "in", '("Archived","Deleted")')
        .order("updated_at", { ascending: false }),
      client.from("beast_health_document_extractions")
        .select("id, document_id, content_fingerprint, extraction_version, status, summary, error_message, created_at, completed_at")
        .eq("owner_id", ownerId).order("created_at", { ascending: false }),
    ]);
    if (documentResult.error || extractionResult.error) throw new Error("Records unavailable.");
    const nextDocuments = (documentResult.data || []).map((document) => ({
      id: document.id, title: document.title, fileName: document.file_name,
      updatedAt: document.updated_at, bucket: document.storage_bucket, path: document.storage_path,
    }));
    const titleById = new Map(nextDocuments.map((document) => [document.id, document.title]));
    const nextExtractions = ((extractionResult.data || []) as ExtractionRow[]).map((row) => ({
      id: row.id, documentId: row.document_id,
      documentTitle: titleById.get(row.document_id) || "Health document",
      contentFingerprint: row.content_fingerprint, extractionVersion: row.extraction_version,
      status: row.status as HealthDocumentExtraction["status"], summary: row.summary,
      errorMessage: row.error_message, createdAt: row.created_at, completedAt: row.completed_at,
    }));
    const extractionIds = nextExtractions.map((extraction) => extraction.id);
    let nextItems: HealthDocumentExtractionItem[] = [];
    if (extractionIds.length) {
      const itemResult = await client.from("beast_health_document_extraction_items")
        .select("id, extraction_id, category, label, value, occurred_on, source_excerpt, confidence, status, approved_record_id")
        .eq("owner_id", ownerId).in("extraction_id", extractionIds).order("created_at");
      if (itemResult.error) throw new Error("Review proposals unavailable.");
      nextItems = ((itemResult.data || []) as ItemRow[]).map((row) => ({
        id: row.id, extractionId: row.extraction_id,
        category: row.category as HealthDocumentExtractionCategory,
        label: row.label, value: row.value, occurredOn: row.occurred_on,
        sourceExcerpt: row.source_excerpt, confidence: row.confidence,
        status: row.status as HealthDocumentExtractionItem["status"],
        approvedRecordId: row.approved_record_id,
      }));
    }
    setDocuments(nextDocuments); setExtractions(nextExtractions); setItems(nextItems);
    setSelectedDocumentId((current) => current || nextDocuments[0]?.id || "");
  }

  useEffect(() => { void load().catch(() => setError("Document review is unavailable. Please retry shortly.")); }, []);

  const latestByDocument = useMemo(() => {
    const result = new Map<string, HealthDocumentExtraction>();
    for (const extraction of extractions) if (!result.has(extraction.documentId)) result.set(extraction.documentId, extraction);
    return result;
  }, [extractions]);

  async function downloadOriginal(document: HealthDocument) {
    if (busy) return;
    setBusy(document.id); setError("");
    try {
      const {data,error} = await createClient().storage.from(document.bucket).download(document.path);
      if (error || !data) throw new Error("Download unavailable");
      const url = URL.createObjectURL(data);
      const link = window.document.createElement("a"); link.href=url; link.download=document.fileName; link.click();
      window.setTimeout(()=>URL.revokeObjectURL(url),10000);
    } catch { setError("The original file could not be downloaded. Try again."); }
    finally { setBusy(""); }
  }

  async function startExtraction(fromFile = false) {
    if (busy || !selectedDocumentId || (fromFile ? !fileConsent : !documentText.trim())) return;
    setBusy("extract"); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/health/documents/${selectedDocumentId}/extract`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, ...(fromFile ? { source: "file" } : { text: documentText }) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Extraction failed.");
      setDocumentText(""); await load();
      setMessage(payload.reused ? "The matching saved extraction was reused; the document was not processed twice." : "Extraction proposals are ready. Review each item before approving it.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Extraction failed."); }
    finally { setBusy(""); }
  }

  async function reviewItem(item: HealthDocumentExtractionItem, action: "approve" | "reject") {
    if (busy) return;
    setBusy(item.id); setError(""); setMessage("");
    try {
      const client = createClient();
      if (action === "approve") {
        const review = reviews[item.id];
        if (!review?.title.trim() || !review.status || !review.assertion) throw new Error("Confirm the name, current/past status, and evidence type first.");
        const target = healthRecords.find(r => r.id === review.target);
        const { error: approvalError } = await client.rpc("review_beast_health_document_item", { requested_item_id: item.id, record_title: review.title, record_status: review.status, assertion_type: review.assertion, target_record_id: target?.id || null, expected_updated_at: target?.updatedAt || null, event_date: review.date || null });
        if (approvalError) throw approvalError;
      } else {
        const { data: auth } = await client.auth.getUser();
        const { data: rejected, error: rejectionError } = await client.from("beast_health_document_extraction_items")
          .update({ status: "rejected", reviewed_at: new Date().toISOString() })
          .eq("id", item.id).eq("owner_id", auth.user?.id || "").eq("status", "pending").select("id").maybeSingle();
        if (rejectionError || !rejected) throw new Error("Proposal changed. Reload the review.");
      }
      await load();
      setMessage(action === "approve" ? "Reviewed health information saved with its source document reference." : "Proposal rejected. No health record was created.");
    } catch { setError("Review could not be confirmed. Check all review fields, reload for possible duplicates or changed records, and try again. Your original file is safe."); }
    finally { setBusy(""); }
  }

  return (
    <section className="rounded-2xl border border-cyan-300/20 bg-cyan-950/10 p-5" aria-labelledby="health-document-extraction-title">
      <button type="button" className="beast-button-secondary mb-3" disabled={Boolean(busy)} onClick={()=>void load().catch(()=>setError("Could not reload document reviews."))}>Reload reviews</button>
      <h2 id="health-document-extraction-title" className="text-xl font-black text-white">Intelligent medical records</h2>
      <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">Choose a Health document to find proposed medications, conditions, procedures, and other facts. Review the name, current/past status, and evidence type before saving. Attach evidence to an existing record to avoid duplicates; existing details are preserved. AI proposals may contain errors—compare them with the source.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-[0.7fr_1.3fr]">
        <label className="text-xs font-bold uppercase text-[#9aa7b8]">Health document
          <select className="beast-input mt-2 w-full" value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.target.value)}>
            <option value="">Select a document</option>
            {documents.map((document) => <option key={document.id} value={document.id}>{document.title} ({document.fileName})</option>)}
          </select>
        </label>
        <label className="text-xs font-bold uppercase text-[#9aa7b8]">Document text
          <textarea className="beast-input mt-2 min-h-32 w-full resize-y" maxLength={250000} value={documentText} onChange={(event) => setDocumentText(event.target.value)} placeholder="Paste selectable medical document text here. Labeled lines such as Medication:, Diagnosis:, Lab:, Provider:, or Appointment: become proposals." />
        </label>
      </div>
      <label className="mt-4 flex gap-2 text-sm"><input type="checkbox" checked={fileConsent} disabled={Boolean(busy)} onChange={event=>setFileConsent(event.target.checked)} />Allow Beast to send this selected PDF or image to OpenAI for medical text extraction. Nothing enters my health profile until I approve.</label>
      <button type="button" className="beast-button-primary mt-3" disabled={!selectedDocumentId || !fileConsent || Boolean(busy)} onClick={()=>void startExtraction(true)}>Read uploaded PDF / image</button>
      <p className="mt-3 text-xs text-slate-300">Up to 10 MB. For a free local alternative, paste labeled text below; pasted text is processed inside Beast without an AI call.</p>
      <button type="button" className="beast-button-primary mt-4 min-h-11" disabled={!selectedDocumentId || !documentText.trim() || Boolean(busy)} onClick={() => void startExtraction()}>{busy === "extract" ? "Extracting…" : "Extract pasted text"}</button>
      {message ? <p role="status" className="mt-4 text-sm font-bold text-emerald-200">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 text-sm font-bold text-red-200">{error}</p> : null}

      <div className="mt-6 space-y-4">
        {documents.map((document) => {
          const extraction = latestByDocument.get(document.id);
          if (!extraction) return null;
          const proposals = extraction.status === "ready" ? items.filter((item) => item.extractionId === extraction.id) : [];
          return <article key={extraction.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-white">{document.title}</h3><p className="mt-1 text-xs text-[#9aa7b8]">{extraction.summary}</p></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-bold text-cyan-100">{extraction.status}</span></div>
            <button type="button" className="beast-button-secondary mt-3" disabled={Boolean(busy)} onClick={()=>void downloadOriginal(document)}>Download original</button>
            <div className="mt-4 space-y-3">{proposals.map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-3">
              <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black uppercase text-cyan-200">{categoryLabels[item.category]}</span><span className="text-xs text-[#9aa7b8]">{item.confidence === null ? "Confidence unavailable" : `${Math.round(item.confidence * 100)}% transcription confidence`}</span><span className="ml-auto text-xs font-bold text-[#c7cfdb]">{item.status}</span></div>
              <p className="mt-2 font-bold text-white">{item.label}: {item.value}</p>
              {item.occurredOn ? <p className="mt-1 text-xs text-[#9aa7b8]">Date: {item.occurredOn}</p> : null}
              {item.sourceExcerpt ? <p className="mt-2 border-l-2 border-cyan-300/30 pl-3 text-xs leading-5 text-[#9aa7b8]">Source: {item.sourceExcerpt}</p> : null}
              {item.status === "pending" ? <div className="mt-3 space-y-3">
                <label className="block text-sm">Individual record name<input className="beast-input mt-1 w-full" maxLength={160} value={reviews[item.id]?.title ?? reviewDefaults(item).title} onChange={event=>setReviews(current=>({...current,[item.id]:{...reviewDefaults(item),...current[item.id],title:event.target.value}}))} /></label>
                <label className="block text-sm">Current / past status<select className="beast-input mt-1 w-full" value={reviews[item.id]?.status || ''} onChange={event=>setReviews(current=>({...current,[item.id]:{...reviewDefaults(item),...current[item.id],status:event.target.value}}))}><option value="">Confirm status</option><option value="active">Current / active</option><option value="historical">Past / historical / received</option><option value="planned">Planned</option></select></label>
                <label className="block text-sm">Confirmed event date (leave blank if unknown)<input type="date" className="beast-input mt-1 w-full" value={reviews[item.id]?.date || ''} onChange={event=>setReviews(current=>({...current,[item.id]:{...reviewDefaults(item),...current[item.id],date:event.target.value}}))} /></label>
                <label className="block text-sm">Evidence type<select className="beast-input mt-1 w-full" value={reviews[item.id]?.assertion || ''} onChange={event=>setReviews(current=>({...current,[item.id]:{...reviewDefaults(item),...current[item.id],assertion:event.target.value}}))}><option value="">Confirm evidence type</option><option value="documented">Documented clinical finding</option><option value="claimed">Claimed condition / claim statement</option><option value="member_reported">Member-reported history</option><option value="uncertain">Uncertain — needs clarification</option></select></label>
                <label className="block text-sm">Existing record to attach evidence<select className="beast-input mt-1 w-full" value={reviews[item.id]?.target || ''} onChange={event=>setReviews(current=>({...current,[item.id]:{...reviewDefaults(item),...current[item.id],target:event.target.value}}))}><option value="">Create a new individual record</option>{healthDocumentMatches(item.category,reviews[item.id]?.title || item.label,healthRecords).map(r=><option key={r.id} value={r.id}>{r.title} — {r.status}</option>)}</select></label>
                {reviews[item.id]?.target && <p className="text-sm text-amber-100">Existing details and status will be preserved. New evidence is attached separately for review: {String(healthRecords.find(r=>r.id===reviews[item.id]?.target)?.details.context || "Review existing details in the relevant Health records section.")}</p>}
                <div className="flex flex-wrap gap-2"><button type="button" className="beast-button-primary min-h-10" disabled={Boolean(busy)} onClick={() => void reviewItem(item, "approve")}>Approve reviewed information</button><button type="button" className="beast-button-secondary min-h-10" disabled={Boolean(busy)} onClick={() => void reviewItem(item, "reject")}>Reject</button></div></div> : null}
            </div>)}</div>
          </article>;
        })}
      </div>
    </section>
  );
}
