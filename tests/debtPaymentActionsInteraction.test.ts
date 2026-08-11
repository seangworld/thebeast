import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import {
  DebtManagementActions,
  type DebtManagementActionsProps,
  type DebtPaymentResult,
} from "../src/app/dashboard/money/debts/DebtManagementActions";

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

const debt = {
  id: "rocket-loans",
  name: "Rocket Loans",
  balance: 24_566,
  minimum_payment: 589,
  payment_behavior: "fixed" as const,
  nextDueDate: new Date(2026, 7, 20),
};

function renderActions(onPayment: DebtManagementActionsProps["onPayment"], history: DebtManagementActionsProps["history"] = [], paymentWritesAvailable = true) {
  return render(React.createElement(DebtManagementActions, {
    debt,
    fundingSources: [{ id: "checking", name: "Checking" }],
    history,
    busy: false,
    paymentWritesAvailable,
    onPayment,
    onResetDueDate: async () => undefined,
  }));
}

function success(): DebtPaymentResult {
  return { ok: true, message: "Debt payment recorded. Money calculations and surfaces refreshed." };
}

test("BM-42C Pay Minimum renders confirmation and calls the canonical writer with the stored minimum", async () => {
  const calls: Parameters<DebtManagementActionsProps["onPayment"]>[0][] = [];
  const view = renderActions(async (input) => { calls.push(input); return success(); });

  fireEvent.click(within(view.container).getByRole("button", { name: "Pay Minimum" }));
  const dialog = within(view.container).getByRole("dialog", { name: /minimum payment confirmation/i });
  assert.equal(dialog.getAttribute("data-debt-management-layout"), "compact");
  assert.match(dialog.textContent || "", /stored minimum of/);
  assert.match(dialog.textContent || "", /\$589\.00/);
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm Payment" }));

  await waitFor(() => assert.equal(calls.length, 1));
  assert.equal(calls[0]?.debt.id, "rocket-loans");
  assert.equal(calls[0]?.amount, 589);
  assert.equal(calls[0]?.actionType, "minimum");
  await waitFor(() => assert.match(view.container.textContent || "", /Money calculations and surfaces refreshed/));
});

test("BM-42C Custom Payment accepts one total amount and calls the canonical writer once", async () => {
  const calls: Parameters<DebtManagementActionsProps["onPayment"]>[0][] = [];
  const view = renderActions(async (input) => { calls.push(input); return success(); });

  fireEvent.click(within(view.container).getByRole("button", { name: "Custom Payment" }));
  assert.equal(within(view.container).getByRole("dialog", { name: /custom payment/i }).getAttribute("data-debt-management-layout"), "compact");
  fireEvent.change(within(view.container).getByLabelText("Total amount paid"), { target: { value: "800" } });
  fireEvent.click(within(view.container).getByRole("button", { name: "Confirm Payment" }));

  await waitFor(() => assert.equal(calls.length, 1));
  assert.equal(calls[0]?.amount, 800);
  assert.equal(calls[0]?.actionType, "custom");
});

test("BM-42C preserves a failed payment form and displays a safe actionable error", async () => {
  const operationIds: string[] = [];
  const view = renderActions(async (input) => {
    operationIds.push(input.operationId);
    return { ok: false, message: "Unable to record the debt payment. Your entries were preserved; please retry." };
  });

  fireEvent.click(within(view.container).getByRole("button", { name: "Custom Payment" }));
  const amount = within(view.container).getByLabelText("Total amount paid") as HTMLInputElement;
  fireEvent.change(amount, { target: { value: "800" } });
  fireEvent.click(within(view.container).getByRole("button", { name: "Confirm Payment" }));

  const alert = await within(view.container).findByRole("alert");
  assert.match(alert.textContent || "", /entries were preserved/);
  assert.equal((within(view.container).getByLabelText("Total amount paid") as HTMLInputElement).value, "800");
  fireEvent.click(within(view.container).getByRole("button", { name: "Confirm Payment" }));
  await waitFor(() => assert.equal(operationIds.length, 2));
  assert.equal(operationIds[0], operationIds[1]);
  assert.match(operationIds[0] || "", /^[0-9a-f-]{36}$/i);
});

test("BM-42D presents only canonical member payment actions while preserving historical outside-payment presentation", () => {
  const view = renderActions(async () => success(), [{
    id: "historical-outside",
    debt_id: debt.id,
    amount: 589,
    payment_date: "2026-08-01",
    action_type: "paid_outside_beast",
    is_outside_beast: true,
  }]);

  for (const name of ["Pay Full Balance", "Skip Payment", "Undo Last Payment", "Mark Paid Outside Beast"]) {
    assert.equal(within(view.container).queryByRole("button", { name }), null);
  }
  fireEvent.click(within(view.container).getByRole("button", { name: "History" }));
  assert.match(view.container.textContent || "", /Recorded outside Beast/);
});

test("debt payment actions are disabled with safe copy during maintenance", () => {
  const view = renderActions(async () => success(), [], false);

  assert.equal(
    within(view.container).getByRole("button", { name: "Pay Minimum" }).hasAttribute("disabled"),
    true
  );
  assert.equal(
    within(view.container).getByRole("button", { name: "Custom Payment" }).hasAttribute("disabled"),
    true
  );
  assert.match(view.container.textContent || "", /temporarily unavailable while BeastMoney is being updated/);
});
