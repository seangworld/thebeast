import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import * as documents from "../src/lib/platform/documents";
import type { DocumentUploadDropzone as Component } from "../src/app/dashboard/uploads/DocumentUploadDropzone";

const file = (size: number, name = "test.pdf") => ({ name, type: "application/pdf", size });
test("batch accepts exactly five files and 25 decimal MB", () => {
  assert.equal(documents.getDocumentUploadBatchValidationError(Array.from({ length: 5 }, () => file(5_000_000))), null);
  assert.equal(documents.getDocumentUploadBatchValidationError([file(25_000_000)]), null);
});
test("batch rejects count, combined size, invalid size and unsupported types", () => {
  for (const files of [[], Array.from({ length: 6 }, () => file(1)), [file(15_000_000), file(10_000_001)], [file(25_000_001)], [file(0)], [file(NaN)], [file(-1)], [file(1, "bad.exe")]]) {
    assert.ok(documents.getDocumentUploadBatchValidationError(files));
  }
});

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/dashboard/uploads" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true }, HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Node: { value: dom.window.Node, configurable: true }, MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true, writable: true },
});
let uploadCalls: string[] = [];
let inserts: Array<Record<string, unknown>> = [];
let failName = "";
let failMetadata = false;
let refreshes = 0;
let analyses = 0;
const stored = new Map<string, number>();
const client = {
  auth: { getUser: async () => ({ data: { user: { id: "owner" } }, error: null }) },
  storage: { from: () => ({
    upload: async (path: string, file: File) => {
      uploadCalls.push(path);
      if (path.endsWith(failName) && failName) return { error: new Error("Upload failed") };
      stored.set(path, file.size); return { error: null };
    },
    info: async (path: string) => ({ data: stored.has(path) ? { size: stored.get(path) } : null, error: stored.has(path) ? null : new Error("Missing") }),
  }) },
  from: () => ({
    insert: async (row: Record<string, unknown>) => { if (failMetadata) return { error: new Error("Metadata failed") }; inserts.push(row); return { error: null }; },
    select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
  }),
};
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function(id: string, ...args: unknown[]) {
  if (id === "next/navigation") return { useRouter: () => ({ refresh: () => { refreshes++; } }) };
  if (id === "@/lib/platform/documents") return documents;
  if (id === "@/lib/supabase/client") return { createClient: () => client };
  if (id === "@/lib/memberSafeError") return { memberSafeMessage: () => "Could not upload. Retry." };
  return originalLoad.call(this, id, ...args);
};
const { DocumentUploadDropzone } = require("../src/app/dashboard/uploads/DocumentUploadDropzone") as { DocumentUploadDropzone: typeof Component };
Module._load = originalLoad;
const { cleanup, fireEvent, render, waitFor, within } = require("@testing-library/react") as typeof import("@testing-library/react");
const originalFetch = globalThis.fetch;
afterEach(() => {
  cleanup(); uploadCalls = []; inserts = []; failName = ""; failMetadata = false; stored.clear(); refreshes = 0; analyses = 0; globalThis.fetch = originalFetch;
});
function setup(names = ["one.pdf", "two.pdf"]) {
  const view = render(React.createElement(DocumentUploadDropzone));
  const ui = within(view.container);
  const files = names.map(name => new dom.window.File(["test"], name, { type: "application/pdf" }));
  fireEvent.change(ui.getByLabelText("Choose documents"), { target: { files } });
  return { view, ui };
}

test("multiple selection saves each file once despite double click", async () => {
  const { ui } = setup();
  const button = ui.getByRole("button", { name: "Upload Documents" });
  fireEvent.click(button); fireEvent.click(button);
  await waitFor(() => assert.match(ui.getByRole("status").textContent || "", /2 of 2 files saved/));
  assert.equal(uploadCalls.length, 2); assert.equal(inserts.length, 2); assert.equal(refreshes, 1);
});
test("partial retry keeps successful files and retries the failed path", async () => {
  failName = "two.pdf";
  const { ui } = setup();
  fireEvent.click(ui.getByRole("button", { name: "Upload Documents" }));
  await waitFor(() => assert.match(ui.getByRole("status").textContent || "", /1 of 2 files saved/));
  const failedPath = uploadCalls[1]; failName = "";
  fireEvent.click(ui.getByRole("button", { name: "Retry Remaining Files" }));
  await waitFor(() => assert.match(ui.getByRole("status").textContent || "", /2 of 2 files saved/));
  assert.deepEqual(uploadCalls, [uploadCalls[0], failedPath, failedPath]); assert.equal(inserts.length, 2);
});
test("metadata failure retries registration without uploading the file again", async () => {
  failMetadata = true;
  const { ui } = setup(["one.pdf"]);
  fireEvent.click(ui.getByRole("button", { name: "Upload Documents" }));
  await waitFor(() => assert.match(ui.getByRole("status").textContent || "", /0 of 1 files saved/));
  failMetadata = false;
  fireEvent.click(ui.getByRole("button", { name: "Retry Remaining Files" }));
  await waitFor(() => assert.match(ui.getByRole("status").textContent || "", /1 of 1 files saved/));
  assert.equal(uploadCalls.length, 1); assert.equal(inserts.length, 1);
});
test("oversized selection is rejected before any upload and preserves queue", () => {
  const { ui } = setup(["one.pdf"]);
  const oversized = new dom.window.File(["x"], "large.pdf", { type: "application/pdf" });
  Object.defineProperty(oversized, "size", { value: 25_000_000 });
  fireEvent.change(ui.getByLabelText("Choose documents"), { target: { files: [oversized] } });
  assert.match(ui.getByRole("status").textContent || "", /more than 25 MB/);
  assert.equal(ui.getAllByLabelText("Title").length, 1); assert.equal(uploadCalls.length, 0);
});
test("Health analysis failure preserves saved upload and does not offer upload retry", async () => {
  globalThis.fetch = async () => { analyses++; return new Response("", { status: 503 }); };
  const { ui } = setup(["health.pdf"]);
  fireEvent.change(ui.getByLabelText("Category"), { target: { value: "Health" } });
  fireEvent.click(ui.getByRole("checkbox"));
  fireEvent.click(ui.getByRole("button", { name: "Upload Documents" }));
  await waitFor(() => assert.match(ui.getByRole("status").textContent || "", /1 of 1 files saved/));
  assert.ok(ui.getByText(/AI reading could not finish/));
  assert.equal((ui.getByRole("button", { name: "Files Saved" }) as HTMLButtonElement).disabled, true);
  assert.equal(analyses, 1); assert.equal(uploadCalls.length, 1);
});

test("drop accepts every file and rejects a sixth without replacing the existing queue", () => {
  const { ui } = setup(["one.pdf"]);
  const dropzone = ui.getByText("Drop documents here").parentElement!;
  const files = ["two", "three", "four", "five"].map(name => new dom.window.File(["test"], `${name}.pdf`, { type: "application/pdf" }));
  fireEvent.drop(dropzone, { dataTransfer: { files } });
  assert.equal(ui.getAllByLabelText("Title").length, 5);
  fireEvent.drop(dropzone, { dataTransfer: { files: [files[0]] } });
  assert.match(ui.getByRole("status").textContent || "", /up to 5 files/);
  assert.equal(ui.getAllByLabelText("Title").length, 5);
});
test("Health files are saved without calling AI unless consent is given", async () => {
  globalThis.fetch = async () => { analyses++; return new Response("{}"); };
  const { ui } = setup(["health.pdf"]);
  fireEvent.change(ui.getByLabelText("Category"), { target: { value: "Health" } });
  fireEvent.click(ui.getByRole("button", { name: "Upload Documents" }));
  await waitFor(() => assert.match(ui.getByRole("status").textContent || "", /1 of 1 files saved/));
  assert.equal(analyses, 0);
});
