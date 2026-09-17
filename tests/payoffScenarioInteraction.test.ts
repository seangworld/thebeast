import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import Comparison from "../src/app/dashboard/money/debts/PayoffScenarioComparison";
import { runUnifiedStrategyEngine } from "../src/lib/unifiedStrategyEngine";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/dashboard/money/payoff-plan" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true }, HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Node: { value: dom.window.Node, configurable: true }, MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true, writable: true },
});
const { cleanup, fireEvent, render, within } = require("@testing-library/react") as typeof import("@testing-library/react");
afterEach(() => cleanup());

const debts = [
  { id: "small", name: "Small Card", balance: 500, minimum_payment: 25, interest_rate: 12 },
  { id: "large", name: "Large Card", balance: 2500, minimum_payment: 75, interest_rate: 24 },
];
function fixture() {
  const calls: unknown[][] = [];
  const view = render(React.createElement(Comparison, { debts,
    current: runUnifiedStrategyEngine({ debts, strategy: "minimum" }), currentLabel: "minimum", currentExtra: 0, recoveredMinimums: 0,
    onStage: (...args) => { calls.push(args); },
  }));
  return { ...view, calls, ui: within(view.container) };
}

test("scenario edits and custom order never stage or save settings automatically", () => {
  const { ui, calls, container } = fixture();
  fireEvent.change(ui.getByLabelText("Extra monthly payment above minimums"), { target: { value: "150" } });
  fireEvent.change(ui.getByLabelText("One-time cash lump sum"), { target: { value: "600" } });
  fireEvent.click(ui.getByRole("button", { name: "Move Large Card earlier" }));
  fireEvent.click(ui.getByRole("button", { name: "Review Custom order" }));
  assert.equal(calls.length, 0);
  assert.match(container.textContent || "", /Custom order stays a preview until/);
  fireEvent.click(ui.getByRole("button", { name: "Copy monthly plan to settings" }));
  assert.deepEqual(calls, [["custom", 150, ["large", "small"]]]);
  assert.match(container.textContent || "", /Large Card · upfront cash/);
});

test("only explicit copy stages monthly settings; the lump sum is never copied", () => {
  const { ui, calls, container } = fixture();
  fireEvent.change(ui.getByLabelText("Extra monthly payment above minimums"), { target: { value: "150" } });
  fireEvent.change(ui.getByLabelText("One-time cash lump sum"), { target: { value: "600" } });
  fireEvent.click(ui.getByRole("button", { name: "Review Avalanche" }));
  fireEvent.click(ui.getByRole("button", { name: "Copy monthly plan to settings" }));
  assert.deepEqual(calls, [["avalanche", 150]]);
  assert.match(ui.getByRole("status").textContent || "", /not saved/);
  assert.match(container.textContent || "", /lump sum is not copied or recorded/);
  assert.equal(ui.getByRole("link", { name: "Open paycheck planning" }).getAttribute("href"), "/dashboard/money/cashflow#paycheck-strategy");
});

test("invalid scenario amounts hide estimates and copy controls", () => {
  const { ui } = fixture();
  fireEvent.change(ui.getByLabelText("Extra monthly payment above minimums"), { target: { value: "-50" } });
  assert.match(ui.getByRole("alert").textContent || "", /non-negative/);
  assert.equal(ui.queryByRole("button", { name: "Copy monthly plan to settings" }), null);
});
