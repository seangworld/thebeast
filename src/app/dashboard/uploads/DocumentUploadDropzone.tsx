"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  documentCategories,
  documentStorageBucketName,
  buildDocumentStoragePath,
  formatDocumentFileSize,
  getDocumentUploadAcceptValue,
  getDocumentUploadValidationError,
  type DocumentCategory,
} from "@/lib/platform/documents";
import { createClient } from "@/lib/supabase/client";

type UploadState = "idle" | "ready" | "uploading" | "success" | "error";

type SelectedDocument = {
  file: File;
  title: string;
};

function getInitialTitle(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

export function DocumentUploadDropzone() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selected, setSelected] = useState<SelectedDocument | null>(null);
  const [category, setCategory] = useState<DocumentCategory>("Other");
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<UploadState>("idle");
  const [message, setMessage] = useState(
    "Choose a file or drag one here to add it to your BeastOS documents."
  );

  function chooseFile(file: File | null | undefined) {
    if (!file) return;

    const validationError = getDocumentUploadValidationError(file);
    if (validationError) {
      setSelected(null);
      setState("error");
      setMessage(validationError);
      return;
    }

    setSelected({
      file,
      title: getInitialTitle(file.name) || file.name,
    });
    setState("ready");
    setMessage("Ready to upload when you are.");
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (state !== "uploading") setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (state === "uploading") return;
    chooseFile(event.dataTransfer.files.item(0));
  }

  async function uploadDocument() {
    if (!selected || state === "uploading") return;

    const validationError = getDocumentUploadValidationError(selected.file);
    if (validationError) {
      setState("error");
      setMessage(validationError);
      return;
    }

    try {
      setState("uploading");
      setMessage("Uploading your document...");

      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const ownerId = userData.user?.id;

      if (userError || !ownerId) {
        throw new Error("Sign in to upload documents.");
      }

      const documentId = crypto.randomUUID();
      const storagePath = buildDocumentStoragePath({
        ownerId,
        category,
        fileName: selected.file.name,
        documentId,
      });

      const { error: uploadError } = await supabase.storage
        .from(documentStorageBucketName)
        .upload(storagePath, selected.file, {
          cacheControl: "3600",
          upsert: false,
          contentType: selected.file.type,
        });

      if (uploadError) {
        throw new Error(uploadError.message || "Document storage failed.");
      }

      const { error: metadataError } = await supabase
        .from("beast_documents")
        .insert({
          id: documentId,
          owner_id: ownerId,
          title: selected.title.trim() || getInitialTitle(selected.file.name),
          category,
          status: "Uploaded",
          storage_bucket: documentStorageBucketName,
          storage_path: storagePath,
          file_name: selected.file.name,
          mime_type: selected.file.type,
          size_bytes: selected.file.size,
          source_module: "beastos",
        });

      if (metadataError) {
        await supabase.storage.from(documentStorageBucketName).remove([storagePath]);
        throw new Error(
          metadataError.message || "Document metadata could not be saved."
        );
      }

      setState("success");
      setMessage("Uploaded. Refreshing your document list...");
      window.location.reload();
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Document upload could not be completed."
      );
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-2xl border border-dashed p-6 text-center transition ${
          isDragging
            ? "border-slate-100 bg-slate-300/15"
            : "border-[#94a3b8]/50 bg-[#0f1419]"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={getDocumentUploadAcceptValue()}
          className="sr-only"
          onChange={(event) => chooseFile(event.target.files?.item(0))}
        />
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#94a3b8]/40 bg-slate-300/10 text-lg font-black text-slate-100">
          DOC
        </div>
        <h2 className="mt-4 text-xl font-black text-white">
          Drop a document here
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#c7cfdb]">
          Upload one file to the shared BeastOS Documents record. Modules can
          reference it later without owning a separate copy.
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={state === "uploading"}
          className="mt-5 rounded-xl border border-[#94a3b8]/50 bg-slate-300/10 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-300/15 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Choose File
        </button>
      </div>

      {selected ? (
        <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-white">
                {selected.file.name}
              </div>
              <div className="mt-1 text-xs font-semibold text-[#9aa7b8]">
                {formatDocumentFileSize(selected.file.size)} ·{" "}
                {selected.file.type}
              </div>
            </div>
            <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold text-[#c7cfdb]">
              {category}
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.7fr]">
            <label className="block">
              <span className="text-xs font-bold uppercase text-[#7f8da3]">
                Title
              </span>
              <input
                value={selected.title}
                onChange={(event) =>
                  setSelected({ ...selected, title: event.target.value })
                }
                className="mt-2 w-full rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-slate-300/70"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase text-[#7f8da3]">
                Category
              </span>
              <select
                value={category}
                onChange={(event) =>
                  setCategory(event.target.value as DocumentCategory)
                }
                className="mt-2 w-full rounded-xl border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-sm font-semibold text-white outline-none focus:border-slate-300/70"
              >
                {documentCategories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={uploadDocument}
            disabled={state === "uploading" || !selected.title.trim()}
            className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-black text-[#0b0f14] transition hover:bg-[#dbe3ef] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === "uploading" ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      ) : null}

      <p
        className={`text-sm font-semibold ${
          state === "error"
            ? "text-red-200"
            : state === "success"
              ? "text-green-200"
              : "text-[#9aa7b8]"
        }`}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}
