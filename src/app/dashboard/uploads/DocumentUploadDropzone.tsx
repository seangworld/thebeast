"use client";

import { useRef, useState, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  documentCategories, documentStorageBucketName, buildDocumentStoragePath,
  formatDocumentFileSize, getDocumentUploadAcceptValue,
  getDocumentUploadBatchValidationError, type DocumentCategory,
} from "@/lib/platform/documents";
import { createClient } from "@/lib/supabase/client";
import type { ContextualWorkspaceConfig } from "@/lib/platform/contextualWorkspaces";
import { memberSafeMessage } from "@/lib/memberSafeError";

type SelectedDocument = {
  id: string;
  file: File;
  title: string;
  category: DocumentCategory;
  status: "ready" | "uploading" | "saved" | "error";
  message?: string;
  storagePath?: string;
  stored?: boolean;
  metadataSaved?: boolean;
};
const fieldClass = "mt-2 w-full rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-sm text-white disabled:opacity-60";
const buttonClass = "rounded-xl border border-slate-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50";

export function DocumentUploadDropzone({ context }: { context?: ContextualWorkspaceConfig }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // This synchronous guard also prevents double clicks before React renders.
  const busyRef = useRef(false);
  const [selected, setSelected] = useState<SelectedDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [healthExtractionConsent, setHealthExtractionConsent] = useState(false);
  const [message, setMessage] = useState("Choose up to 5 files, totaling 25 MB or less.");

  function chooseFiles(files: File[]) {
    if (busyRef.current || !files.length) return;
    // Start a fresh batch only after the current one has completely succeeded.
    const current = selected.every(item => item.status === "saved") ? [] : selected;
    const combined = [...current.map(item => item.file), ...files];
    const error = getDocumentUploadBatchValidationError(combined);
    if (error) { setMessage(error); return; }
    if (!current.length) setHealthExtractionConsent(false);
    setSelected([...current, ...files.map(file => ({
      id: crypto.randomUUID(), file,
      title: file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || file.name,
      category: context?.defaultDocumentCategory || "Other" as DocumentCategory,
      status: "ready" as const,
    }))]);
    setMessage("Ready. You can edit each title and category before uploading.");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setIsDragging(false);
    chooseFiles(Array.from(event.dataTransfer.files));
  }

  async function uploadDocuments() {
    if (busyRef.current) return;
    const validation = getDocumentUploadBatchValidationError(selected.map(item => item.file));
    if (validation) { setMessage(validation); return; }
    if (selected.some(item => !item.title.trim())) { setMessage("Give each file a title."); return; }
    busyRef.current = true; setBusy(true);
    const batch = selected.map(item => ({ ...item }));
    const publish = () => setSelected(batch.map(item => ({ ...item })));
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw new Error("Sign in to upload documents.");
      const ownerId = data.user.id;
      for (let index = 0; index < batch.length; index++) {
        const item = batch[index];
        if (item.status === "saved") continue;
        item.status = "uploading"; item.message = "Uploading…"; publish();
        setMessage(`Uploading file ${index + 1} of ${batch.length}: ${item.file.name}`);
        try {
          // Retain the same ID and path on retry, including uncertain network results.
          item.storagePath ||= buildDocumentStoragePath({ ownerId, category: item.category, fileName: item.file.name, documentId: item.id });
          if (!item.stored) {
            const result = await supabase.storage.from(documentStorageBucketName).upload(item.storagePath, item.file, {
              cacheControl: "3600", upsert: false, contentType: item.file.type,
            });
            if (result.error) {
              const existing = await supabase.storage.from(documentStorageBucketName).info(item.storagePath);
              if (existing.error || existing.data?.size !== item.file.size) throw result.error;
            }
            item.stored = true;
          }
          if (!item.metadataSaved) {
            const result = await supabase.from("beast_documents").insert({
              id: item.id, owner_id: ownerId, title: item.title.trim(), category: item.category,
              status: "Uploaded", storage_bucket: documentStorageBucketName, storage_path: item.storagePath,
              file_name: item.file.name, mime_type: item.file.type, size_bytes: item.file.size, source_module: "beastos",
            });
            if (result.error) {
              const existing = await supabase.from("beast_documents").select("id,storage_path").eq("id", item.id).eq("owner_id", ownerId).maybeSingle();
              if (existing.error || existing.data?.storage_path !== item.storagePath) throw result.error;
            }
            item.metadataSaved = true;
          }
          item.status = "saved";
          item.message = "Saved.";
          if (context) {
            const result = await supabase.from("beast_document_module_links").insert({
              owner_id: ownerId, document_id: item.id, source_module: context.module,
              title: context.documentsLabel, summary: `Connected from ${context.applicationName}.`,
            });
            if (result.error) item.message = "Saved in Documents. The module link could not be added; open Documents to connect it.";
          }
          if (item.category === "Health" && healthExtractionConsent) {
            const eligible = item.file.size <= 10 * 1024 * 1024 && ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(item.file.type);
            if (!eligible) {
              item.message += " AI reading supports PDF, PNG, JPEG or WebP up to 10 MB. Use pasted text in Health Documents for this file.";
            } else {
              item.message += " Reading for proposed health updates…"; publish();
              setMessage(`File ${index + 1} of ${batch.length} is saved. Sit tight while we read it for proposed health updates.`);
              try {
                const response = await fetch(`/api/health/documents/${item.id}/extract`, {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ consent: true, source: "file" }),
                });
                if (!response.ok) throw new Error("Analysis unavailable");
                item.message = item.message.replace(" Reading for proposed health updates…", " Health review ready. Review proposed updates in Health Documents.");
              } catch {
                item.message = item.message.replace(" Reading for proposed health updates…", " AI reading could not finish. Retry analysis in Health Documents; your file is saved.");
              }
            }
          }
        } catch (error) {
          // A document already saved must never be retried as a new upload.
          item.status = item.metadataSaved ? "saved" : "error";
          item.message = item.metadataSaved ? "Saved. Follow-up processing could not finish. Open Documents to review it." : memberSafeMessage(error, "upload");
        }
        publish();
      }
      const saved = batch.filter(item => item.status === "saved").length;
      setMessage(`${saved} of ${batch.length} files saved.${saved < batch.length ? " Retry the remaining files; saved files will not be uploaded again. Keep this page open to retry." : " Your document list is updated."}`);
      if (saved) router.refresh();
    } catch (error) { setMessage(memberSafeMessage(error, "upload")); }
    finally { busyRef.current = false; setBusy(false); }
  }

  const allSaved = selected.length > 0 && selected.every(item => item.status === "saved");
  return <div className="mt-6 space-y-4">
    <div onDragOver={event => { event.preventDefault(); if (!busy) setIsDragging(true); }}
      onDragLeave={event => { event.preventDefault(); setIsDragging(false); }} onDrop={handleDrop}
      className={`rounded-2xl border border-dashed p-6 text-center ${isDragging ? "border-white bg-slate-800" : "border-slate-500 bg-[#0f1419]"}`}>
      <input ref={fileInputRef} type="file" multiple disabled={busy} accept={getDocumentUploadAcceptValue()} className="sr-only" aria-label="Choose documents"
        onChange={event => { chooseFiles(Array.from(event.target.files || [])); event.target.value = ""; }} />
      <h2 className="text-xl font-black text-white">Drop documents here</h2>
      <p className="mt-2 text-sm text-slate-300">Up to 5 files per batch · 25 MB combined. Each file gets its own document record.</p>
      <button type="button" className={`${buttonClass} mt-4`} disabled={busy} onClick={() => fileInputRef.current?.click()}>{allSaved ? "Choose More Files" : "Choose Files"}</button>
    </div>
    {selected.length > 0 && <>
      <p className="text-sm text-slate-300">{selected.length} / 5 files · {formatDocumentFileSize(selected.reduce((sum, item) => sum + item.file.size, 0))} / 25 MB</p>
      {selected.map(item => <div key={item.id} className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
        <div className="flex items-start justify-between gap-3"><p className="min-w-0 break-words text-sm font-bold text-white">{item.file.name}<span className="block text-xs text-slate-400">{formatDocumentFileSize(item.file.size)}</span></p>
          {!item.storagePath && <button type="button" disabled={busy} className="text-sm text-slate-300" aria-label={`Remove ${item.file.name}`} onClick={() => setSelected(selected.filter(value => value.id !== item.id))}>Remove</button>}</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-slate-300">Title<input className={fieldClass} value={item.title} disabled={busy || !!item.storagePath} onChange={event => setSelected(selected.map(value => value.id === item.id ? { ...value, title: event.target.value } : value))} /></label>
          <label className="text-sm text-slate-300">Category<select className={fieldClass} value={item.category} disabled={busy || !!item.storagePath} onChange={event => setSelected(selected.map(value => value.id === item.id ? { ...value, category: event.target.value as DocumentCategory } : value))}>{documentCategories.map(category => <option key={category}>{category}</option>)}</select></label>
        </div>
        {item.message && <p className={`mt-3 text-sm ${item.status === "error" ? "text-red-200" : "text-slate-300"}`}>{item.message}</p>}
      </div>)}
      {selected.some(item => item.category === "Health") && <>
        <label className="flex gap-2 text-sm text-slate-300"><input type="checkbox" checked={healthExtractionConsent} disabled={busy || allSaved} onChange={event => setHealthExtractionConsent(event.target.checked)} />Read eligible Health files after upload. PDF, PNG, JPEG and WebP up to 10 MB each can be sent to OpenAI with my permission. I will review proposed updates before they enter my profile. Other files are still saved.</label>
        {selected.some(item => item.category === "Health" && item.status === "saved") && <a className="block text-sm text-sky-300 underline" href="/dashboard/health/documents">Open Health Documents review</a>}
      </>}
      <button type="button" className={buttonClass} disabled={busy || allSaved || selected.some(item => !item.title.trim())} onClick={uploadDocuments}>{busy ? "Uploading / processing…" : allSaved ? "Files Saved" : selected.some(item => item.status === "error") ? "Retry Remaining Files" : "Upload Documents"}</button>
    </>}
    <p role="status" aria-live="polite" className="text-sm text-slate-300">{message}</p>
  </div>;
}
