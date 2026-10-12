import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import { AgencyPlanningStatus } from "../src/app/dashboard/admin/agency/metrics/AgencyPlanningStatus";
const dom = new JSDOM("<html><body></body></html>", { url: "https://thebeast.seangworld.com/dashboard/admin/agency/metrics" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true }, HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Node: { value: dom.window.Node, configurable: true }, MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, writable: true, configurable: true },
});
const { render, cleanup, fireEvent, act } = require("@testing-library/react") as typeof import("@testing-library/react");
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; });
function snapshot() { return { mode: "review_only", publishingAuthorized: false, renderingAuthorized: false, spendingAuthorized: false, workstreams: [], plans: [], truncated: false }; }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
test("agency planning renders internal dates without providing execution actions", async () => {
  const requests: RequestInit[] = [];
  globalThis.fetch = (async (input, init) => {
    assert.equal(input, "/api/admin/agency/plans"); requests.push(init || {});
    return Response.json({ ...snapshot(), plans: [{ id: "plan", agency_workstream_id: "private-stream", agency_channel: "instagram", status: "ready", variant_revision: 2, planned_for: "2026-10-14T10:00:00Z", timezone: "UTC" }] });
  }) as typeof fetch;
  const ui = render(React.createElement(AgencyPlanningStatus));
  await ui.findByText(/Instagram · creative revision 2/);
  assert.ok(ui.getByText(/not scheduled posts/));
  assert.ok(ui.getByText(/Review target: 2026-10-14/));
  assert.deepEqual(ui.getAllByRole("button").map(button => button.textContent), ["Refresh planning"]);
  assert.ok(requests.every(init => !init.method && init.cache === "no-store"));
});
test("agency planning fails closed for execution-enabled or malformed responses", async () => {
  globalThis.fetch = (async () => Response.json({ ...snapshot(), publishingAuthorized: true })) as typeof fetch;
  const ui = render(React.createElement(AgencyPlanningStatus));
  await ui.findByRole("alert");
  assert.equal(ui.queryByText(/0 private workstreams/), null);
  globalThis.fetch = (async () => Response.json({ ...snapshot(), plans: [null] })) as typeof fetch;
  fireEvent.click(ui.getByRole("button"));
  await act(async () => {});
  assert.ok(ui.getByRole("alert"));
});
test("agency planning ignores stale successful reads after a newer failure", async () => {
  const older = deferred<Response>(); let calls = 0;
  globalThis.fetch = (async () => ++calls === 1 ? older.promise : Response.json({}, { status: 503 })) as typeof fetch;
  const ui = render(React.createElement(AgencyPlanningStatus));
  fireEvent.click(ui.getByRole("button"));
  await ui.findByRole("alert");
  await act(async () => { older.resolve(Response.json(snapshot())); });
  assert.ok(ui.getByRole("alert"));
  assert.equal(ui.queryByText(/0 private workstreams/), null);
});
