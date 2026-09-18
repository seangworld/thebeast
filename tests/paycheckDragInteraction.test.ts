import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import Planner from "../src/app/dashboard/money/cashflow/components/IncomeDatePlanningSection";
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/dashboard/money/debts",
});
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true, writable: true },
});

const { cleanup, fireEvent, render, waitFor, within } = require("@testing-library/react") as typeof import("@testing-library/react");

afterEach(() => cleanup());


function fixture(writer: (id: string, date: string) => Promise<{ok: boolean; message: string}>) {
  const date = new Date(); date.setDate(date.getDate() + 1);
  const tomorrow = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const view = render(React.createElement(Planner, {
    incomeBucketPlans: [{ id: "pay", date: tomorrow, label: "Next deposit", amount: 1000, assignedTotal: 0, availableToAssign: 1000, safeAfterBuffer: 500, debtMinimumsTotal: 0, assignedBills: [], assignedDebts: [] }],
    unassignedBills: [{ id: "rent", name: "Rent", amount: 100 }], unassignedDebts: [], unassignedObligationsTotal: 100,
    planningWindowDays: 30, setPlanningWindowDays: () => {}, recommendedTargetDebt: null, strategyLabel: "Snowball",
    updateBillIncomeDate: writer, updateDebtIncomeDate: async () => { throw new Error("Wrong writer"); },
  }));
  return { ...view, tomorrow };
}

test("dragging previews a move; explicit Save writes once and locks selectors", async () => {
  const calls: string[][] = [];
  let finish!: (result: {ok: boolean; message: string}) => void;
  const view = fixture((id, date) => { calls.push([id,date]); return new Promise(resolve => { finish = resolve; }); });
  const transfer = { effectAllowed: "", dropEffect: "", setData() {} };
  fireEvent.dragStart(within(view.container).getByTitle(/Drag Rent/), {dataTransfer: transfer});
  const bucket = view.container.querySelector(".money-income-bucket")!;
  fireEvent.dragOver(bucket, {dataTransfer: transfer});
  fireEvent.drop(bucket, {dataTransfer: transfer});
  fireEvent.drop(bucket, {dataTransfer: transfer});
  assert.deepEqual(calls, []);
  fireEvent.click(within(view.container).getAllByRole("button", { name: "Save plan" })[0]);
  assert.deepEqual(calls, [["rent",view.tomorrow]]);
  assert.equal((within(view.container).getByLabelText("Paycheck covering Rent") as HTMLSelectElement).disabled, true);
  finish({ok:true,message:"Assignment saved"});
  await waitFor(() => assert.equal((within(view.container).getByLabelText("Paycheck covering Rent") as HTMLSelectElement).disabled, false));
});

test("failed save preserves the draft and gives an actionable message", async () => {
  const view = fixture(async () => { throw new Error("network"); });
  const select = within(view.container).getByLabelText("Paycheck covering Rent") as HTMLSelectElement;
  fireEvent.change(select, {target:{value:view.tomorrow}});
  fireEvent.click(within(view.container).getAllByRole("button", { name: "Save plan" })[0]);
  await within(view.container).findByRole("alert");
  assert.equal(select.disabled, false);
  assert.equal((within(view.container).getByLabelText("Paycheck covering Rent") as HTMLSelectElement).value, view.tomorrow);
  assert.match(view.container.textContent || "", /check your saved assignments/);
});
