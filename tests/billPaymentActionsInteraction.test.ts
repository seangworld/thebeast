import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React, { useState } from "react";
import { JSDOM } from "jsdom";
import BillPaymentControls, {
  type BillPaymentResult,
} from "../src/app/dashboard/money/cashflow/components/BillPaymentControls";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/dashboard/money/cashflow",
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

const bill = {
  id: "electric",
  name: "Electric",
  amount: 120,
  paid: 20,
  remaining: 100,
  frequency: "monthly",
  nextDueDateDisplay: "August 15",
  status: "Due Soon",
};

function Harness({
  addBillPayment,
  markBillPaid,
}: {
  addBillPayment: (amount: number, operationId: string) => Promise<BillPaymentResult>;
  markBillPaid: (operationId: string) => Promise<BillPaymentResult>;
}) {
  const [partialPayments, setPartialPayments] = useState<Record<string, string>>({});
  return React.createElement(BillPaymentControls, {
    bill,
    editingBillId: null,
    partialPayments,
    setPartialPayments,
    addBillPayment: async (_bill, amount, id) => addBillPayment(amount, id),
    markBillPaid: async (_bill, id) => markBillPaid(id),
    startEditBill: () => undefined,
    saveBillEdit: async () => undefined,
    cancelEditBill: () => undefined,
    archiveBill: async () => undefined,
    resetBillDueDate: async () => undefined,
  });
}

test("bill partial payment invokes the atomic writer once with a stable operation identity", async () => {
  const calls: Array<{ amount: number; operationId: string }> = [];
  const view = render(React.createElement(Harness, {
    addBillPayment: async (amount, id) => {
      calls.push({ amount, operationId: id });
      return { ok: true, message: "Bill payment recorded and due state refreshed." };
    },
    markBillPaid: async () => ({ ok: true, message: "Paid." }),
  }));

  fireEvent.change(within(view.container).getByPlaceholderText("Partial payment"), {
    target: { value: "45" },
  });
  fireEvent.click(within(view.container).getByRole("button", { name: "Partial Payment" }));

  await waitFor(() => assert.equal(calls.length, 1));
  assert.equal(calls[0]?.amount, 45);
  assert.match(calls[0]?.operationId || "", /^[0-9a-f-]{36}$/i);
  await within(view.container).findByRole("status");
});

test("bill full payment invokes the canonical full-cycle command", async () => {
  const calls: string[] = [];
  const view = render(React.createElement(Harness, {
    addBillPayment: async () => ({ ok: true, message: "Paid." }),
    markBillPaid: async (id) => {
      calls.push(id);
      return { ok: true, message: "Bill payment recorded and due state refreshed." };
    },
  }));

  fireEvent.click(within(view.container).getByRole("button", { name: "Pay" }));
  await waitFor(() => assert.equal(calls.length, 1));
  assert.match(calls[0] || "", /^[0-9a-f-]{36}$/i);
});

test("failed bill payment preserves input and retries the same operation ID", async () => {
  const calls: string[] = [];
  const view = render(React.createElement(Harness, {
    addBillPayment: async (_amount, id) => {
      calls.push(id);
      return {
        ok: false,
        message: "Unable to record the bill payment. Your entry was preserved; please retry.",
      };
    },
    markBillPaid: async () => ({ ok: true, message: "Paid." }),
  }));

  const input = within(view.container).getByPlaceholderText("Partial payment") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "45" } });
  fireEvent.click(within(view.container).getByRole("button", { name: "Partial Payment" }));
  await within(view.container).findByRole("alert");
  fireEvent.click(within(view.container).getByRole("button", { name: "Partial Payment" }));

  await waitFor(() => assert.equal(calls.length, 2));
  assert.equal(calls[0], calls[1]);
  assert.equal(input.value, "45");
});
