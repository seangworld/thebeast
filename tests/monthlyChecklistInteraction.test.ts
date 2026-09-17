import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import Checklist from "../src/app/dashboard/money/cashflow/components/MonthlyPaymentChecklist";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/dashboard/money/cashflow" });
Object.defineProperties(globalThis, {
  self: { value: dom.window, configurable: true },
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true }, HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true, writable: true },
});
const { cleanup, fireEvent, render } = require("@testing-library/react") as typeof import("@testing-library/react");
afterEach(() => cleanup());
const props = {
  today: "2026-09-17", loading: false, dataComplete: true, incomeBuckets: [], extraPayment: null,
  items: [{ id: "paid", name: "Internet", kind: "bill" as const, status: "Paid" as const, dueDate: "2026-09-01", paycheckDate: "", paid: 50, remaining: 0 },
    { id: "partial", name: "Car", kind: "debt" as const, status: "Partial" as const, dueDate: "2026-09-10", paycheckDate: "2026-09-15", paid: 20, remaining: 80 }],
};
test("paid rows can be revealed, partial rows link to real payment management and flag late assignments", () => {
  const view = render(React.createElement(Checklist, props));
  assert.equal(view.queryByText("Internet"), null);
  assert.match(view.getByRole("status").textContent || "", /1 of 2 paid/);
  assert.match(view.getByRole("status").textContent || "", /80.00/);
  assert.equal(view.getByRole("link", { name: "Review Car payment" }).getAttribute("href"), "/dashboard/money/debts");
  assert.ok(view.getByText("Assigned paycheck arrives after the due date."));
  fireEvent.click(view.getByLabelText("Show paid"));
  assert.ok(view.getByText(/Internet/));
});
test("loading and incomplete records never claim completion or show unverified totals", () => {
  const view = render(React.createElement(Checklist, { ...props, dataComplete: false }));
  assert.match(view.getByRole("status").textContent || "", /could not verify/);
  assert.equal(view.queryByText(/1 of 2 paid/), null);
  view.rerender(React.createElement(Checklist, { ...props, loading: true }));
  assert.match(view.getByRole("status").textContent || "", /Loading/);
});
