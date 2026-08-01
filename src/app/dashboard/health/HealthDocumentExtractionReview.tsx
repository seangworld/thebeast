"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  HealthDocumentExtraction,
  HealthDocumentExtractionCategory,
  HealthDocumentExtractionItem,
} from "@/lib/health/documentExtraction";
import { createClient } from "@/lib/supabase/client";

type HealthDocument = { id: string; title: string; fileName: string; updatedAt: string };
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
  const [documents, setDocuments] = useState<HealthDocument[]>([]);
  const [extractions, setExtractions] = useState<HealthDocumentExtraction[]>([]);
  const [items, setItems] = useState<HealthDocumentExtractionItem[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const client = createClient();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) throw new Error("Sign in is required.");
    const ownerId = auth.user.id;
    const [documentResult, extractionResult] = await Promise.all([
      client.from("beast_documents")
        .select("id, title, file_name, updated_at")
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
      updatedAt: document.updated_at,
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

  useEffect(() => { void load().catch(() => setError("Document extraction review is unavailable. The BH-204 migration may still need owner review and application.")); }, []);

  const latestByDocument = useMemo(() => {
    const result = new Map<string, HealthDocumentExtraction>();
    for (const extraction of extractions) if (!result.has(extraction.documentId)) result.set(extraction.documentId, extraction);
    return result;
  }, [extractions]);

  async function startExtraction() {
    if (!selectedDocumentId || !documentText.trim()) return;
    setBusy("extract"); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/health/documents/${selectedDocumentId}/extract`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consent: true, text: documentText }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Extraction failed.");
      setDocumentText(""); await load();
      setMessage(payload.reused ? "The matching saved extraction was reused; the document was not processed twice." : "Extraction proposals are ready. Review each item before approving it.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Extraction failed."); }
    finally { setBusy(""); }
  }

  async function reviewItem(item: HealthDocumentExtractionItem, action: "approve" | "reject") {
    setBusy(item.id); setError(""); setMessage("");
    try {
      const client = createClient();
      if (action === "approve") {
        const { error: approvalError } = await client.rpc("approve_beast_health_document_extraction_item", { requested_item_id: item.id });
        if (approvalError) throw approvalError;
      } else {
        const { data: auth } = await client.auth.getUser();
        const { error: rejectionError } = await client.from("beast_health_document_extraction_items")
          .update({ status: "rejected", reviewed_at: new Date().toISOString() })
          .eq("id", item.id).eq("owner_id", auth.user?.id || "").eq("status", "pending");
        if (rejectionError) throw rejectionError;
      }
      await load();
      setMessage(action === "approve" ? "Approved and linked to the source document and Health timeline." : "Proposal rejected. No health record was created.");
    } catch { setError("The review decision could not be saved. No partial record was created."); }
    finally { setBusy(""); }
  }

  return (
    <section className="rounded-2xl border border-cyan-300/20 bg-cyan-950/10 p-5" aria-labelledby="health-document-extraction-title">
      <h2 id="health-document-extraction-title" className="text-xl font-black text-white">Intelligent medical records</h2>
      <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">Choose an uploaded Health document and paste its selectable text. Extraction runs inside Beast, remembers a content fingerprint, and creates review proposals only. The document text is not retained or sent to an external model.</p>
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
      <button type="button" className="beast-button-primary mt-4 min-h-11" disabled={!selectedDocumentId || !documentText.trim() || busy === "extract"} onClick={() => void startExtraction()}>{busy === "extract" ? "Extracting…" : "Extract for owner review"}</button>
      {message ? <p role="status" className="mt-4 text-sm font-bold text-emerald-200">{message}</p> : null}
      {error ? <p role="alert" className="mt-4 text-sm font-bold text-red-200">{error}</p> : null}

      <div className="mt-6 space-y-4">
        {documents.map((document) => {
          const extraction = latestByDocument.get(document.id);
          if (!extraction) return null;
          const proposals = items.filter((item) => item.extractionId === extraction.id);
          return <article key={extraction.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-black text-white">{document.title}</h3><p className="mt-1 text-xs text-[#9aa7b8]">{extraction.summary}</p></div><span className="rounded-full border border-white/10 px-2.5 py-1 text-xs font-bold text-cyan-100">{extraction.status}</span></div>
            <div className="mt-4 space-y-3">{proposals.map((item) => <div key={item.id} className="rounded-xl border border-white/10 p-3">
              <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black uppercase text-cyan-200">{categoryLabels[item.category]}</span><span className="text-xs text-[#9aa7b8]">{item.confidence === null ? "Confidence unavailable" : `${Math.round(item.confidence * 100)}% transcription confidence`}</span><span className="ml-auto text-xs font-bold text-[#c7cfdb]">{item.status}</span></div>
              <p className="mt-2 font-bold text-white">{item.label}: {item.value}</p>
              {item.occurredOn ? <p className="mt-1 text-xs text-[#9aa7b8]">Date: {item.occurredOn}</p> : null}
              {item.sourceExcerpt ? <p className="mt-2 border-l-2 border-cyan-300/30 pl-3 text-xs leading-5 text-[#9aa7b8]">Source: {item.sourceExcerpt}</p> : null}
              {item.status === "pending" ? <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="beast-button-primary min-h-10" disabled={busy === item.id} onClick={() => void reviewItem(item, "approve")}>Approve and create record</button><button type="button" className="beast-button-secondary min-h-10" disabled={busy === item.id} onClick={() => void reviewItem(item, "reject")}>Reject</button></div> : null}
            </div>)}</div>
          </article>;
        })}
      </div>
    </section>
  );
}
