import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import type { AgencyMetricsContent as ContentType } from "../src/app/dashboard/admin/agency/metrics/AgencyMetricsContent";
import { buildAgencySnapshot } from "../src/lib/agencyPreparation";
const dom = new JSDOM("<html><body></body></html>", { url: "https://thebeast.seangworld.com/dashboard/admin/agency/metrics" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true }, HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Node: { value: dom.window.Node, configurable: true }, MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, writable: true, configurable: true },
});
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function(id: string, ...args: unknown[]) {
  if (id === "next/link") return { __esModule: true, default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", props, children) };
  return originalLoad.call(this, id, ...args);
};
const { AgencyMetricsContent } = require("../src/app/dashboard/admin/agency/metrics/AgencyMetricsContent") as { AgencyMetricsContent: typeof ContentType };
Module._load = originalLoad;
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; });
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function snapshot(name = "Private character", bound = false) {
  return buildAgencySnapshot({ ownerId: "owner", now: "2026-10-12T04:00:00Z",
    profiles: [{ id: "one", owner_id: "owner", name, presenter_type: "future_character", active: false, allowed_topics: ["Lifestyle"], provenance: {} }],
    connections: [{ id: "account", owner_id: "owner", channel: "instagram", account_id: "42", label: "@private", connected_at: "2026-01-01T00:00:00Z", expires_at: null, disconnected_at: null }],
    bindings: bound ? [{ owner_id: "owner", presenter_profile_id: "one", connection_id: "account", channel: "instagram" }] : [],
  });
}
test("agency repeated binding clicks issue one POST and refresh into verified mapping", async () => {
  const pending = deferred<Response>(); let posts = 0; let reads = 0;
  globalThis.fetch = (async (_input, init) => {
    if (init?.method === "POST") { posts++; return pending.promise; }
    return Response.json(snapshot("Private character", ++reads > 1));
  }) as typeof fetch;
  const ui = render(React.createElement(AgencyMetricsContent));
  fireEvent.change(await ui.findByRole("combobox"), { target: { value: "account" } });
  const save = ui.getByRole("button", { name: "Save account binding" });
  fireEvent.click(save); fireEvent.click(save);
  assert.equal(posts, 1);
  assert.equal((save as HTMLButtonElement).disabled, true);
  await act(async () => { pending.resolve(Response.json({ saved: true })); });
  assert.ok(ui.getByText("Connected · reporting not verified"));
  assert.equal(ui.queryByRole("combobox"), null);
  assert.equal(reads, 2);
  assert.equal(ui.getByLabelText("Followers unavailable").textContent, "—");
});
test("agency ignores an older refresh that resolves after a newer refresh", async () => {
  const older = deferred<Response>(); const newer = deferred<Response>(); let reads = 0;
  globalThis.fetch = (async () => ++reads === 1 ? Response.json(snapshot()) : reads === 2 ? older.promise : newer.promise) as typeof fetch;
  const ui = render(React.createElement(AgencyMetricsContent));
  await ui.findByText("Private character");
  const refresh = ui.getByRole("button", { name: "Refresh setup" });
  fireEvent.click(refresh); fireEvent.click(refresh);
  await act(async () => { newer.resolve(Response.json(snapshot("Latest character"))); });
  await act(async () => { older.resolve(Response.json(snapshot("Stale character"))); });
  assert.ok(ui.getByText("Latest character"));
  assert.equal(ui.queryByText("Stale character"), null);
});
test("agency unmount during account save does not launch a post-save read or replay the write", async () => {
  const pending = deferred<Response>(); let posts = 0; let reads = 0;
  globalThis.fetch = (async (_input, init) => {
    if (init?.method === "POST") { posts++; return pending.promise; }
    reads++; return Response.json(snapshot());
  }) as typeof fetch;
  const ui = render(React.createElement(AgencyMetricsContent));
  fireEvent.change(await ui.findByRole("combobox"), { target: { value: "account" } });
  fireEvent.click(ui.getByRole("button", { name: "Save account binding" }));
  ui.unmount();
  await act(async () => { pending.resolve(Response.json({ saved: true })); });
  assert.equal(posts, 1); assert.equal(reads, 1);
});
test("agency failed setup shows a retryable error instead of a false empty state", async () => {
  let reads = 0;
  globalThis.fetch = (async () => ++reads === 1 ? Response.json({ error: "Setup unavailable" }, { status: 503 }) : Response.json(snapshot())) as typeof fetch;
  const ui = render(React.createElement(AgencyMetricsContent));
  assert.equal((await ui.findByRole("alert")).textContent, "Setup unavailable");
  assert.equal(ui.queryByText("No character drafts saved yet."), null);
  fireEvent.click(ui.getByRole("button", { name: "Refresh setup" }));
  await ui.findByText("Private character");
  assert.equal(ui.queryByRole("alert"), null);
});
test("agency uncertain save does not automatically retry and refresh can reconcile success", async () => {
  let posts = 0; let reads = 0;
  globalThis.fetch = (async (_input, init) => {
    if (init?.method === "POST") { posts++; throw new Error("Network response lost; refresh before retrying."); }
    return Response.json(snapshot("Private character", ++reads > 1));
  }) as typeof fetch;
  const ui = render(React.createElement(AgencyMetricsContent));
  fireEvent.change(await ui.findByRole("combobox"), { target: { value: "account" } });
  fireEvent.click(ui.getByRole("button", { name: "Save account binding" }));
  await ui.findByRole("alert");
  fireEvent.click(ui.getByRole("button", { name: "Refresh setup" }));
  await ui.findByText("Connected · reporting not verified");
  assert.equal(posts, 1); assert.equal(ui.queryByRole("alert"), null);
});
test("agency Strict Mode discards the first effect request after cleanup", async () => {
  const first = deferred<Response>(); const second = deferred<Response>(); let reads = 0;
  globalThis.fetch = (async () => ++reads === 1 ? first.promise : second.promise) as typeof fetch;
  const ui = render(React.createElement(React.StrictMode, {}, React.createElement(AgencyMetricsContent)));
  assert.equal(reads, 2);
  await act(async () => { second.resolve(Response.json(snapshot("Current character"))); });
  await act(async () => { first.resolve(Response.json(snapshot("Stale character"))); });
  assert.ok(ui.getByText("Current character")); assert.equal(ui.queryByText("Stale character"), null);
});
test("agency pre-save refresh cannot erase a newer binding failure", async () => {
  const olderRead = deferred<Response>(); let reads = 0;
  globalThis.fetch = (async (_input, init) => {
    if (init?.method === "POST") return Response.json({ error: "Binding was not created. Refresh before retrying." }, { status: 409 });
    return ++reads === 1 ? Response.json(snapshot()) : olderRead.promise;
  }) as typeof fetch;
  const ui = render(React.createElement(AgencyMetricsContent));
  fireEvent.change(await ui.findByRole("combobox"), { target: { value: "account" } });
  fireEvent.click(ui.getByRole("button", { name: "Refresh setup" }));
  fireEvent.click(ui.getByRole("button", { name: "Save account binding" }));
  await ui.findByRole("alert");
  await act(async () => { olderRead.resolve(Response.json(snapshot())); });
  assert.equal(ui.getByRole("alert").textContent, "Binding was not created. Refresh before retrying.");
});
