import type { SupabaseClient } from "@supabase/supabase-js";
import { documentCategories, documentStorageBucketName, type BeastDocument, type DocumentCategory } from "./documents";

export type DocumentEdit = { title: string; description: string; category: DocumentCategory; tags: string; folderId: string };
export function documentEditPatch(input: DocumentEdit) {
  const title = input.title.trim();
  if (!title || title.length > 200) throw new Error("Enter a title between 1 and 200 characters.");
  if (!documentCategories.includes(input.category)) throw new Error("Choose a valid category.");
  if (input.description.length > 4000) throw new Error("Keep the description under 4,000 characters.");
  const tags = Array.from(new Set(input.tags.split(",").map(tag => tag.trim()).filter(Boolean)));
  if (tags.length > 20 || tags.some(tag => tag.length > 50)) throw new Error("Use up to 20 tags of 50 characters each.");
  return { title, description: input.description.trim() || null, category: input.category, tags, folder_id: input.folderId || null };
}
export function canPreviewDocument(mime: string) {
  return ["application/pdf", "image/png", "image/jpeg", "image/webp", "text/plain", "text/csv"].includes(mime);
}
export function lifecycleStatus(current: string, action: "archive" | "trash" | "restore", metadata: Record<string, unknown>) {
  if (action === "trash" && (metadata.legal_hold === true || metadata.retention_state === "Legal Hold")) throw new Error("This document is on legal hold and cannot be moved to Trash.");
  if (action === "archive" && ["Uploaded", "Ready"].includes(current)) return "Archived";
  if (action === "trash" && ["Uploaded", "Ready", "Archived"].includes(current)) return "Deleted";
  if (action === "restore" && ["Archived", "Deleted"].includes(current)) return "Ready";
  throw new Error("This action is no longer available. Refresh your documents.");
}

export function documentManagement(client: SupabaseClient) {
  async function owner() {
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new Error("Sign in to manage your documents.");
    return data.user.id;
  }
  async function owned(document: BeastDocument) {
    const ownerId = await owner();
    const { data, error } = await client.from("beast_documents").select("id,owner_id,status,metadata,updated_at,storage_bucket,storage_path,file_name,mime_type").eq("owner_id", ownerId).eq("id", document.id).single();
    if (error || !data) throw new Error("This document is unavailable for your account.");
    if (data.updated_at !== document.updatedAt) throw new Error("This document changed in another window. Refresh before saving.");
    return { row: data, ownerId };
  }
  async function write(document: BeastDocument, patch: Record<string, unknown>, ownerId: string) {
    const { data, error } = await client.from("beast_documents").update({ ...patch, updated_at: new Date().toISOString() }).eq("owner_id", ownerId).eq("id", document.id).eq("updated_at", document.updatedAt).select("id");
    if (error) throw new Error("Could not save the document. Your changes are still here; try again.");
    if (data?.length !== 1) throw new Error("This document changed in another window. Refresh before saving.");
  }
  return {
    async edit(document: BeastDocument, input: DocumentEdit) {
      const patch = documentEditPatch(input);
      const { row, ownerId } = await owned(document);
      if (!["Uploaded", "Ready"].includes(row.status)) throw new Error("Restore this document before editing it.");
      if (patch.folder_id) {
        const { data, error } = await client.from("beast_document_folders").select("id").eq("owner_id", ownerId).eq("id", patch.folder_id).single();
        if (error || !data) throw new Error("Choose a folder belonging to your account.");
      }
      await write(document, patch, ownerId);
    },
    async lifecycle(document: BeastDocument, action: "archive" | "trash" | "restore") {
      const { row, ownerId } = await owned(document);
      await write(document, { status: lifecycleStatus(row.status, action, row.metadata || {}) }, ownerId);
    },
    async fileLink(document: BeastDocument, download: boolean) {
      const { row, ownerId } = await owned(document);
      if (row.status === "Deleted") throw new Error("Restore this document before opening it.");
      if (row.storage_bucket !== documentStorageBucketName || !row.storage_path.startsWith(`${ownerId}/`)) throw new Error("This file is not available in your private storage.");
      if (!download && !canPreviewDocument(row.mime_type)) throw new Error("Download this file to view it in its own application.");
      const { data, error } = await client.storage.from(row.storage_bucket).createSignedUrl(row.storage_path, 300, download ? { download: row.file_name } : {});
      if (error || !data?.signedUrl) throw new Error("Could not open the file. Please try again.");
      return data.signedUrl;
    },
    async saveGroup(kind: "folder" | "collection", name: string, id?: string) {
      name = name.trim();
      if (!name || name.length > 100) throw new Error("Use a name between 1 and 100 characters.");
      const ownerId = await owner();
      const table = kind === "folder" ? "beast_document_folders" : "beast_document_collections";
      const query = id
        ? client.from(table).update({ name, updated_at: new Date().toISOString() }).eq("owner_id", ownerId).eq("id", id)
        : client.from(table).insert({ name, owner_id: ownerId });
      const { data, error } = await query.select("id");
      if (error?.code === "23505") throw new Error("You already have a folder or collection with that name.");
      if (error || data?.length !== 1) throw new Error("Could not save this folder or collection. Try again.");
    },
    async collection(document: BeastDocument, collectionId: string, included: boolean) {
      const { row, ownerId } = await owned(document);
      if (!["Uploaded", "Ready"].includes(row.status)) throw new Error("Restore this document before organizing it.");
      const { data, error } = await client.from("beast_document_collections").select("id").eq("owner_id", ownerId).eq("id", collectionId).eq("status", "Active").single();
      if (error || !data) throw new Error("Choose an active collection belonging to your account.");
      const result = await client.from("beast_document_collection_items").upsert({ owner_id: ownerId, document_id: document.id, collection_id: collectionId, status: included ? "Active" : "Archived", updated_at: new Date().toISOString() }, { onConflict: "owner_id,collection_id,document_id" });
      if (result.error) throw new Error("Could not update the collection. Try again.");
    },
  };
}
