import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { JSDOM } from "jsdom";
import { StaffOperationsWorkspace } from "../src/app/dashboard/admin/development/StaffOperationsWorkspace";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true }, HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Node: { value: dom.window.Node, configurable: true }, MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true, writable: true },
});
const { render, cleanup, waitFor, within } = require("@testing-library/react") as typeof import("@testing-library/react");
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; });

function saveFixture(name: string, container: HTMLElement) {
  const directory = process.env.ORCHESTRATOR_FIXTURE_DIR;
  if (!directory) return;
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, `${name}.html`), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic Orchestrator briefing</title><link rel="stylesheet" href="/styles.css"></head><body style="background:#0b1220;padding:16px;color:white"><main style="max-width:1200px;margin:auto"><p>Synthetic fixture — no authenticated owner data</p>${container.innerHTML}</main></body></html>`);
}
const run = { id: "synthetic", status: "duplicate_skipped", started_at: new Date().toISOString(), changes: ["github repository evidence: attention persists; review existing findings before proposing more work."], checked_sources: ["beastfusion_canonical_projection"], unavailable_sources: ["github_repository_evidence"], findings: [{ source: "canonical" }], suppressed_signals: [], confidence: "unknown", impact: "medium", next_step: "Review existing findings; do not execute.", investigation_count: 0, proposal_count: 0, error_category: null };
const payload = { state: "findings", runs: [run], schedule: { enabled: true, cadence: "daily", next_run_at: null, last_run_at: null }, authority: "Non-executable observation only." };

test("briefing exposes unavailable evidence and continuing attention with an accessible controls link", async () => {
  globalThis.fetch = async () => Response.json(payload);
  const view = render(React.createElement(StaffOperationsWorkspace, { compact: true }));
  await waitFor(() => assert.match(view.container.textContent || "", /attention persists/));
  assert.match(within(view.container).getByRole("status").textContent || "", /does not establish health/);
  assert.equal(within(view.container).getByRole("link", { name: "Review findings and staff controls" }).getAttribute("href"), "/dashboard/admin/development");
  assert.equal(view.container.querySelectorAll("button").length, 0);
  saveFixture("attention", view.container);
});

test("initial failure ends loading language and exposes an alert", async () => {
  globalThis.fetch = async () => Response.json({ error: "Evidence service unavailable" }, { status: 503 });
  const view = render(React.createElement(StaffOperationsWorkspace, { compact: true }));
  await within(view.container).findByRole("alert");
  assert.doesNotMatch(view.container.textContent || "", /Loading/);
  assert.match(view.container.textContent || "", /briefing is unavailable/);
  saveFixture("failure", view.container);
});

test("overdue observations remain explicit and full view preserves owner pause control", async () => {
  globalThis.fetch = async () => Response.json({ ...payload, runs: [{ ...run, started_at: "2020-01-01T00:00:00Z" }] });
  const view = render(React.createElement(StaffOperationsWorkspace));
  await waitFor(() => assert.match(view.container.textContent || "", /observation is overdue/));
  assert.ok(within(view.container).getByRole("button", { name: "Pause daily assignment" }));
  saveFixture("overdue", view.container);
});

test("empty history is distinct from a completed clean observation", async () => {
  globalThis.fetch = async () => Response.json({ ...payload, state: "never_run", runs: [] });
  const view = render(React.createElement(StaffOperationsWorkspace, { compact: true }));
  await waitFor(() => assert.match(view.container.textContent || "", /No cycle evidence exists/));
  assert.doesNotMatch(view.container.textContent || "", /Latest cycle completed/);
  saveFixture("empty", view.container);
});

test("running proposal work is not described as a completed cycle", async () => {
  globalThis.fetch = async () => Response.json({ ...payload, state: "running", runs: [{ ...run, status: "running" }] });
  const view = render(React.createElement(StaffOperationsWorkspace, { compact: true }));
  await waitFor(() => assert.match(view.container.textContent || "", /processing are in progress/));
  assert.doesNotMatch(view.container.textContent || "", /Latest cycle completed/);
  saveFixture("running", view.container);
});
