import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import * as documents from "../src/lib/platform/documents";
import * as management from "../src/lib/platform/documentManagement";
import type { DocumentLibrary as Component } from "../src/app/dashboard/uploads/DocumentLibrary";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/dashboard/uploads" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true }, HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Node: { value: dom.window.Node, configurable: true }, MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true, writable: true },
});
let calls: string[] = []; let fail = false;
const actions = {
  edit: async () => { calls.push("edit"); if (fail) throw new Error("Save failed. Try again."); },
  lifecycle: async (_doc: unknown, action: string) => { calls.push(action); },
  collection: async () => { calls.push("collection"); },
  saveGroup: async () => { calls.push("group"); },
  fileLink: async () => "https://storage.example/signed",
};
const Module = require("node:module"); const originalLoad = Module._load;
Module._load = function(id: string, ...args: unknown[]) {
  if (id === "next/navigation") return { useRouter: () => ({ refresh: () => undefined }) };
  if (id === "@/lib/platform/documents") return documents;
  if (id === "@/lib/platform/documentManagement") return { ...management, documentManagement: () => actions };
  if (id === "@/lib/supabase/client") return { createClient: () => ({}) };
  return originalLoad.call(this, id, ...args);
};
const { DocumentLibrary } = require("../src/app/dashboard/uploads/DocumentLibrary") as { DocumentLibrary: typeof Component };
Module._load = originalLoad;
const { cleanup, fireEvent, render, waitFor, within } = require("@testing-library/react") as typeof import("@testing-library/react");
afterEach(() => { cleanup(); calls = []; fail = false; });
const sample = documents.buildDocument({ id: "doc", ownerId: "owner", title: "My record", category: "Health", status: "Uploaded", tags: ["visit"], metadata: {}, storage: { bucket: "beast-documents", path: "owner/file.pdf", fileName: "file.pdf", mimeType: "application/pdf", sizeBytes: 4 }, collections: [], moduleLinks: [], accessGrants: [], calendarLinks: [], goalReferences: [], createdAt: "date", updatedAt: "date" });
function setup() {
  const view = render(React.createElement(DocumentLibrary, { documents: [sample, { ...sample, id: "trash", title: "Trashed file", status: "Deleted" }], folders: [], collections: [] }));
  return within(view.container);
}
test("search and Trash filters show matching documents and restore control", () => {
  const ui = setup();
  assert.equal(ui.queryByRole("article", { name: "Trashed file" }), null);
  fireEvent.change(ui.getByLabelText("Search documents"), { target: { value: "absent" } });
  assert.ok(ui.getByText("No documents match these filters."));
  fireEvent.click(ui.getByRole("button", { name: "Clear filters" }));
  assert.ok(ui.getByRole("article", { name: "My record" }));
  fireEvent.change(ui.getByLabelText("Show"), { target: { value: "Deleted" } });
  assert.ok(ui.getByRole("button", { name: "Restore" }));
  assert.equal(ui.queryByRole("button", { name: "Download" }), null);
});
test("Trash requires explicit confirmation and cancel makes no write", async () => {
  const ui = setup();
  fireEvent.click(ui.getByRole("button", { name: "Move to Trash" }));
  assert.deepEqual(calls, []);
  fireEvent.click(ui.getByRole("button", { name: "Cancel" }));
  assert.deepEqual(calls, []);
  fireEvent.click(ui.getByRole("button", { name: "Move to Trash" }));
  fireEvent.click(ui.getByRole("button", { name: "Confirm move to Trash" }));
  await waitFor(() => assert.deepEqual(calls, ["trash"]));
});
test("failed rename preserves input and offers retry", async () => {
  const ui = setup(); fail = true;
  fireEvent.click(ui.getByRole("button", { name: "Rename / organize" }));
  fireEvent.change(ui.getByLabelText("Document title"), { target: { value: "Updated title" } });
  fireEvent.click(ui.getByRole("button", { name: "Save document" }));
  await waitFor(() => assert.match(ui.getByRole("status").textContent || "", /Save failed/));
  assert.equal((ui.getByLabelText("Document title") as HTMLInputElement).value, "Updated title");
  fail = false; fireEvent.click(ui.getByRole("button", { name: "Save document" }));
  await waitFor(() => assert.match(ui.getByRole("status").textContent || "", /Document updated/));
  assert.equal(ui.queryByLabelText("Document title"), null);
});
test("preview provides sandboxed private view and download provides attachment link", async () => {
  const ui = setup();
  fireEvent.click(ui.getByRole("button", { name: "Preview" }));
  await waitFor(() => assert.ok(ui.getByTitle("Preview of My record")));
  assert.equal(ui.getByTitle("Preview of My record").getAttribute("sandbox"), "allow-same-origin");
  fireEvent.click(ui.getByRole("button", { name: "Download" }));
  await waitFor(() => assert.ok(ui.getByRole("link", { name: "Download file" })));
  assert.equal(ui.queryByTitle("Preview of My record"), null);
});
