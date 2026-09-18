import test from "node:test";
import assert from "node:assert/strict";
import type { SupabaseClient } from "@supabase/supabase-js";
import { documentManagement, documentEditPatch, lifecycleStatus, canPreviewDocument } from "../src/lib/platform/documentManagement";
import { buildDocument, searchDocuments, type BeastDocument } from "../src/lib/platform/documents";

export const sample = buildDocument({ id: "doc", ownerId: "member", title: "Original", category: "Other", status: "Uploaded", tags: [], metadata: {}, storage: { bucket: "beast-documents", path: "member/other/file.pdf", fileName: "file.pdf", mimeType: "application/pdf", sizeBytes: 4 }, collections: [], moduleLinks: [], accessGrants: [], calendarLinks: [], goalReferences: [], createdAt: "2026-09-18T00:00:00Z", updatedAt: "2026-09-18T00:00:00Z" });
const draft = { title: " Updated ", description: " Notes ", category: "Health" as const, tags: "medical, medical, visit", folderId: "" };
function harness(options: { signedOut?: boolean; wrongOwner?: boolean; stale?: boolean; racing?: boolean; failed?: boolean } = {}) {
  const row = { id: sample.id, owner_id: options.wrongOwner ? "other" : "member", status: sample.status as string, metadata: {} as Record<string, unknown>, updated_at: options.stale ? "later" : sample.updatedAt, storage_bucket: sample.storage.bucket, storage_path: sample.storage.path, file_name: sample.storage.fileName, mime_type: sample.storage.mimeType };
  const calls: Array<{ table: string; operation: string; values?: Record<string, unknown>; filters: Record<string, unknown> }> = [];
  const signed: unknown[] = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: options.signedOut ? null : { id: "member" } }, error: null }) },
    storage: { from: (bucket: string) => ({ createSignedUrl: async (path: string, expires: number, download: unknown) => { signed.push({ bucket, path, expires, download }); return { data: { signedUrl: "https://storage.example/signed" }, error: null }; } }) },
    from: (table: string) => {
      const call = { table, operation: "select", values: undefined as Record<string, unknown> | undefined, filters: {} as Record<string, unknown> };
      calls.push(call);
      const result = () => {
        if (call.operation === "select") return { data: table === "beast_documents" ? (row.owner_id === call.filters.owner_id ? row : null) : { id: "group" }, error: null };
        if (options.failed) return { data: null, error: { code: "failed" } };
        if (options.racing) return { data: [], error: null };
        return { data: [{ id: "doc" }], error: null };
      };
      const chain = {
        select: (_columns: string) => chain,
        eq: (key: string, value: unknown) => { call.filters[key] = value; return chain; },
        single: async () => result(),
        update: (values: Record<string, unknown>) => { call.operation = "update"; call.values = values; return chain; },
        insert: (values: Record<string, unknown>) => { call.operation = "insert"; call.values = values; return chain; },
        upsert: (values: Record<string, unknown>) => { call.operation = "upsert"; call.values = values; return chain; },
        then: (resolve: (value: unknown) => unknown, reject: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve, reject),
      };
      return chain;
    },
  };
  return { api: documentManagement(client as unknown as SupabaseClient), row, calls, signed };
}

test("edit normalizes names and tags; rejects empty title, excess tags and invalid category", () => {
  assert.deepEqual(documentEditPatch(draft), { title: "Updated", description: "Notes", category: "Health", tags: ["medical", "visit"], folder_id: null });
  assert.throws(() => documentEditPatch({ ...draft, title: " " }));
  assert.throws(() => documentEditPatch({ ...draft, tags: Array.from({ length: 21 }, (_, i) => String(i)).join(",") }));
});
test("edit uses authenticated owner, timestamp guard, and never rewrites storage or metadata", async () => {
  const h = harness(); await h.api.edit(sample, draft);
  const write = h.calls.find(call => call.operation === "update")!;
  assert.deepEqual(write.filters, { owner_id: "member", id: "doc", updated_at: sample.updatedAt });
  assert.equal(write.values?.title, "Updated"); assert.equal(write.values?.storage_path, undefined); assert.equal(write.values?.metadata, undefined);
});
test("signed-out, cross-owner and stale documents cannot be edited", async () => {
  for (const options of [{ signedOut: true }, { wrongOwner: true }, { stale: true }]) {
    const h = harness(options); await assert.rejects(h.api.edit(sample, draft));
    assert.equal(h.calls.filter(call => call.operation === "update").length, 0);
  }
});
test("concurrent edit and database failure are reported rather than claiming success", async () => {
  await assert.rejects(harness({ racing: true }).api.edit(sample, draft), /another window/);
  await assert.rejects(harness({ failed: true }).api.edit(sample, draft), /Could not save/);
});
test("folder moves validate owner-scoped folder before saving", async () => {
  const h = harness(); await h.api.edit(sample, { ...draft, folderId: "folder" });
  assert.deepEqual(h.calls.find(call => call.table === "beast_document_folders")?.filters, { owner_id: "member", id: "folder" });
});
test("archive, trash and restore are metadata-only; legal hold blocks trash", async () => {
  assert.equal(lifecycleStatus("Uploaded", "archive", {}), "Archived");
  assert.equal(lifecycleStatus("Ready", "trash", {}), "Deleted");
  assert.equal(lifecycleStatus("Deleted", "restore", {}), "Ready");
  assert.throws(() => lifecycleStatus("Ready", "trash", { legal_hold: true }));
  assert.throws(() => lifecycleStatus("Ready", "trash", { retention_state: "Legal Hold" }));
  assert.throws(() => lifecycleStatus("Deleted", "archive", {}));
  const h = harness(); await h.api.lifecycle(sample, "trash");
  assert.equal(h.calls.find(call => call.operation === "update")?.values?.status, "Deleted");
  assert.equal(h.signed.length, 0);
});
test("file links use current owned path, private bucket, five minute expiry and attachment name", async () => {
  const h = harness(); await h.api.fileLink(sample, true);
  assert.deepEqual(h.signed, [{ bucket: "beast-documents", path: "member/other/file.pdf", expires: 300, download: { download: "file.pdf" } }]);
  h.row.storage_path = "other/file.pdf"; await assert.rejects(h.api.fileLink(sample, false));
  h.row.storage_path = sample.storage.path; h.row.status = "Deleted"; await assert.rejects(h.api.fileLink(sample, false));
  assert.equal(h.signed.length, 1);
});
test("unsupported document types download without third-party preview services", () => {
  assert.equal(canPreviewDocument("application/pdf"), true);
  assert.equal(canPreviewDocument("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"), false);
  assert.equal(canPreviewDocument("text/html"), false);
});
test("collection membership toggles retain owner scope and existing records", async () => {
  const h = harness(); await h.api.collection(sample, "collection", false);
  assert.deepEqual(h.calls.find(call => call.table === "beast_document_collections")?.filters, { owner_id: "member", id: "collection", status: "Active" });
  const write = h.calls.find(call => call.operation === "upsert")!;
  assert.equal(write.values?.owner_id, "member"); assert.equal(write.values?.document_id, "doc"); assert.equal(write.values?.status, "Archived");
});
test("folder and collection create/rename are scoped to signed-in owner", async () => {
  const h = harness(); await h.api.saveGroup("folder", " Visits "); await h.api.saveGroup("collection", "Records", "collection");
  assert.equal(h.calls[0].values?.owner_id, "member"); assert.equal(h.calls[0].values?.name, "Visits");
  assert.deepEqual(h.calls[1].filters, { owner_id: "member", id: "collection" });
});
test("search includes folder, tags, title and file name", () => {
  const doc = { ...sample, tags: ["medical"], folder: { name: "Visits" } } as BeastDocument;
  for (const query of ["original", "FILE.PDF", "medical", "visits"]) assert.equal(searchDocuments([doc], { query }).length, 1);
  assert.equal(searchDocuments([doc], { query: "absent" }).length, 0);
});
