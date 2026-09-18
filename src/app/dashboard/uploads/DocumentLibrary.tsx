"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  documentCategories, formatDocumentFileSize, getDocumentDeletionImpact, searchDocuments,
  type BeastDocument, type DocumentCategory, type DocumentCollection, type DocumentFolder,
} from "@/lib/platform/documents";
import { canPreviewDocument, documentManagement, type DocumentEdit } from "@/lib/platform/documentManagement";

const field = "mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-sm text-white";
const button = "rounded-lg border border-slate-500 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50";

export function DocumentLibrary({ documents, folders, collections }: {
  documents: BeastDocument[]; folders: DocumentFolder[]; collections: DocumentCollection[];
}) {
  const router = useRouter();
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const locked = busy || pending;
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DocumentCategory | "All">("All");
  const [view, setView] = useState("Active");
  const [folder, setFolder] = useState("");
  const [collection, setCollection] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<DocumentEdit>({ title: "", description: "", tags: "", category: "Other", folderId: "" });
  const [trash, setTrash] = useState<string | null>(null);
  const [link, setLink] = useState<{ id: string; url: string; download: boolean } | null>(null);
  const [groupKind, setGroupKind] = useState<"folder" | "collection">("folder");
  const [groupId, setGroupId] = useState("");
  const [groupName, setGroupName] = useState("");
  const activeCollections = collections.filter(item => item.status === "Active");
  const visible = searchDocuments(documents, { query, category, status: "All" }).filter(doc =>
    (view === "All" || (view === "Active" ? ["Uploaded", "Ready"].includes(doc.status) : doc.status === view)) &&
    (!folder || (folder === "none" ? !doc.folderId : doc.folderId === folder)) &&
    (!collection || doc.collections.some(item => item.id === collection))
  );

  async function run(work: (actions: ReturnType<typeof documentManagement>) => Promise<void>, success: string, refresh = true) {
    if (running.current || pending) return;
    running.current = true; setBusy(true); setMessage("Working…");
    try {
      await work(documentManagement(createClient()));
      setMessage(success);
      if (refresh) startTransition(() => router.refresh());
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not complete this action. Try again."); }
    finally { running.current = false; setBusy(false); }
  }

  function edit(doc: BeastDocument) {
    setEditing(doc.id); setTrash(null);
    setDraft({ title: doc.title, description: doc.description || "", category: doc.category, tags: doc.tags.join(", "), folderId: doc.folderId || "" });
  }

  return <section aria-label="Document library" className="space-y-5 rounded-2xl border border-slate-700 bg-slate-900 p-5">
    <div><h2 className="text-xl font-bold text-white">Your documents</h2><p className="mt-1 text-sm text-slate-300">Find, open, and organize your files. Trash is recoverable and does not permanently erase files.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm text-slate-300">Search documents<input type="search" className={field} value={query} placeholder="Title, file name, tags, or description" onChange={event => setQuery(event.target.value)} /></label>
      <label className="text-sm text-slate-300">Category filter<select className={field} value={category} onChange={event => setCategory(event.target.value as DocumentCategory | "All")}><option>All</option>{documentCategories.map(item => <option key={item}>{item}</option>)}</select></label>
      <label className="text-sm text-slate-300">Show<select className={field} value={view} onChange={event => { setView(event.target.value); setEditing(null); setTrash(null); setLink(null); }}><option>Active</option><option value="Archived">Archived</option><option value="Deleted">Trash</option><option>All</option></select></label>
      <label className="text-sm text-slate-300">Folder filter<select className={field} value={folder} onChange={event => setFolder(event.target.value)}><option value="">All folders</option><option value="none">Unfiled</option>{folders.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-sm text-slate-300">Collection filter<select className={field} value={collection} onChange={event => setCollection(event.target.value)}><option value="">All collections</option>{activeCollections.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <button type="button" className={`${button} self-end`} onClick={() => { setQuery(""); setCategory("All"); setView("Active"); setFolder(""); setCollection(""); }}>Clear filters</button>
    </div>
    <p role="status" aria-live="polite" className="text-sm text-sky-200">{message || `${visible.length} document${visible.length === 1 ? "" : "s"} shown.`}</p>
    <div className="space-y-3">
      {visible.length === 0 && <p className="text-sm text-slate-300">No documents match these filters.</p>}
      {visible.map(doc => {
        const active = ["Uploaded", "Ready"].includes(doc.status);
        const held = doc.metadata.legal_hold === true || doc.metadata.retention_state === "Legal Hold";
        return <article key={doc.id} aria-label={doc.title} className="min-w-0 rounded-xl border border-slate-700 bg-slate-950 p-4">
          <h3 className="break-words font-bold text-white">{doc.title}</h3>
          <p className="mt-1 break-words text-xs text-slate-400">{doc.storage.fileName} · {formatDocumentFileSize(doc.storage.sizeBytes)} · {doc.category} · {doc.status === "Deleted" ? "Trash" : doc.status}{doc.folder ? ` · ${doc.folder.name}` : ""}</p>
          {doc.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-300">{doc.description}</p>}
          {doc.tags.length > 0 && <p className="mt-2 break-words text-sm text-sky-300">{doc.tags.map(tag => `#${tag}`).join(" ")}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {doc.status !== "Deleted" && <>
              {canPreviewDocument(doc.storage.mimeType) && <button type="button" className={button} disabled={locked} onClick={() => run(async actions => setLink({ id: doc.id, url: await actions.fileLink(doc, false), download: false }), "Preview ready. The private link expires in 5 minutes.", false)}>Preview</button>}
              <button type="button" className={button} disabled={locked} onClick={() => run(async actions => setLink({ id: doc.id, url: await actions.fileLink(doc, true), download: true }), "Your download link is ready below. It expires in 5 minutes.", false)}>Download</button>
            </>}
            {active && <>
              <button type="button" className={button} disabled={locked} onClick={() => edit(doc)}>Rename / organize</button>
              <button type="button" className={button} disabled={locked} onClick={() => run(async actions => { await actions.lifecycle(doc, "archive"); setLink(null); setEditing(null); }, "Archived. Find this file in the Archived view.")}>Archive</button>
            </>}
            {!active && <button type="button" className={button} disabled={locked} onClick={() => run(actions => actions.lifecycle(doc, "restore"), "Restored to your active documents.")}>Restore</button>}
            {doc.status !== "Deleted" && <button type="button" className={button} disabled={locked || held} title={held ? "This document is on legal hold." : undefined} onClick={() => { setTrash(doc.id); setEditing(null); }}>Move to Trash</button>}
          </div>
          {!canPreviewDocument(doc.storage.mimeType) && doc.status !== "Deleted" && <p className="mt-2 text-xs text-slate-400">Download this format to view it in its own application.</p>}
          {link?.id === doc.id && doc.status !== "Deleted" && <div className="mt-3 space-y-3">
            <a className="inline-block text-sky-300 underline" href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">{link.download ? "Download file" : "Open preview in a new tab"}</a>
            <button type="button" className={`${button} ml-3`} onClick={() => setLink(null)}>Close {link.download ? "download" : "preview"}</button>
            {!link.download && <iframe title={`Preview of ${doc.title}`} src={link.url} sandbox="allow-same-origin" referrerPolicy="no-referrer" className="h-96 w-full rounded border border-slate-600 bg-white" />}
          </div>}
          {trash === doc.id && <div role="group" aria-label="Confirm move to Trash" className="mt-4 space-y-3 rounded-lg border border-amber-600 p-3 text-sm text-amber-100">
            <p>Move “{doc.title}” to Trash? You can restore it later. The stored file and its links will be retained.</p>
            {getDocumentDeletionImpact(doc).map(warning => <p key={warning}>{warning}</p>)}
            <button type="button" className={button} disabled={locked} onClick={() => run(async actions => { await actions.lifecycle(doc, "trash"); setTrash(null); setLink(null); }, "Moved to Trash. Use the Trash view to restore it.")}>Confirm move to Trash</button>{" "}
            <button type="button" className={button} disabled={locked} onClick={() => setTrash(null)}>Cancel</button>
          </div>}
          {editing === doc.id && <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); run(async actions => { await actions.edit(doc, draft); setEditing(null); }, "Document updated."); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm text-slate-300">Document title<input required maxLength={200} disabled={locked} className={field} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label>
              <label className="text-sm text-slate-300">Document category<select disabled={locked} className={field} value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value as DocumentCategory })}>{documentCategories.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="text-sm text-slate-300">Move to folder<select disabled={locked} className={field} value={draft.folderId} onChange={event => setDraft({ ...draft, folderId: event.target.value })}><option value="">Unfiled</option>{folders.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <label className="text-sm text-slate-300">Tags, separated by commas<input disabled={locked} className={field} value={draft.tags} onChange={event => setDraft({ ...draft, tags: event.target.value })} /></label>
            </div>
            <label className="block text-sm text-slate-300">Description<textarea maxLength={4000} disabled={locked} className={field} value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label>
            <button className={button} disabled={locked} type="submit">Save document</button>{" "}<button type="button" className={button} disabled={locked} onClick={() => setEditing(null)}>Cancel editing</button>
          </form>}
          {active && activeCollections.length > 0 && <details className="mt-4 text-sm text-slate-300"><summary className="cursor-pointer">Collections ({doc.collections.length})</summary><div className="mt-2 flex flex-wrap gap-3">{activeCollections.map(item => <label key={item.id} className="flex gap-2"><input type="checkbox" disabled={locked} checked={doc.collections.some(value => value.id === item.id)} onChange={event => run(actions => actions.collection(doc, item.id, event.target.checked), "Collection updated.")} />{item.name}</label>)}</div></details>}
        </article>;
      })}
    </div>
    <details className="rounded-xl border border-slate-600 p-4 text-slate-300"><summary className="cursor-pointer font-semibold">Manage folders and collections</summary>
      <form className="mt-3 space-y-3" onSubmit={event => { event.preventDefault(); run(async actions => { await actions.saveGroup(groupKind, groupName, groupId || undefined); setGroupName(""); setGroupId(""); }, "Saved. Your folders and collections are updated."); }}>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">Organize with<select className={field} disabled={locked} value={groupKind} onChange={event => { setGroupKind(event.target.value as "folder" | "collection"); setGroupId(""); setGroupName(""); }}><option value="folder">Folder</option><option value="collection">Collection</option></select></label>
          <label className="text-sm">Create or rename<select className={field} disabled={locked} value={groupId} onChange={event => { setGroupId(event.target.value); setGroupName((groupKind === "folder" ? folders : activeCollections).find(item => item.id === event.target.value)?.name || ""); }}><option value="">Create new</option>{(groupKind === "folder" ? folders : activeCollections).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="text-sm">Name<input required maxLength={100} className={field} disabled={locked} value={groupName} onChange={event => setGroupName(event.target.value)} /></label>
        </div><button type="submit" className={button} disabled={locked}>Save {groupKind}</button>
      </form>
    </details>
  </section>;
}
